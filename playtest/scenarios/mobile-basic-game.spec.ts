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

// 手机视口：390 × 844（iPhone 类）
const MOBILE_VIEWPORT = { width: 390, height: 844 }

const RUN_DIR = getRunDir(path.resolve(__dirname, '..'), 'mobile')
const ALL_RESULTS: GameResult[] = []

const test = base.extend<{
  runDir: string
}>({
  runDir: RUN_DIR,
})

// 整个 spec 默认运行在手机视口下
test.use({ viewport: MOBILE_VIEWPORT })

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
  const gameId = `${type}-mobile-${String(gameIndex).padStart(3, '0')}`
  const bot = createBot(type, page, context, gameId, runDir)
  const result = await bot.run()
  return result
}

/**
 * 手机端首屏布局断言：
 * 进入 Capital Game 后，
 * - 不存在水平溢出（document scrollWidth <= clientWidth）
 * - 棋盘完整可见
 * - 掷骰子 / 结束回合按钮可见且未遮挡
 * 该测试不跑完整对局，只验证移动端核心可玩性。
 */
async function assertMobileLayout(page: any) {
  // 进入游戏（单一人类玩家）
  const startBtn = page.getByTestId('btn-start')
    .or(page.locator('[data-dom-id="btn-start"]'))
    .or(page.getByRole('button', { name: '开始游戏' }))
  await startBtn.click()
  await page.waitForFunction(() => window.location.hash.includes('setup'))
  await page.locator('#player-count').selectOption('1')
  const beginBtn = page.locator('[data-dom-id="btn-begin"]').or(page.getByRole('button', { name: '开始游戏' }))
  await beginBtn.click()
  await page.waitForFunction(() => window.location.hash.includes('rat-race'))
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // 1. 无水平溢出
  const overflow = await page.evaluate(() => {
    const de = document.documentElement
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth }
  })
  expect(overflow.scrollWidth, `mobile-horizontal-overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`)
    .toBeLessThanOrEqual(overflow.clientWidth)

  // 2. 棋盘完整可见
  const board = page.locator('.rat-race-board').first()
  await expect(board).toBeVisible()
  const boardBox = await board.boundingBox()
  expect(boardBox && boardBox.width, 'board width must fit viewport').toBeLessThanOrEqual(overflow.clientWidth)
  expect(boardBox && boardBox.y >= 0, 'board visible in viewport').toBeTruthy()

  // 3. 核心操作按钮在视口内可见（滚回顶部后）
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  const rollBtn = page.getByTestId('roll-dice').first()
  const endBtn = page.getByTestId('end-turn').first()
  const firstAction = await rollBtn.isVisible().catch(() => false) ? rollBtn : endBtn
  // 至少一个核心操作按钮应可见；若当前状态在等待掷骰，roll-dice 应存在
  const anyActionVisible = (await rollBtn.isVisible().catch(() => false)) || (await endBtn.isVisible().catch(() => false))
  expect(anyActionVisible, 'at least one core action (roll/end turn) visible').toBeTruthy()
  if (firstAction) {
    const box = await firstAction.boundingBox()
    expect(box && box.y + box.height <= 844, 'action button not off-screen').toBeTruthy()
  }

  await page.screenshot({ path: path.join(RUN_DIR, 'mobile-layout-check.png') })
}

test.describe('Mobile Playtest: Layout (390x844)', () => {
  test('no horizontal overflow and core actions visible', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`)
    await page.waitForLoadState('networkidle')
    await assertMobileLayout(page)
  })
})

test.describe('Mobile Playtest: Random Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Random Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('random', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

test.describe('Mobile Playtest: Conservative Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Conservative Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('conservative', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

test.describe('Mobile Playtest: Aggressive Bot', () => {
  for (let i = 1; i <= 3; i++) {
    test(`Aggressive Bot Game #${i}`, async ({ page, context, runDir }) => {
      const result = await runGame('aggressive', page, context, i, runDir)
      ALL_RESULTS.push(result)
      expect(result.status).not.toBe('failed')
    })
  }
})

// 生成报告
test.afterAll(async () => {
  const runId = path.basename(RUN_DIR)
  const report = generateReport(runId, ALL_RESULTS)
  const reportPath = path.join(RUN_DIR, 'report.md')
  writeReportMarkdown(report, reportPath)
  console.log(`\n📱 Mobile Playtest report generated: ${reportPath}`)
  console.log(`   Games: ${report.totalGames} (${report.completedGames} completed, ${report.failedGames} failed)`)
  console.log(`   Avg turns: ${report.averageTurns}`)
  console.log(`   Issues: ${report.allIssues.length}`)
})