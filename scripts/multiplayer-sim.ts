/**
 * 多人对局自动模拟器（Phase 8 / Phase 9）
 *
 * 直接在服务器进程内以权威 GameSession 跑多局，用确定性 seed 复现，度量：
 * - deadlock = 0（动作预算内是否卡死/无限循环）
 * - state divergence = 0（verifyReplayIntegrity：同 seed + 同 actionLog 重建一致）
 * - NaN = 0（玩家财务字段无 NaN）
 * - invariant violations = 0（灰度边界：现金/存款/现金流/回合不变量）
 * - 首个资产获取回合、回合数、胜者等对局指标
 *
 * 用法：npx tsx scripts/multiplayer-sim.ts [--players 2,3,4] [--seeds N]
 */

import { GameSession, type SessionPlayerSetup } from '../server/game/GameSession'
import type { GameAction } from '@/engine/contract'
import type { GameConfig } from '@/types/game'

const CONFIG: GameConfig = {
  playerCount: 2,
  insurance: false,
  bigFamily: false,
  mortgage: false,
  fastStart: false,
  ageLimit: true,
}

const CAREERS = ['programmer', 'doctor', 'nurse', 'truck-driver', 'lawyer', 'engineer']
const DREAMS = ['beach-house', 'charity-foundation', 'golden-park', 'diamond']
const COLORS = ['blue', 'green', 'red', 'orange', 'purple', 'pink']

interface SimOptions {
  players: number[]
  seeds: number[]
  /** 每局最大动作数（防止异常核中的死循环/超长局） */
  maxActions: number
}

interface GameMetrics {
  seed: number
  playerCount: number
  finished: boolean
  reason?: string
  turns: number
  actions: number
  firstAssetTurn?: number
  winnerName?: string
  failedActions: number
  deadlock: boolean
  divergence: boolean
  hasNaN: boolean
  invariantViolations: string[]
}

interface Aggregate {
  games: number
  finished: number
  deadlock: number
  divergence: number
  nan: number
  invariantViolations: number
  failedActions: number
  avgTurns: number
  avgActions: number
  byPlayers: Record<string, { games: number; finished: number; deadlock: number; divergence: number; nan: number }>
}

function makePlayers(n: number): SessionPlayerSetup[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `玩家${i + 1}`,
    colorId: COLORS[i % COLORS.length]!,
    careerId: CAREERS[i % CAREERS.length]!,
    dreamId: DREAMS[i % DREAMS.length],
  }))
}

function buildAction(type: string, playerId: string, tryBuy = true): GameAction {
  const base = { type, playerId } as GameAction
  switch (type) {
    case 'buy_opportunity':
      return { ...base, quantity: 1 } as GameAction
    case 'handle_charity':
      return { ...base, accepted: tryBuy } as GameAction
    case 'fast_track_dream':
    case 'fast_track_opportunity':
      return { ...base, accepted: tryBuy } as GameAction
    case 'take_bank_loan':
      return { ...base } as GameAction
    case 'sell_opportunity':
      return { ...base, assetId: '', price: 0, quantity: 1 } as GameAction
    case 'fast_track_stock_trading':
      return { ...base, symbol: '', quantity: 1, isBuy: tryBuy } as GameAction
    case 'handle_market':
    case 'handle_doodad':
    case 'handle_story':
    case 'declare_bankruptcy':
    case 'decline_opportunity':
    case 'roll_dice':
    case 'end_turn':
    default:
      return base
  }
}

/** 当前 pendingAction 对应的"安全通过"动作（确保不因参数不足而停滞） */
function passAction(pending: string | null, playerId: string): GameAction {
  const base = { playerId } as GameAction
  switch (pending) {
    case 'opportunity':
    case 'need_loan':
      return { ...base, type: 'decline_opportunity' } as GameAction
    case 'charity':
      return { ...base, type: 'handle_charity', accepted: false } as GameAction
    case 'market':
      return { ...base, type: 'handle_market' } as GameAction
    case 'doodad':
      return { ...base, type: 'handle_doodad' } as GameAction
    case 'story':
      return { ...base, type: 'handle_story' } as GameAction
    case 'stock_sell_opportunity':
      return { ...base, type: 'skip_stock_sell' } as GameAction
    case 'bankrupt':
      return { ...base, type: 'declare_bankruptcy' } as GameAction
    case 'fast_track_opportunity':
    case 'fast_track_dream':
      return { ...base, type: 'fast_track_dream', accepted: false } as GameAction
    case 'fast_track_stock_trading':
      return { ...base, type: 'fast_track_stock_trading', symbol: '', quantity: 0, isBuy: false } as GameAction
    default:
      return { ...base, type: 'end_turn' } as GameAction
  }
}

/** 检查当前快照是否有 NaN / 灰度不变量违规 */
function checkInvariants(session: GameSession): string[] {
  const violations: string[] = []
  const snap = session.snapshot()
  const pid = session.currentPlayerId
  for (const p of snap.state.players) {
    for (const [label, v] of Object.entries({
      cash: p.cash,
      cashFlow: p.cashFlow,
      totalIncome: p.totalIncome,
      totalExpenses: p.totalExpenses,
      passiveIncome: p.passiveIncome,
      savings: p.savings,
    })) {
      if (typeof v !== 'number' || Number.isNaN(v)) violations.push(`[${p.name}] ${label} = NaN`)
      if (typeof v === 'number' && Math.abs(v) > 1e9) violations.push(`[${p.name}] ${label} 异常量级 ${v}`)
    }
    if (p.totalExpenses < 0) violations.push(`[${p.name}] 支出为负`)
  }
  if (typeof snap.state.turnNumber !== 'number' || !Number.isFinite(snap.state.turnNumber)) {
    violations.push('回合号非有限数')
  }
  void pid
  return violations
}

function runGame(seed: number, playerCount: number, maxActions: number, tryBuy: boolean): GameMetrics {
  const session = new GameSession({
    id: `sim-${seed}-${playerCount}`,
    roomId: `room-sim-${seed}`,
    seed,
    version: '2.4.0',
    config: { ...CONFIG, playerCount },
    players: makePlayers(playerCount),
    startedAt: 1000,
  })

  const m: GameMetrics = {
    seed,
    playerCount,
    finished: false,
    turns: 0,
    actions: 0,
    failedActions: 0,
    deadlock: false,
    divergence: false,
    hasNaN: false,
    invariantViolations: [],
  }
  let lastFirstAsset = -1
  let actionCount = 0
  let idleStreak = 0
  let lastHash = ''
  // 回合机状态：pending 为 null 且本回合已掷骰 → 需 end_turn 换人
  let justRolled = false

  while (actionCount < maxActions && session.status !== 'finished') {
    const snap = session.snapshot()

    // 首份资产里程碑：任一玩家获得首份资产/进入快车道即记录
    const curPlayer = snap.state.players.find((p) => p.id === snap.turn.currentPlayerId)
    if (lastFirstAsset < 0 && curPlayer && (curPlayer.assets.length > 0 || curPlayer.phase === 'fast_track')) {
      lastFirstAsset = actionCount
      m.firstAssetTurn = snap.session.turnNumber
    }

    // NaN 与不变量
    const violations = checkInvariants(session)
    if (violations.length) m.invariantViolations.push(...violations)
    if (snap.state.players.some((p) => Object.values(p).some((v) => (typeof v === 'number' && Number.isNaN(v))))) m.hasNaN = true

    // deadlock：连续迭代权威 StateHash 不变 → 状态停滞（真死锁）
    if (snap.stateHash === lastHash) idleStreak++
    else {
      lastHash = snap.stateHash
      idleStreak = 0
    }
    if (idleStreak > 25) {
      m.deadlock = true
      break
    }

    // 选动作：pending 待定 → 尽职后处理；pending 为 null → 掷骰 或 结束回合
    let action: GameAction
    const pending = snap.turn.pendingAction
    const allowed = snap.turn.allowedActions
    if (pending) {
      const tryBuyThis = tryBuy && (pending === 'opportunity' || pending === 'fast_track_opportunity')
      if (tryBuyThis && allowed.includes('buy_opportunity')) {
        action = buildAction('buy_opportunity', snap.turn.currentPlayerId, true)
      } else if (tryBuyThis && allowed.includes('fast_track_opportunity')) {
        action = buildAction('fast_track_opportunity', snap.turn.currentPlayerId, true)
      } else if (pending === 'stock_sell_opportunity') {
        // 优先尝试按机会卡真实卖出；失败（未持股/不想卖）由 passAction 退回 skip 推进
        const card = snap.state.pendingAction?.card as { symbol?: string; cost?: number } | null | undefined
        action = {
          ...buildAction('sell_opportunity', snap.turn.currentPlayerId, true),
          assetId: card?.symbol ?? '',
          price: card?.cost ?? 0,
          quantity: 1,
        }
      } else {
        action = buildAction(passAction(pending, snap.turn.currentPlayerId).type, snap.turn.currentPlayerId, tryBuy)
      }
    } else if (!justRolled) {
      action = buildAction('roll_dice', snap.turn.currentPlayerId)
      justRolled = true
    } else {
      action = buildAction('end_turn', snap.turn.currentPlayerId)
      justRolled = false
    }

    const result = session.dispatch(action)
    actionCount++
    m.actions = actionCount
    if (!result.success) {
      m.failedActions++
      // 失败说明推测动作非法；退回安全动作推进一次，避免停滞
      const curSnap = session.snapshot()
      const fallback = passAction(curSnap.turn.pendingAction, curSnap.turn.currentPlayerId)
      const fr = session.dispatch(fallback)
      actionCount++
      m.actions = actionCount
      if (!fr.success) idleStreak++
    } else {
      idleStreak = 0
    }
    m.turns = session.snapshot().session.turnNumber
  }

  m.finished = session.status === 'finished'
  const fin = session.getFinalResult()
  m.reason = fin.gameEndReason
  m.divergence = !session.verifyReplayIntegrity().passed
  m.winnerName = fin.players.find((p) => p.playerId === fin.winnerId)?.name
  return m
}

function main(): void {
  const args = process.argv.slice(2)
  const players = parsePlayers(args)
  const seeds = parseSeeds(args)
  const maxActions = parseInt(nextArg(args, '--max-actions') ?? '400', 10)

  const agg: Aggregate = {
    games: 0,
    finished: 0,
    deadlock: 0,
    divergence: 0,
    nan: 0,
    invariantViolations: 0,
    failedActions: 0,
    avgTurns: 0,
    avgActions: 0,
    byPlayers: {},
  }
  const totals = { turns: 0, actions: 0 }
  const maxes = { deadlock: [] as string[], divergence: [] as string[], nan: [] as string[], invariants: [] as string[] }

  for (const pc of players) {
    const rec = (agg.byPlayers[pc] = { games: 0, finished: 0, deadlock: 0, divergence: 0, nan: 0 })
    // 每个 seed 跑两档策略：保守（tryBuy=false）与进取（tryBuy=true）
    for (const seed of seeds) {
      for (const tryBuy of [false, true]) {
        const m = runGame(seed, pc, maxActions, tryBuy)
        agg.games++
        rec.games++
        totals.turns += m.turns
        totals.actions += m.actions
        agg.failedActions += m.failedActions
        if (m.finished) {
          agg.finished++
          rec.finished++
        }
        if (m.deadlock) {
          agg.deadlock++
          rec.deadlock++
          maxes.deadlock.push(`种子${seed}/P${pc}/${tryBuy ? '进取' : '保守'}`)
        }
        if (m.divergence) {
          agg.divergence++
          rec.divergence++
          maxes.divergence.push(`种子${seed}/P${pc}/${tryBuy ? '进取' : '保守'}`)
        }
        if (m.hasNaN) {
          agg.nan++
          rec.nan++
          maxes.nan.push(`种子${seed}/P${pc}`)
        }
        if (m.invariantViolations.length) {
          agg.invariantViolations += m.invariantViolations.length
          maxes.invariants.push(`种子${seed}/P${pc}: ${m.invariantViolations.join('; ')}`)
        }
      }
    }
  }

  agg.avgTurns = agg.games ? Math.round((totals.turns / agg.games) * 10) / 10 : 0
  agg.avgActions = agg.games ? Math.round((totals.actions / agg.games) * 10) / 10 : 0

  console.log('===== Multiplayer Headless Simulation (Phase 8) =====')
  console.log(`对局数: ${agg.games} | 完成: ${agg.finished} | 平均回合: ${agg.avgTurns} | 平均动作: ${agg.avgActions}`)
  console.log(`deadlock: ${agg.deadlock} | divergence: ${agg.divergence} | NaN: ${agg.nan} | 不变量违规: ${agg.invariantViolations} | 失败动作: ${agg.failedActions}`)
  if (maxes.deadlock.length) console.log('  deadlock 局:', maxes.deadlock.join(', '))
  if (maxes.divergence.length) console.log('  divergence 局:', maxes.divergence.join(', '))
  if (maxes.nan.length) console.log('  NaN 局:', maxes.nan.join(', '))
  if (maxes.invariants.length) console.log('  不变量:')
  for (const inv of maxes.invariants) console.log('   -', inv)
  console.log(`分人数: ${JSON.stringify(agg.byPlayers)}`)

  const ok = agg.deadlock === 0 && agg.divergence === 0 && agg.nan === 0 && agg.invariantViolations === 0
  console.log(ok ? '结果: ✅ 全部通过 (deadlock=0, divergence=0, NaN=0, invariants=0)' : '结果: ❌ 存在失败项，需人工复核')
  process.exit(ok ? 0 : 1)
}

function parsePlayers(args: string[]): number[] {
  const raw = nextArg(args, '--players')
  if (!raw) return [2, 3, 4]
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 2)
}

function parseSeeds(args: string[]): number[] {
  const raw = nextArg(args, '--seeds')
  if (!raw) return Array.from({ length: 5 }, (_, i) => 100 + i)
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
}

function nextArg(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined
}

main()