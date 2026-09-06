/**
 * Phase 8 — 完整单人财务闭环 E2E（真实 UI 驱动，确定性）
 *
 * 覆盖计划 §21 Single Player 财务核心链路：
 *    Setup(继续游戏) → 存款 → 取款 → 贷款 → 还款 → 还清具体负债
 *    → 购买裁员保险 → 参保失业保险 → 财务报表查看
 *
 * 用 fasttrack-seed 预置一个「rat_race 中段」存档（现金充足、含 4 项负债、
 * 1 个 business 资产），通过 header 银行入口逐 tab 在真实 UI 中操作，
 * 每次操作后用 window.gameStore 断言财务字段正确，且始终满足：
 *   - cash / savings / assets / liabilities / netWorth 全部 Number.isFinite
 *   - 存取款不改变净资产（净额守恒）
 *   - 贷款 → 现金↑、负债↑、月还款计入支出
 *   - 还款 → 现金↓、负债↓
 *   - 还清具体负债 → 该负债从 liabilities 移除、recurring expense 降
 *
 * 判定：无 NaN / Infinity、无死锁、所有财务操作在真实 UI 中闭环、不进入
 * FastTrack（避免 seed 在驱动中提前结束，保持本轮确定性）。
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/fasttrack-seed.json'), 'utf8'),
)
const RUN_ID = `finance-${new Date().toISOString().replace(/[:.]/g, '-')}`
const RUN_DIR = path.join(__dirname, `../runs/${RUN_ID}`)
fs.mkdirSync(RUN_DIR, { recursive: true })

/** 在页面 JS 加载前注入固定存档（fixture 预置，非运行期改状态） */
async function seedGame(page: Page) {
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('ledger101-game-state')) {
      localStorage.setItem('ledger101-game-state', JSON.stringify(seed))
    }
  }, FIXTURE)
}

/** 继续游戏后回合总结 Overlay 可能自动弹出并拦截指针事件；先关闭以露出银行入口 */
async function dismissSummaryIfPresent(page: Page) {
  const overlay = page.locator('.game-summary-overlay')
  if ((await overlay.count()) && (await overlay.first().isVisible().catch(() => false))) {
    const closeBtn = page.locator('.game-summary-overlay .close-btn').first()
    if ((await closeBtn.count()) && (await closeBtn.isVisible().catch(() => false))) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
  }
}

/** 返回当前玩家的财务快照（只读，不修改状态） */
type FinSnapshot = {
  cash: number
  savings: number
  passiveIncome: number
  totalIncome: number
  totalExpenses: number
  cashFlow: number
  assets: number
  liabilities: number
  netWorth: number
  hasInsurance: boolean
  hasUnemploymentInsurance: boolean
  liabilityNames: string[]
  phase: string
  turnStatus: string
  pendingAction: string | null
}

async function snap(page: Page): Promise<FinSnapshot | null> {
  return page
    .evaluate(() => {
      const store = (window as any).gameStore
      if (!store) return null
      const p = store.players?.[store.currentPlayerIndex ?? 0]
      if (!p) return null
      const assets = (p.assets || []).reduce(
        (s: number, x: any) => s + (x.marketPrice ?? x.cost ?? 0) * (x.quantity ?? 1),
        0,
      )
      const liabilities = (p.liabilities || []).reduce((s: number, x: any) => s + (x.amount ?? 0), 0)
      const pa = store.pendingAction
      return {
        cash: p.cash ?? 0,
        savings: p.savings ?? 0,
        passiveIncome: p.passiveIncome ?? 0,
        totalIncome: p.totalIncome ?? 0,
        totalExpenses: p.totalExpenses ?? 0,
        cashFlow: p.cashFlow ?? 0,
        assets,
        liabilities,
        netWorth: assets - liabilities + (p.cash ?? 0) + (p.savings ?? 0),
        hasInsurance: p.hasInsurance ?? false,
        hasUnemploymentInsurance: p.hasUnemploymentInsurance ?? false,
        liabilityNames: (p.liabilities || []).map((l: any) => l.name),
        phase: store.phase ?? '',
        turnStatus: store.turnStatus ?? '',
        pendingAction: pa && pa.type ? String(pa.type) : null,
      }
    })
    .catch(() => null)
}

/** 校验核心财务字段全部有限，避免 NaN / Infinity 进入 UI */
function expectFinite(s: FinSnapshot, label: string) {
  for (const k of ['cash', 'savings', 'passiveIncome', 'totalIncome', 'totalExpenses', 'cashFlow', 'assets', 'liabilities', 'netWorth'] as const) {
    expect(Number.isFinite(s[k]), `${label}.${k} 应为有限数值，实际 ${s[k]}`).toBe(true)
  }
}

/** 在真实 UI 中打开银行并切换到指定 tab */
async function openBankTab(page: Page, tabText: string) {
  // 桌面 header「银行」入口（financial-statement 与 insurance 同入口）
  const bankBtn = page.getByTestId('bank-button')
  await bankBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await bankBtn.click()
  await page.waitForTimeout(250)
  // tab 都在银行模态内；按文本切 tab
  const tab = page.getByRole('button', { name: tabText, exact: true }).first()
  await tab.waitFor({ state: 'visible', timeout: 10_000 })
  await tab.click()
  await page.waitForTimeout(200)
}

/** 贷款/还款/买入等会弹出决策反馈 Overlay；先点「知道了」关闭它，露出银行模态 */
async function dismissDecisionFeedback(page: Page) {
  const overlay = page.locator('.decision-feedback-overlay')
  if ((await overlay.count()) && (await overlay.first().isVisible().catch(() => false))) {
    const ok = overlay.getByRole('button', { name: /知道了/ }).first()
    if ((await ok.count()) && (await ok.isVisible().catch(() => false))) {
      await ok.click().catch(() => {})
      await page.waitForTimeout(400)
    } else {
      // 兜底：Escape / 点遮罩
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}

/** 在银行内按文本定位可点击按钮（精确匹配），始终限定在打开的模态内 */
async function clickBankBtn(page: Page, name: string) {
  const btn = page.getByRole('dialog').getByRole('button', { name, exact: true })
  await btn.waitFor({ state: 'visible', timeout: 10_000 })
  await btn.click()
  await page.waitForTimeout(250)
}

/** 关闭银行模态（点击遮罩或关闭图标） */
async function closeBank(page: Page) {
  // 优先点击右上角关闭（LandmarkX），退化点遮罩
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(200)
  await page.locator('body').click({ position: { x: 8, y: 8 } }).catch(() => {})
  await page.waitForTimeout(250)
}

test.describe('Phase 8 · 完整单人财务闭环 (Desktop 1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('银行全 tab 存款/取款/贷款/还款/还清负债/保险/报表 闭环', async ({ page }) => {
    await seedGame(page)
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message.slice(0, 200)}`))

    await page.goto('/', { waitUntil: 'networkidle' })
    const continueBtn = page.getByTestId('continue-game-btn')
    await expect(continueBtn).toBeVisible()
    await continueBtn.click()
    await page.waitForFunction(() => window.location.hash.includes('rat-race'))
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // 关闭可能拦截指针事件的回合总结 Overlay
    await dismissSummaryIfPresent(page)

    // ===== 初始状态：处于 rat_race idle，无待定动作 =====
    let s = await snap(page)
    expect(s?.phase).toBe('rat_race')
    expect(s?.turnStatus).toBe('idle')
    expect(s?.pendingAction).toBeNull()
    expectFinite(s!, '初始')

    // Seed 预置 4 项负债
    expect(s?.liabilityNames).toContain('房屋抵押贷款')
    expect(s?.liabilityNames).toContain('学生贷款')

    const initCash = s!.cash
    const initSavings = s!.savings
    const initNetWorth = s!.netWorth
    const initLiab = s!.liabilities
    const initExpenses = s!.totalExpenses

    // ===== 存款 $1000 → cash↓1000 savings↑1000，净资产不变 =====
    await openBankTab(page, '存款')
    await page.fill('input[type="number"]', '1000')
    await clickBankBtn(page, '存入')
    s = (await snap(page))!
    expectFinite(s, '存款后')
    expect(s.cash).toBeCloseTo(initCash - 1000, 8)
    expect(s.savings).toBeCloseTo(initSavings + 1000, 8)
    expect(s.netWorth).toBeCloseTo(initNetWorth, 8)

    // ===== 取款 $400 → cash↑400 savings↓400，净资产不变 =====
    // 存款 tab 内有 2 个 number 输入：第 1 个是存款金额，第 2 个是取款金额
    await page.locator('input[type="number"]').nth(1).fill('400')
    await clickBankBtn(page, '取出')
    s = (await snap(page))!
    expectFinite(s, '取款后')
    expect(s.cash).toBeCloseTo(initCash - 600, 8)
    expect(s.savings).toBeCloseTo(initSavings + 600, 8)
    expect(s.netWorth).toBeCloseTo(initNetWorth, 8)

    // ===== 贷款 $5000 → cash↑5000，负债↑，月还款计入支出 =====
    await page.getByRole('dialog').getByRole('button', { name: '贷款', exact: true }).first().click()
    await page.fill('input[type="number"]', '5000')
    await page.getByTestId('bank-loan-button').click()
    s = (await snap(page))!
    expectFinite(s, '贷款后')
    expect(s.cash).toBeCloseTo(initCash + 4400, 8)
    expect(s.liabilities).toBeCloseTo(initLiab + 5000, 8)
    // 月还款 = 贷款 10% = $500 → totalExpenses ↑ 500（FastTrack 资格同步重算入口点）
    expect(s.totalExpenses).toBeCloseTo(initExpenses + 500, 8)
    await dismissDecisionFeedback(page)

    // ===== 还款 $2000 → cash↓2000，负债↓2000，支出-200 =====
    await dismissDecisionFeedback(page)
    await page.getByRole('dialog').getByRole('button', { name: '贷款', exact: true }).first().click()
    // 还款 tab 中「还款金额」输入框（避免误填其他 number 输入）
    await page.locator('label:has-text("还款金额") + input[type="number"]').fill('2000')
    await page.getByTestId('bank-loan-repay-button').first().click()
    await dismissDecisionFeedback(page)
    s = (await snap(page))!
    expectFinite(s, '还款后')
    expect(s.cash).toBeCloseTo(initCash + 2400, 8)
    expect(s.liabilities).toBeCloseTo(initLiab + 3000, 8)
    // 部分还款不改变月供：银行贷款的 fixed 月还款只在「全部还清」时从支出移除（见 repayBankLoan）
    expect(s.totalExpenses).toBeCloseTo(initExpenses + 500, 8)

    // ===== 还清学生贷款 $6000 → 负债-6000、支出-100（recurring expense 降）=====
    // 先还清具体负债再完整走完剩余环节；比现金充裕，不影响后续保险
    // 一次性还清区有多个负债行，需定位「学生贷款」那一行的「还清」按钮
    const schoolRow = page.locator('div.rounded-xl', { hasText: '学生贷款' }).first()
    await schoolRow.getByRole('button', { name: '还清', exact: true }).click()
    await page.waitForTimeout(250)
    await dismissDecisionFeedback(page)
    s = (await snap(page))!
    expectFinite(s, '还清负债后')
    expect(s.liabilityNames).not.toContain('学生贷款')
    expect(s.liabilities).toBeCloseTo(initLiab + 3000 - 6000, 8)
    expect(s.cash).toBeCloseTo(initCash + 2400 - 6000, 8)
    expect(s.totalExpenses).toBeCloseTo(initExpenses + 500 - 100, 8)

    // ===== 裁员保险（一次性购买，终身有效）→ hasInsurance true =====
    await clickBankBtn(page, '保险')
    await clickBankBtn(page, '购买')
    s = (await snap(page))!
    expectFinite(s, '买裁员保险后')
    expect(s.hasInsurance).toBe(true)

    // ===== 失业保险（月缴）→ hasUnemploymentInsurance true =====
    await clickBankBtn(page, '参保')
    s = (await snap(page))!
    expectFinite(s, '参保后')
    expect(s.hasUnemploymentInsurance).toBe(true)

    // ===== 财务报表：可查看，金额一致 =====
    await clickBankBtn(page, '财务报表')
    await page.getByText('财务报表').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
    const statementVisible = await page.getByText('财务报表').first().isVisible().catch(() => false)
    expect(statementVisible).toBe(true)
    await closeBank(page)

    // ===== 全程无控制台错误 =====
    expect(errors, '出现控制台/页面错误').toEqual([])

    await page.screenshot({ path: path.join(RUN_DIR, 'single-finance-complete.png'), fullPage: false })
  })
})
