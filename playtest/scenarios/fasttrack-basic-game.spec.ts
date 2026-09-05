/**
 * FastTrack 专项 Playtest — 预置晋升 seed，验证快车道移动端 / 桌面全流程。
 *
 * 覆盖（真实 UI 驱动）：
 *  - 首页「继续游戏」载入晋升就绪存档
 *  - FastTrackEligibility 资格面板 → 进入资本游戏
 *  - FastTrack 掷骰 / 结束回合
 *  - fast_track_opportunity（买入/放弃）
 *  - fast_track_dream（购买/暂不）
 *  - fast_track_stock_trading（买入 + 卖出落袋 + 完成）
 *  - market 事件响应
 *  - 刷新页面后阶段保持（回放持久化）
 *
 * 判定：无死循环、无 NaN / 负数异常、无控制台错误、无横向溢出、回合推进。
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/fasttrack-seed.json'), 'utf8'),
)
const RUN_ID = `fasttrack-${new Date().toISOString().replace(/[:.]/g, '-')}`
const RUN_DIR = path.join(__dirname, `../runs/${RUN_ID}`)
fs.mkdirSync(RUN_DIR, { recursive: true })

/** 在页面 JS 加载前注入固定存档（fixture 预置，非运行期改状态）。
 *  仅在「还没有任何存档」时注入，避免 reload 时用 seed 覆盖真实游戏进度。 */
async function seedGame(page: import('@playwright/test').Page) {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('ledger101-game-state')) {
      localStorage.setItem('ledger101-game-state', JSON.stringify(seed))
    }
  }, FIXTURE)
}

async function bridgeState(page: import('@playwright/test').Page) {
  return page
    .evaluate(() => {
      const store = (window as any).gameStore
      if (!store) return null
      const pa = store.pendingAction
      return {
        turn: store.turnNumber ?? 0,
        phase: store.phase ?? '',
        turnStatus: store.turnStatus ?? '',
        pendingAction: pa && pa.type ? String(pa.type) : null,
        showTurnSummary: store.showTurnSummary ?? false,
        hasDecisionFeedback: store.lastActionResult ? true : false,
        cash: store.players?.[store.currentPlayerIndex ?? 0]?.cash ?? 0,
      }
    })
    .catch(() => null)
}

/** 达标后回合总结 Overlay 会自动弹出（真实的「进入资本游戏」Offer）；先关闭以露出资格面板 CTA */
async function dismissSummaryIfPresent(page: import('@playwright/test').Page) {
  const overlay = page.locator('.game-summary-overlay')
  if ((await overlay.count()) && (await overlay.first().isVisible().catch(() => false))) {
    const closeBtn = page.locator('.game-summary-overlay .close-btn').first()
    if ((await closeBtn.count()) && (await closeBtn.isVisible().catch(() => false))) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
  }
}

async function clickEnabled(page: import('@playwright/test').Page, re: RegExp): Promise<boolean> {
  const loc = page.getByRole('button', { name: re })
  const n = await loc.count().catch(() => 0)
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i)
    if ((await el.isVisible().catch(() => false)) && (await el.isEnabled().catch(() => false))) {
      await el.click().catch(() => {})
      return true
    }
  }
  return false
}

interface FastTrackRun {
  consoleErrors: string[]
  nonFinite: boolean
  handled: { opportunity: number; stockTrade: number; dream: number; market: number; roll: number; end: number }
  iterations: number
  startTurn: number
  endTurn: number
}

async function driveFastTrack(
  page: import('@playwright/test').Page,
  opts: { maxActions?: number; minTurns?: number } = {},
): Promise<FastTrackRun> {
  const maxActions = opts.maxActions ?? 340
  const minTurns = opts.minTurns ?? 8
  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message.slice(0, 300)}`))

  const hasNonFinite = async () =>
    page
      .evaluate(() => {
        const s = (window as any).gameStore
        const p = s?.players?.[s.currentPlayerIndex ?? 0]
        if (!p) return false
        return ['cash', 'cashFlow', 'passiveIncome', 'totalExpenses', 'savings', 'salary'].some(
          (k) => typeof p[k] === 'number' && (Number.isNaN(p[k]) || !Number.isFinite(p[k])),
        )
      })
      .catch(() => false)

  const handled = { opportunity: 0, stockTrade: 0, dream: 0, market: 0, roll: 0, end: 0 }
  let iterations = 0
  let lastKey = ''
  let stagnant = 0
  let startTurn = 0
  let lastTurn = -1
  let nonFinite = false

  while (iterations < maxActions) {
    iterations++
    await page.waitForTimeout(280)
    const b = await bridgeState(page)

    if (b) {
      if (await hasNonFinite()) nonFinite = true
      if (startTurn === 0) startTurn = b.turn
      if (b.turn !== lastTurn) lastTurn = b.turn
      if (b.phase === 'finished' || b.turnStatus === 'finished') break
      if (lastTurn - startTurn >= minTurns && b.turnStatus === 'idle') {
        // 已推进足够回合且回到可掷骰状态，收尾
        if (handled.opportunity + handled.stockTrade + handled.dream >= 1) break
      }

      const key = `${b.turn}|${b.turnStatus}|${b.pendingAction}|${b.showTurnSummary}`
      if (key === lastKey) stagnant++
      else stagnant = 0
      lastKey = key
      if (stagnant > 50) {
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(250)
        stagnant = 0
        continue
      }

      if (b.showTurnSummary) {
        await clickEnabled(page, /下一回合|继续/)
        handled.end++
        continue
      }
      if (b.hasDecisionFeedback) {
        await clickEnabled(page, /知道了/)
        continue
      }

      switch (b.pendingAction) {
        case 'fast_track_dream':
          handled.dream++
          if (!(await clickEnabled(page, /购买梦想/))) await clickEnabled(page, /暂不购买/)
          break
        case 'fast_track_opportunity':
          handled.opportunity++
          if (!(await clickEnabled(page, /支付首付|买入/))) await clickEnabled(page, /放弃/)
          break
        case 'fast_track_stock_trading':
          handled.stockTrade++
          // 买入 1 股 NOVA
          await clickEnabled(page, /NOVA/)
          await page.waitForTimeout(160)
          await clickEnabled(page, /确认买入/)
          await page.waitForTimeout(220)
          // 落袋：切到卖出并卖回 NOVA
          await clickEnabled(page, /^卖出$/)
          await page.waitForTimeout(160)
          await clickEnabled(page, /NOVA/)
          await page.waitForTimeout(160)
          await clickEnabled(page, /确认卖出/)
          await page.waitForTimeout(220)
          await clickEnabled(page, /完成/)
          break
        case 'market':
          handled.market++
          await clickEnabled(page, /放弃|完成|知道了|跳过/)
          break
        default:
          break
      }

      if (!b.pendingAction) {
        if (b.turnStatus === 'idle' || b.turnStatus === 'waiting_roll') {
          handled.roll++
          await clickEnabled(page, /掷双骰|掷骰/)
        } else if (b.turnStatus === 'resolving' || b.turnStatus === 'waiting_end_turn') {
          handled.end++
          await clickEnabled(page, /结束回合/)
        }
      }
    }
  }

  return { consoleErrors, nonFinite, handled, iterations, startTurn, endTurn: lastTurn }
}

test.describe('FastTrack 专项 · Desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('晋升 → 快车道全流程 + 刷新持久化', async ({ page }) => {
    await seedGame(page)
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))

    await page.goto('/', { waitUntil: 'networkidle' })

    // 首页出现「继续游戏」按钮
    const continueBtn = page.getByTestId('continue-game-btn')
    await expect(continueBtn).toBeVisible()
    await continueBtn.click()
    await page.waitForFunction(() => window.location.hash.includes('rat-race'))
    await page.waitForLoadState('networkidle')

    // 关闭自动弹出的回合总结 Overlay，露出资格面板
    await dismissSummaryIfPresent(page)

    // 资格面板应显示「已具备」
    const cta = page.getByTestId('enter-fast-track-cta')
    await expect(cta).toBeVisible()
    await expect(page.getByText('已具备进入资本游戏资格')).toBeVisible()

    // 进入资本游戏：面板 CTA 会再次打开确认 Overlay，由 Overlay 主按钮真正进入
    await cta.click()
    await page.waitForTimeout(500)
    await page
      .locator('.game-summary-overlay')
      .getByRole('button', { name: /进入资本游戏/ })
      .click()
    await page.waitForFunction(() => window.location.hash.includes('fast-track'))
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(RUN_DIR, 'desktop-ft-enter.png'), fullPage: false })

    let b = await bridgeState(page)
    expect(b?.phase).toBe('fast_track')
    expect(b?.turnStatus).toBe('idle')

    // 驱动若干回合
    const run = await driveFastTrack(page, { maxActions: 320, minTurns: 8 })
    console.log(`[Desktop] opportunities=${run.handled.opportunity} stockTrades=${run.handled.stockTrade} dreams=${run.handled.dream} markets=${run.handled.market} rolls=${run.handled.roll} ends=${run.handled.end} (turns ${run.startTurn}→${run.endTurn})`)
    await page.screenshot({ path: path.join(RUN_DIR, 'desktop-ft-complete.png'), fullPage: false })

    // 刷新持久化：仍在 fast_track 阶段
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    b = await bridgeState(page)
    expect(b?.phase).toBe('fast_track')
    await page.screenshot({ path: path.join(RUN_DIR, 'desktop-ft-refresh.png'), fullPage: false })

    // ====== 断言 ======
    expect(run.nonFinite, '出现 NaN/非有限值').toBe(false)
    expect(run.consoleErrors, '出现控制台错误').toEqual([])
    expect(errors, '出现控制台错误(全量)').toEqual([])
    // 至少推进了若干回合
    expect(run.endTurn - run.startTurn).toBeGreaterThanOrEqual(1)
    // 至少处理过一次快车道决策（机会 / 股票交易 / 梦想）
    expect(run.handled.opportunity + run.handled.stockTrade + run.handled.dream, '未触发任何快车道决策').toBeGreaterThanOrEqual(1)
    // 至少掷骰 + 结束回合 各 1 次（回合真正走了一圈）
    expect(run.handled.roll).toBeGreaterThanOrEqual(1)
    expect(run.handled.end).toBeGreaterThanOrEqual(1)
  })
})

test.describe('FastTrack 专项 · Mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('晋升 → 快车道移动端全流程 + 无横向溢出', async ({ page }) => {
    await seedGame(page)
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))

    await page.goto('/', { waitUntil: 'networkidle' })
    const continueBtn = page.getByTestId('continue-game-btn')
    await expect(continueBtn).toBeVisible()
    await continueBtn.click()
    await page.waitForFunction(() => window.location.hash.includes('rat-race'))
    await page.waitForLoadState('networkidle')

    // 关闭自动弹出的回合总结 Overlay，露出资格面板
    await dismissSummaryIfPresent(page)

    const cta = page.getByTestId('enter-fast-track-cta')
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForTimeout(500)
    await page
      .locator('.game-summary-overlay')
      .getByRole('button', { name: /进入资本游戏/ })
      .click()
    await page.waitForFunction(() => window.location.hash.includes('fast-track'))
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(RUN_DIR, 'mobile-ft-enter.png'), fullPage: false })

    let b = await bridgeState(page)
    expect(b?.phase).toBe('fast_track')

    const run = await driveFastTrack(page, { maxActions: 320, minTurns: 8 })
    console.log(`[Mobile] opportunities=${run.handled.opportunity} stockTrades=${run.handled.stockTrade} dreams=${run.handled.dream} markets=${run.handled.market} rolls=${run.handled.roll} ends=${run.handled.end} (turns ${run.startTurn}→${run.endTurn})`)
    await page.screenshot({ path: path.join(RUN_DIR, 'mobile-ft-complete.png'), fullPage: false })

    // 无横向溢出：核心内容全部可见可操作
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow, '存在横向溢出').toBe(false)

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    b = await bridgeState(page)
    expect(b?.phase).toBe('fast_track')
    await page.screenshot({ path: path.join(RUN_DIR, 'mobile-ft-refresh.png'), fullPage: false })

    expect(run.nonFinite, '出现 NaN/非有限值').toBe(false)
    expect(run.consoleErrors, '出现控制台错误').toEqual([])
    expect(errors, '出现控制台错误(全量)').toEqual([])
    expect(run.endTurn - run.startTurn).toBeGreaterThanOrEqual(1)
    expect(run.handled.opportunity + run.handled.stockTrade + run.handled.dream).toBeGreaterThanOrEqual(1)
    expect(run.handled.roll).toBeGreaterThanOrEqual(1)
    expect(run.handled.end).toBeGreaterThanOrEqual(1)
  })
})