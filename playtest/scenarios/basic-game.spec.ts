import { test as base, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RandomBot } from '../bots/random'
import { ConservativeBot, AggressiveBot } from '../bots/conservative'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import { generateReport, writeReportMarkdown, getRunDir } from '../utils/report'
import type { BotConfig, GameResult } from '../types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const RUN_DIR = getRunDir(path.resolve(__dirname, '..'))
const ALL_RESULTS: GameResult[] = []

const test = base.extend<{
  runDir: string
}>({
  runDir: RUN_DIR,
})

function createBot(
  type: BotConfig['type'],
  page: any,
  context: any,
  gameId: string,
  runDir: string,
  baseURL: string,
) {
  const config: BotConfig = {
    type,
    maxTurns: 50,
    thinkDelayMs: 200,
    gameTimeoutMs: 8 * 60 * 1000, // 8 min
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
  page: any,
  context: any,
  gameIndex: number,
  runDir: string,
): Promise<GameResult> {
  const gameId = `${type}-${String(gameIndex).padStart(3, '0')}`
  const bot = createBot(type, page, context, gameId, runDir)
  const result = await bot.run()
  return result
}

// === Test scenarios ===

test.describe('Playtest: Random Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Random Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('random', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

test.describe('Playtest: Conservative Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Conservative Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('conservative', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

test.describe('Playtest: Aggressive Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Aggressive Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('aggressive', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

// Generate report after all tests
test.afterAll(async () => {
  const runId = path.basename(RUN_DIR)
  const report = generateReport(runId, ALL_RESULTS)
  const reportPath = path.join(RUN_DIR, 'report.md')
  writeReportMarkdown(report, reportPath)
  console.log(`\n📊 Playtest report generated: ${reportPath}`)
  console.log(`   Games: ${report.totalGames} (${report.completedGames} completed, ${report.failedGames} failed)`)
  console.log(`   Avg turns: ${report.averageTurns}`)
  console.log(`   Issues: ${report.allIssues.length}`)
})
