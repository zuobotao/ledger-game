/**
 * Playtest CLI runner
 *
 * Usage:
 *   npx tsx playtest/run.ts --bot random --games 3
 *   npx tsx playtest/run.ts --bot all --games 3
 *   npx tsx playtest/run.ts --bot conservative --games 1
 *
 * This is a programmatic runner (not Playwright test runner)
 * for more control over game execution and reporting.
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RandomBot } from './bots/random'
import { ConservativeBot, AggressiveBot } from './bots/conservative'
import { PlaytestLogger } from './utils/logger'
import { ScreenshotManager } from './utils/screenshot'
import { generateReport, writeReportMarkdown, getRunDir } from './utils/report'
import type { BotConfig, GameResult } from './types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_BASE_URL = 'http://localhost:5173/ledger-game'

/**
 * Resolve the playtest base URL.
 * Precedence: --url CLI flag > PLAYTEST_BASE_URL env > default.
 * The base URL is the full game home (origin + vite base path, e.g.
 * http://localhost:5173/ledger-game) — bots never assemble it themselves.
 */
export function resolveBaseURL(cliValue: string | undefined): string {
  if (cliValue) return stripTrailingSlash(cliValue)
  if (process.env.PLAYTEST_BASE_URL) return stripTrailingSlash(process.env.PLAYTEST_BASE_URL)
  return DEFAULT_BASE_URL
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

// Parse args
function parseArgs(): { bot: string; games: number; devServer: string; maxTurns: number; timeoutMs: number; seed?: number; headed: boolean } {
  const args = process.argv.slice(2)
  let bot = 'random'
  let games = 3
  let url: string | undefined
  let maxTurns = 50
  let timeoutMs = 8 * 60 * 1000
  let seed: number | undefined
  let headed = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bot' && args[i + 1]) {
      bot = args[++i]
    } else if (args[i] === '--games' && args[i + 1]) {
      games = parseInt(args[++i], 10)
    } else if (args[i] === '--url' && args[i + 1]) {
      url = args[++i]
    } else if (args[i] === '--max-turns' && args[i + 1]) {
      maxTurns = parseInt(args[++i], 10)
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeoutMs = parseInt(args[++i], 10)
    } else if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[++i], 10)
    } else if (args[i] === '--headed') {
      headed = true
    }
  }

  return { bot, games, devServer: resolveBaseURL(url), maxTurns, timeoutMs, seed, headed }
}

async function createBot(
  type: BotConfig['type'],
  page: Page,
  context: BrowserContext,
  gameId: string,
  runDir: string,
  baseURL: string,
  overrides: Partial<BotConfig> = {},
) {
  const config: BotConfig = {
    type,
    maxTurns: 50,
    thinkDelayMs: 200,
    gameTimeoutMs: 8 * 60 * 1000,
    ...overrides,
  }

  const logger = new PlaytestLogger(runDir, gameId)
  const screenshots = new ScreenshotManager(logger)

  switch (type) {
    case 'random':
      return new RandomBot(page, context, config, logger, screenshots, gameId, baseURL)
    case 'conservative':
      return new ConservativeBot(page, context, config, logger, screenshots, gameId, baseURL)
    case 'aggressive':
      return new AggressiveBot(page, context, config, logger, screenshots, gameId, baseURL)
  }
}

async function runGame(
  type: BotConfig['type'],
  browser: Browser,
  gameIndex: number,
  runDir: string,
  baseURL: string,
  overrides: Partial<BotConfig> = {},
): Promise<GameResult> {
  const gameId = `${type}-${String(gameIndex).padStart(3, '0')}`
  const videoDir = path.join(runDir, 'videos')
  fs.mkdirSync(videoDir, { recursive: true })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 800 },
    },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  console.log(`  ▶ Game ${gameId} starting...`)

  const bot = await createBot(type, page, context, gameId, runDir, baseURL, overrides)
  const result = await bot.run()

  // 先关闭 context：结束录制（ffmpeg 收到 EOF、落盘默认 webm），避免在仍在录制时
  // 调用 video.saveAs() 导致死锁（page 未关闭时 saveAs 会无限等待 recorder 结束）。
  await context.close()

  // 关闭后把 Playwright 自动落盘到 videoDir 的默认 webm 重命名为 {gameId}.webm
  try {
    const written = fs
      .readdirSync(videoDir)
      .filter((f) => f.endsWith('.webm'))
      .sort((a, b) => fs.statSync(path.join(videoDir, b)).mtimeMs - fs.statSync(path.join(videoDir, a)).mtimeMs)
    if (written.length > 0) {
      const videoPath = path.join(videoDir, `${gameId}.webm`)
      fs.renameSync(path.join(videoDir, written[0]), videoPath)
      result.videoPath = videoPath
    }
  } catch (e: any) {
    console.error(`    video finalize failed: ${e?.message ?? e}`)
  }

  const statusEmoji = result.status === 'failed' ? '❌' : result.status === 'timeout' ? '⏱️' : '✅'
  console.log(`    ${statusEmoji} ${result.status} — ${result.totalTurns} turns, ${(result.totalTimeMs / 1000).toFixed(1)}s, ${result.issues.length} issues`)

  return result
}

async function main() {
  const { bot, games, devServer, maxTurns, timeoutMs, seed, headed } = parseArgs()
  const runDir = getRunDir(path.resolve(__dirname, '.'))
  const runId = path.basename(runDir)

  const overrides: Partial<BotConfig> = { maxTurns, gameTimeoutMs: timeoutMs }
  if (seed !== undefined) overrides.seed = seed

  console.log(`\n🎮 Ledger Playtest Runner`)
  console.log(`   Run ID: ${runId}`)
  console.log(`   Bot: ${bot}`)
  console.log(`   Games per bot: ${games}`)
  console.log(`   URL: ${devServer}`)
  console.log(`   Max turns: ${maxTurns} | Timeout: ${(timeoutMs / 1000).toFixed(0)}s${seed !== undefined ? ` | Seed: ${seed}` : ''}`)
  console.log(`   Output: ${runDir}`)
  console.log('')

  const browser = await chromium.launch({
    headless: !headed,
  })

  const allResults: GameResult[] = []

  const botTypes: BotConfig['type'][] = bot === 'all'
    ? ['random', 'conservative', 'aggressive']
    : [bot as BotConfig['type']]

  for (const botType of botTypes) {
    console.log(`\n🤖 Running ${botType} bot (${games} games)`)
    for (let i = 1; i <= games; i++) {
      try {
        const result = await runGame(botType, browser, i, runDir, devServer, overrides)
        allResults.push(result)
      } catch (err: any) {
        console.error(`    ❌ Game ${botType}-${i} crashed: ${err.message}`)
        allResults.push({
          gameId: `${botType}-${String(i).padStart(3, '0')}`,
          botType,
          status: 'failed',
          totalTurns: 0,
          totalTimeMs: 0,
          totalActions: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          actions: [],
          issues: [{
            turn: 0,
            type: 'js-exception',
            message: `Game crash: ${err.message}`,
            timestamp: new Date().toISOString(),
          }],
          events: [],
          errorMessage: err.message,
        })
      }
    }
  }

  await browser.close()

  // Generate report
  const report = generateReport(runId, allResults)
  const reportPath = path.join(runDir, 'report.md')
  writeReportMarkdown(report, reportPath)

  console.log(`\n\n📊 Playtest Complete!`)
  console.log(`   Report: ${reportPath}`)
  console.log(`   Total games: ${report.totalGames}`)
  console.log(`   Completed: ${report.completedGames}`)
  console.log(`   Failed: ${report.failedGames}`)
  console.log(`   Avg turns: ${report.averageTurns}`)
  console.log(`   Total issues: ${report.allIssues.length}`)
  console.log('')

  // Exit with non-zero if any games failed
  if (report.failedGames > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Playtest runner failed:', err)
  process.exit(1)
})
