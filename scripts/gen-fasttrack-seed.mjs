/**
 * FastTrack 专项 Playtest — 晋升就绪 seed 生成器
 *
 * 流程（全部通过真实 UI）：
 * 1. 打开首页 → 「开始游戏」 → SetupView → 选择 1 名玩家 → 「开始游戏」建局
 * 2. 从 localStorage 读取真实存档（保证结构合法）
 * 3. 只做「存档补丁」：给玩家注入高被动现金流的企业资产 + 充足现金 + 一个梦想，
 *    使 `passiveIncome >= totalExpenses`（由 loadState 的 recalcPlayerFinancials 真实派生）
 * 4. 输出到 playtest/fixtures/fasttrack-seed.json
 *
 * 说明：这是 Playtest 的 fixture 预置（seed），在页面 JS 加载前注入，
 * 运行期仍只走真实 UI 点击，不修改中间状态。
 */

import { chromium } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../playtest/fixtures/fasttrack-seed.json')
const BASE = process.env.SEED_BASE_URL ?? 'http://localhost:5173/ledger-game'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

// 1) 首页 → 开始游戏（与真实玩家一致）
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
const startBtn = page
  .getByTestId('btn-start')
  .or(page.locator('[data-dom-id="btn-start"]'))
  .or(page.getByRole('button', { name: '开始游戏' }))
await startBtn.click()
await page.waitForFunction(() => window.location.hash.includes('setup'))
await page.waitForLoadState('networkidle')

// 选 1 名玩家
await page.locator('#player-count').selectOption('1')
await page.waitForTimeout(150)

// 开始游戏 → 进入对局（生成真实存档）
const begin = page
  .locator('[data-dom-id="btn-begin"]')
  .or(page.getByRole('button', { name: '开始游戏' }))
await begin.click()
await page.waitForFunction(() => window.location.hash.includes('rat-race'))
await page.waitForTimeout(800)

// 2) 读取真实存档
const raw = await page.evaluate(() => localStorage.getItem('ledger101-game-state'))
if (!raw) throw new Error('未能从 localStorage 读到存档')
const state = JSON.parse(raw)
if (!state.players || state.players.length === 0) throw new Error('存档没有玩家')

const p = state.players[0]

// 3) 注释：高被动现金流企业资产（净现金流 9000/月 >> 任意职业支出 → recalc 后必晋升资格）
p.assets = [
  {
    id: 'seed-biz-tech',
    name: '软件公司股权',
    type: 'business',
    cost: 300000,
    cashFlow: 9000,
    quantity: 1,
    loanAmount: 1200000,
    monthlyLoanPayment: 8000,
    marketPrice: 1500000,
  },
]

// 充足现金 + 储蓄（支持机会 / 梦想 / 股票买入）
p.cash = 400000
p.savings = 100000

// 一个梦想（fast_track_dream 格用）
p.dream = {
  id: 'beach-house',
  name: '海边别墅',
  description: '拥有一座面朝大海的度假别墅。',
  price: 120000,
  icon: 'home',
  category: 'lifestyle',
  story: '推开窗就是蔚蓝大海，听着海浪声入睡。',
}

// 复位到「rat_race · idle · 第 1 回合」，让加载后经「继续游戏」进入资格面板
p.phase = 'rat_race'
p.ratRacePosition = 0
p.fastTrackPosition = 0
state.phase = 'rat_race'
state.currentPlayerIndex = 0
state.turnStatus = 'idle'
state.turnNumber = 1
state.gameMonth = 0
state.pendingAction = { type: null, card: null, message: '' }
state.marketEvent = null
state.marketEventState = null
state.schemaVersion = 1

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(state, null, 2))
console.log(`seed written: ${OUT}`)
console.log(
  `player[0]: name=${p.name} career=${p.career?.id} cash=${p.cash} savings=${p.savings} ` +
    `passiveIncome(after recalc)≈${(p.assets || []).reduce((s, a) => s + (a.cashFlow ?? 0) * (a.quantity ?? 1), 0)}`,
)

await browser.close()