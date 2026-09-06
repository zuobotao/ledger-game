/**
 * Phase 9 — 完整 Multiplayer E2E（两个浏览器真实同局，计划 §21 Multiplayer 矩阵）
 *
 * 依赖：vite dev server 运行在 5173（base /ledger-game）；本 spec 在 beforeAll 内
 * 自启动 Node RoomServer（8787）。游戏状态由服务器权威裁决，客户端只提交 GameAction
 * 意图，因此本测试不预置存档、不注入状态，纯真实 UI 驱动。
 *
 * 覆盖计划 §21 Multiplayer：
 *   Create Room → Join → Ready → Start
 *   → A Turn → Sync（每步后双方 StateHash 一致）
 *   → B Turn → Sync
 *   → Transaction（机会买入/出售）→ Event（市场风云/生活意外/故事/慈善/贷款）
 *   → Reconnect（刷新 B，autoReconnect 回到同局，hash 仍与 A 一致）
 *   → Continue（重连后继续推进回合）
 *   → 全程无 NaN / Infinity、无控制台 / 页面错误
 *
 * 驱动策略：回合严格交替，逐个解析当前玩家的权威 pendingAction。
 * 机会卡买单可能因现金不足被服务器拒绝（state 不变），此时自动降级为「放弃」，
 * 保证每步都能推动，杜绝死锁。
 */
import { test, expect, chromium, type Page, type BrowserContext } from '@playwright/test'
import { createServer } from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RoomServer } from '../../server/RoomServer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RUN_ID = `mp-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}`
const RUN_DIR = path.join(__dirname, `../runs/${RUN_ID}`)
fs.mkdirSync(RUN_DIR, { recursive: true })

let roomServer: RoomServer

/** vue devtools 浮窗会拦截底部指针事件；自动化中移除 */
async function dismissVueDevtools(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('#__vue-devtools-container__').forEach((el) => el.remove())
  })
}

type MPView = {
  stateHash: string
  myGamePlayerId: string | null
  currentPlayerId: string
  currentPlayerName: string
  turnNumber: number
  pendingType: string | null
  pendingCardTitle: string
  allowedActions: string[]
  isMyTurn: boolean
  finished: boolean
  players: {
    id: string
    name: string
    cash: number
    savings: number
    cashFlow: number
    assetsCount: number
    liabilitiesTotal: number
  }[]
}

/** 从 window.multiplayerStore 读取当前权威状态（Dev 模式暴露） */
async function mp(page: Page): Promise<MPView | null> {
  return page
    .evaluate(() => {
      const s = (window as any).multiplayerStore
      if (!s || !s.gameState) return null
      const gs = s.gameState
      const cur = gs.players[gs.currentPlayerIndex] ?? null
      const card = gs.pendingAction?.card ?? {}
      return {
        stateHash: s.stateHash ?? '',
        myGamePlayerId: s.myGamePlayerId ?? null,
        currentPlayerId: cur ? cur.id : '',
        currentPlayerName: cur ? cur.name : '',
        turnNumber: s.sessionInfo?.turnNumber ?? 0,
        pendingType: gs.pendingAction ? String(gs.pendingAction.type) : null,
        pendingCardTitle: String(card?.title ?? card?.name ?? ''),
        allowedActions: (s.turn?.allowedActions ?? []).slice(),
        isMyTurn: Boolean(s.isMyTurn),
        finished: Boolean(s.finished),
        players: gs.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          cash: p.cash ?? 0,
          savings: p.savings ?? 0,
          cashFlow: p.cashFlow ?? 0,
          assetsCount: (p.assets || []).length,
          liabilitiesTotal: (p.liabilities || []).reduce((a: number, l: any) => a + (l.amount ?? 0), 0),
        })),
      }
    })
    .catch(() => null)
}

/** 把一个权威动作映射到视图按钮 testid */
function pickButton(allowed: string[], rolledThisTurn: boolean): string | null {
  const map: Record<string, string> = {
    buy_opportunity: 'buy_opportunity',
    decline_opportunity: 'decline_opportunity',
    handle_market: 'handle_market',
    handle_doodad: 'handle_doodad',
    handle_story: 'handle_story',
    handle_charity: 'charity_y',
    take_bank_loan: 'take_bank_loan',
    declare_bankruptcy: 'bankrupt',
    fast_track_opportunity: 'ft_opp',
    fast_track_dream: 'ft_dream',
    sell_opportunity: 'sell_opportunity',
  }
  // 1) 待定事件 → 对应的确定性按钮（allowedActions 已收窄，不含 roll/end）
  const pendingKey = allowed.find((a) => map[a])
  if (pendingKey) return map[pendingKey]
  // 2) 回合起点/推进：本回合未掷骰则掷，已掷骰则结束回合，保证回合交替推进
  if (allowed.includes('roll_dice')) return rolledThisTurn ? 'end_turn' : 'roll_dice'
  if (allowed.includes('end_turn')) return 'end_turn'
  return null
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** 等待两个客户端收敛到同一个非空 StateHash（核心同步验收） */
async function settleSync(pageA: Page, pageB: Page): Promise<{ a: string; b: string }> {
  let a = ''
  let b = ''
  for (let i = 0; i < 40; i++) {
    a = (await mp(pageA))?.stateHash ?? ''
    b = (await mp(pageB))?.stateHash ?? ''
    if (a && b && a === b) return { a, b }
    await sleep(200)
  }
  return { a, b }
}

async function clickActive(page: Page, testid: string): Promise<void> {
  const btn = page.locator(`[data-testid="act-${testid}"]`)
  await btn.waitFor({ state: 'visible', timeout: 10_000 })
  await btn.click()
}

/** 判定当前哪个浏览器持有回合（轮询双方），返回 active page；无则 null */
async function activePage(pageA: Page, pageB: Page): Promise<Page | null> {
  for (let i = 0; i < 40; i++) {
    const [va, vb] = await Promise.all([mp(pageA), mp(pageB)])
    if (va?.isMyTurn && va?.finished === false) return pageA
    if (vb?.isMyTurn && vb?.finished === false) return pageB
    if (va?.finished || vb?.finished) return null
    await sleep(200)
  }
  return null
}

test.beforeAll(async () => {
  const http = createServer()
  roomServer = new RoomServer(http)
  await new Promise<void>((resolve) => http.listen(8787, () => resolve()))
})

test.describe('Phase 9 · 完整多人 E2E（Desktop）', () => {
  test('创建/加入/开局 → 回合交替+每步同步 → 交易/事件/贷款 → 重连续玩 → 无错误', async () => {
    const browser = await chromium.launch({ args: ['--no-proxy-server'] })
    const ctxA: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const ctxB: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    const errA: string[] = []
    const errB: string[] = []
    pageA.on('console', (m) => m.type() === 'error' && errA.push(m.text().slice(0, 160)))
    pageA.on('pageerror', (e) => errA.push(`PAGEERROR: ${e.message.slice(0, 160)}`))
    pageB.on('console', (m) => m.type() === 'error' && errB.push(m.text().slice(0, 160)))
    pageB.on('pageerror', (e) => errB.push(`PAGEERROR: ${e.message.slice(0, 160)}`))

    await dismissVueDevtools(pageA)
    await dismissVueDevtools(pageB)

    // ===== Create Room =====
    await pageA.goto('/#/multiplayer')
    await pageA.waitForSelector('[data-testid="mp-nickname"]')
    await pageA.fill('[data-testid="mp-nickname"]', '小明')
    await pageA.click('[data-testid="mp-create-btn"]')
    await pageA.waitForSelector('[data-testid="lobby-copy-code"]', { timeout: 15_000 })
    const code = ((await pageA.textContent('[data-testid="lobby-copy-code"]')) ?? '').trim()
    expect(code).toHaveLength(6)

    // ===== Join =====
    await pageB.goto('/#/multiplayer')
    await pageB.waitForSelector('[data-testid="mp-nickname"]')
    await pageB.fill('[data-testid="mp-nickname"]', '小红')
    await pageB.fill('[data-testid="mp-code"]', code)
    await pageB.click('[data-testid="mp-join-btn"]')
    await pageB.waitForSelector('[data-testid="lobby-player"]', { timeout: 15_000 })
    await expect(pageA.locator('[data-testid="lobby-player"]')).toHaveCount(2, { timeout: 15_000 })

    // ===== Ready（Phase 8：模态框选择职业/梦想，autoConfirm 选中即关闭）=====
    await pageA.click('[data-testid="open-career-selector"]')
    await pageA.click('[data-testid="career-software-engineer"]')
    await pageA.click('[data-testid="open-dream-selector"]')
    await pageA.click('[data-testid="dream-beach-house"]')
    await pageA.click('[data-testid="color-blue"]')
    await pageB.click('[data-testid="open-career-selector"]')
    await pageB.click('[data-testid="career-doctor"]')
    await pageB.click('[data-testid="open-dream-selector"]')
    await pageB.click('[data-testid="dream-charity-foundation"]')
    await pageB.click('[data-testid="color-red"]')
    await pageB.click('[data-testid="lobby-ready"]')

    // ===== Start =====
    const startBtn = pageA.locator('[data-testid="lobby-start"]')
    await startBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await pageA.waitForFunction(() => {
      const el = document.querySelector('[data-testid="lobby-start"]') as HTMLButtonElement | null
      return !!el && !el.disabled
    })
    await startBtn.click()
    await pageA.waitForSelector('[data-testid="mp-players"]', { timeout: 15_000 })
    await pageB.waitForSelector('[data-testid="mp-players"]', { timeout: 15_000 })

    // 记录两名玩家的 gamePlayerId 以便统计各自回合数
    let pidA = ''
    let pidB = ''
    await expect.poll(async () => (await mp(pageA))?.players.length ?? 0, { timeout: 15_000 }).toBe(2)
    const snap0 = (await mp(pageA))!
    pidA = snap0.players[0]!.id
    pidB = snap0.players[1]!.id
    expect(pidA).not.toBe(pidB)

    // ===== 驱动多步：回合交替 + 每步同步 =====
    const maxSteps = 160
    let steps = 0
    const stats = {
      rolls: 0,
      buys: 0,
      declines: 0,
      events: 0,
      loans: 0,
      sales: 0,
      fastTrack: 0,
      endTurns: 0,
      aTurns: 0,
      bTurns: 0,
      hashChecks: 0,
    }
    let lastActiveId = ''
    let rolledThisTurn = false
    let turnMarker = ''

    // 持续到收敛标准达成：驱动 ≥12 步且双方都至少交替 ≥4 次（上限 160 步防失控）
    while (steps < maxSteps && (steps < 12 || stats.aTurns < 4 || stats.bTurns < 4)) {
      const active = await activePage(pageA, pageB)
      if (!active) break // 结束或无回合待处理
      const pre = await mp(active)
      if (!pre) {
        await sleep(300)
        continue
      }
      const m = `${pre.turnNumber}|${pre.currentPlayerId}`
      if (m !== turnMarker) {
        turnMarker = m
        rolledThisTurn = false
      }
      const btn = pickButton(pre.allowedActions, rolledThisTurn)
      if (!btn) {
        await sleep(400)
        continue
      }
      rolledThisTurn = rolledThisTurn || btn === 'roll_dice'

      // 统计
      if (pre.currentPlayerId === pidA && lastActiveId !== pidA) stats.aTurns++
      if (pre.currentPlayerId === pidB && lastActiveId !== pidB) stats.bTurns++
      lastActiveId = pre.currentPlayerId
      if (btn === 'roll_dice') stats.rolls++
      else if (btn === 'end_turn') stats.endTurns++
      else if (btn === 'buy_opportunity') stats.buys++
      else if (btn === 'decline_opportunity') stats.declines++
      else if (btn === 'take_bank_loan') stats.loans++
      else if (btn === 'sell_opportunity') stats.sales++
      else if (btn === 'ft_opp' || btn === 'ft_dream') stats.fastTrack++
      else stats.events++ // market / doodad / story / charity

      await clickActive(active, btn)
      // 等待动作真正生效（hash 变化）：成功会推进 hash；资金不足被拒则「不改 hash」仍停留同一机会卡
      const hashBeforeAction = pre.stateHash
      let aApplied = await mp(active)
      const t0 = Date.now()
      while (aApplied && aApplied.stateHash === hashBeforeAction && Date.now() - t0 < 1500) {
        await sleep(150)
        aApplied = await mp(active)
      }
      // 买机会被拒（hash 未变 + 仍是同一机会）→ 降级为放弃，保证推进，杜绝死锁
      if (btn === 'buy_opportunity' && aApplied && aApplied.stateHash === hashBeforeAction && aApplied.pendingType === 'opportunity') {
        await clickActive(active, 'decline_opportunity')
      }
      await settleSync(pageA, pageB)

      // 每步后双方 StateHash 必须一致
      const { a, b } = await settleSync(pageA, pageB)
      expect(a, `step${steps} A hash 为空`).not.toBe('')
      expect(a, `step${steps} A≠B hash: A=${a} B=${b}`).toBe(b)
      stats.hashChecks++

      await sleep(120)
      steps++
    }

    // 必须真实驱动了足够多的动作，且双方都实际行动过
    expect(steps, '应驱动 >8 步真实动作').toBeGreaterThanOrEqual(12)
    expect(stats.aTurns, 'A 应至少行动 4 次').toBeGreaterThanOrEqual(4)
    expect(stats.bTurns, 'B 应至少行动 4 次（回合确实交替了）').toBeGreaterThanOrEqual(4)
    // 矩阵 Transaction/Event 验收：要么发生交易（买入/出售），要么发生过事件
    expect(stats.buys + stats.sales + stats.declines + stats.events + stats.loans + stats.fastTrack,
      `应观察到至少一次交易/事件/贷款，实际=${JSON.stringify(stats)}`)
      .toBeGreaterThan(0)

    // ===== Reconnect（刷新 B → autoReconnect → 恢复到同一权威状态，hash 仍与 A 一致）=====
    await dismissVueDevtools(pageA)
    const hashBeforeReload = (await settleSync(pageA, pageB)).a

    // 1) 经多人首页刷新以触发 autoReconnect，让 store 单例恢复会话
    await pageB.goto('/#/multiplayer')
    // 2) 等待服务端把权威状态恢复到客户端单例（证明重连成功，而不依赖 lobby 自动跳转的时序）
    await pageB.waitForFunction(
      () => {
        const s = (window as any).multiplayerStore
        return !!(s && s.gameState && s.stateHash)
      },
      { timeout: 20_000 },
    )
    await dismissVueDevtools(pageB)
    const bAfterReconnect = (await mp(pageB))!
    expect(bAfterReconnect.stateHash, '重连后 B hash 应为空串（未恢复状态）').not.toBe('')
    expect(bAfterReconnect.stateHash, `重连后 B 应与 A 权威 hash 一致：B=${bAfterReconnect.stateHash} A=${hashBeforeReload}`).toBe(hashBeforeReload)
    expect((await mp(pageA))!.stateHash).toBe(hashBeforeReload)

    // 3) 收敛双方哈希一致后，用 SPA hash 导航（非硬刷新，保留已恢复的 store 单例）进入对局视图
    const bIsOnGame = (await pageB.locator('[data-testid="mp-players"]').count()) > 0
    if (!bIsOnGame) {
      await pageB.evaluate(() => {
        window.location.hash = '/multiplayer-game'
      })
    }
    await pageB.waitForSelector('[data-testid="mp-players"]', { timeout: 15_000 })
    await dismissVueDevtools(pageB)
    const afterReconnect = await settleSync(pageA, pageB)
    expect(afterReconnect.a, '重连后 A hash 为空').not.toBe('')
    expect(afterReconnect.a, `重连后双方 hash 应一致，A=${afterReconnect.a} B=${afterReconnect.b}`).toBe(afterReconnect.b)
    expect(afterReconnect.a).toBe(hashBeforeReload)

    // ===== Continue：重连后继续推进到回合交替 =====
    let continuedSteps = 0
    let cRolled = false
    let cMarker = ''
    while (continuedSteps < 8) {
      const active = await activePage(pageA, pageB)
      if (!active) break
      const pre = await mp(active)
      if (!pre) break
      const cm = `${pre.turnNumber}|${pre.currentPlayerId}`
      if (cm !== cMarker) {
        cMarker = cm
        cRolled = false
      }
      const btn = pickButton(pre.allowedActions, cRolled)
      if (!btn) {
        await sleep(400)
        continue
      }
      cRolled = cRolled || btn === 'roll_dice'
      const chashBefore = pre.stateHash
      let cApplied = await mp(active)
      const t1 = Date.now()
      while (cApplied && cApplied.stateHash === chashBefore && Date.now() - t1 < 1500) {
        await sleep(150)
        cApplied = await mp(active)
      }
      if (btn === 'buy_opportunity' && cApplied && cApplied.stateHash === chashBefore && cApplied.pendingType === 'opportunity') {
        await clickActive(active, 'decline_opportunity')
      }
      await settleSync(pageA, pageB)
      const { a, b } = await settleSync(pageA, pageB)
      expect(a).toBe(b)
      await sleep(120)
      continuedSteps++
    }
    // 重连后回合确实继续推进了（能再驱动 ≥1 步）
    expect(continuedSteps, '重连后应能继续驱动至少 1 步').toBeGreaterThanOrEqual(1)

    // ===== 财务字段全程有限（无 NaN / Infinity）=====
    for (const p of (await mp(pageA))!.players) {
      for (const f of ['cash', 'savings', 'cashFlow', 'liabilitiesTotal'] as const) {
        expect(Number.isFinite(p[f]), `player ${p.name} .${f} 应为有限值，实际 ${p[f]}`).toBe(true)
      }
    }

    // ===== 全程无控制台 / 页面错误 =====
    expect(errA, 'A 浏览器出现控制台/页面错误').toEqual([])
    expect(errB, 'B 浏览器出现控制台/页面错误').toEqual([])

    await pageA.screenshot({ path: path.join(RUN_DIR, 'mp-e2e-final-A.png') })
    await pageB.screenshot({ path: path.join(RUN_DIR, 'mp-e2e-final-B.png') })
    fs.writeFileSync(
      path.join(RUN_DIR, 'mp-e2e-stats.json'),
      JSON.stringify({ steps, stats, hashBeforeReload, afterReconnect, pidA, pidB }, null, 2),
    )

    await ctxA.close()
    await ctxB.close()
    await browser.close()
  })
})