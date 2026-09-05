import { describe, it, expect } from 'vitest'
import { GameSession, type ReplayVerification } from '../../server/game/GameSession'
import { calculateReplayHash } from '@/engine/stateHash'
import type { GameAction } from '@/engine/contract'
import type { GameConfig } from '@/types/game'
import type { SessionPlayerSetup } from '../../server/game/GameSession'

const CONFIG: GameConfig = {
  playerCount: 2,
  insurance: false,
  bigFamily: false,
  mortgage: false,
  fastStart: false,
  ageLimit: true,
}

const PLAYERS: SessionPlayerSetup[] = [
  { name: '小明', colorId: 'blue', careerId: 'programmer', dreamId: 'beach-house' },
  { name: '小红', colorId: 'red', careerId: 'doctor', dreamId: 'charity-foundation' },
]

function makeSession(seed: number = 42): GameSession {
  return new GameSession({
    id: 'sess-replay',
    roomId: 'room-replay',
    seed,
    version: '2.4.0',
    config: CONFIG,
    players: PLAYERS,
    startedAt: 1000,
  })
}

function actionForPlayer(s: GameSession, type: string, extra: Record<string, unknown> = {}): GameAction {
  return { type, playerId: s.currentPlayerId, ...extra } as GameAction
}

/**
 * 确定性推进一到多个回合：掷骰 → 处理落点待定 → 结束回合。
 * 返回过程实际提交的 action 数量（含失败的重试，不影响确定性）。
 */
function playTurns(s: GameSession, turns = 1): number {
  let dispatched = 0
  for (let t = 0; t < turns; t++) {
    s.dispatch(actionForPlayer(s, 'roll_dice'))
    dispatched++
    // 消化当前玩家的 pendingAction，直至回到"可掷骰/可结束回合"状态
    let guard = 0
    while (s.snapshot().turn.pendingAction !== null && guard < 40) {
      const pending = s.snapshot().turn.pendingAction
      let action: GameAction
      switch (pending) {
        case 'opportunity':
        case 'need_loan':
          action = actionForPlayer(s, 'decline_opportunity')
          break
        case 'charity':
          action = actionForPlayer(s, 'handle_charity', { accepted: false })
          break
        case 'market':
          action = actionForPlayer(s, 'handle_market')
          break
        case 'doodad':
          action = actionForPlayer(s, 'handle_doodad')
          break
        case 'story':
          action = actionForPlayer(s, 'handle_story')
          break
        case 'stock_sell_opportunity':
          action = actionForPlayer(s, 'sell_opportunity', { assetId: '', price: 0, quantity: 1 })
          break
        case 'bankrupt':
          action = actionForPlayer(s, 'declare_bankruptcy')
          break
        case 'fast_track_opportunity':
        case 'fast_track_dream':
          action = actionForPlayer(s, 'fast_track_dream', { accepted: false })
          break
        case 'fast_track_stock_trading':
          action = actionForPlayer(s, 'fast_track_stock_trading', { symbol: '', quantity: 0, isBuy: false })
          break
        default:
          action = actionForPlayer(s, 'end_turn')
          break
      }
      s.dispatch(action)
      dispatched++
      guard++
    }
    s.dispatch(actionForPlayer(s, 'end_turn'))
    dispatched++
  }
  return dispatched
}

describe('Phase 7 — 确定性 Replay / StateHash', () => {
  it('相同 seed 产生相同的初始 StateHash；不同 seed 不同', () => {
    const s1 = makeSession(7)
    const s2 = makeSession(7)
    const s3 = makeSession(8)
    const h1 = s1.snapshot().stateHash
    const h2 = s2.snapshot().stateHash
    const h3 = s3.snapshot().stateHash
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
  })

  it('多回合后：相同 seed + 相同 actionLog 可确定性重建（verifyReplayIntegrity 通过）', () => {
    const s = makeSession(123)
    playTurns(s, 3)
    const actionCount = s.getActionLog().length
    expect(actionCount).toBeGreaterThan(0)
    const verify: ReplayVerification = s.verifyReplayIntegrity()
    expect(verify.passed).toBe(true)
    expect(verify.expectedHash).toBe(verify.actualHash)
  })

  it('两个独立构建的同 seed 会话执行相同 action 序列，最终 StateHash 一致', () => {
    const a = makeSession(99)
    playTurns(a, 4)
    // 复用 a 的 action 序列（含 playerId），重置全局随机源后重放到 b。
    // 注意：b 须在 a 跑完后构建，避免共享 defaultRandom 被 a 的推进污染。
    const b = makeSession(99)
    for (const action of a.getActionLog()) b.dispatch(action)
    expect(a.snapshot().stateHash).toBe(b.snapshot().stateHash)
    expect(a.getFinalResult().stateHash).toBe(b.getFinalResult().stateHash)
  })

  it('getReplay 产出完整的 Replay 元数据，replayHash 稳定且可被既有 Shash 校验', () => {
    const s = makeSession()
    playTurns(s, 2)
    const replay = s.getReplay()
    expect(replay.seed).toBe(s.seed)
    expect(replay.actions.length).toBe(s.getActionLog().length)
    expect(replay.finalStateHash).toBe(s.snapshot().stateHash)
    // replayHash 与重新组合 GameReplay 后 calculateReplayHash 一致
    expect(replay.replayHash).toBe(calculateReplayHash(replay))
    // 稳定性：连续两次导出一致
    expect(s.getReplay().replayHash).toBe(replay.replayHash)
  })

  it('篡改 action 序列会导致 replayHash 改变（完整性校验）', () => {
    const s = makeSession()
    playTurns(s, 2)
    const replay = s.getReplay()
    const original = replay.replayHash
    const tampered = { ...replay, actions: replay.actions.map((a) => ({ ...a })) }
    tampered.actions[0] = { ...tampered.actions[0]!, type: 'end_turn' } as GameAction
    expect(calculateReplayHash(tampered)).not.toBe(original)
  })

  it('getFinalResult 生成玩家最终财务摘要与计数', () => {
    const s = makeSession()
    playTurns(s, 2)
    const r = s.getFinalResult()
    expect(r.players).toHaveLength(2)
    for (const p of r.players) {
      expect(Number.isFinite(p.cash)).toBe(true)
      expect(Number.isFinite(p.savings)).toBe(true)
      expect(Number.isFinite(p.netWorth)).toBe(true)
      expect(typeof p.stateHash ?? p).toBeDefined()
    }
    expect(typeof r.stateHash).toBe('string')
    expect(r.stateHash).toHaveLength(8)
    expect(r.turnNumber).toBeGreaterThan(0)
  })

  it('Room EventLog 记录 game_started 与动作事件，序 号递增', () => {
    const s = makeSession()
    playTurns(s, 1)
    const log = s.getEventLog()
    // 至少：game_started + 一次 dice_rolled
    expect(log[0]).toBeTruthy()
    expect(log[0]?.type).toBe('game_started')
    expect(log[0]?.sequence).toBe(1)
    expect(log.some((e) => e.type === 'dice_rolled')).toBe(true)
    const sequences = log.map((e) => e.sequence)
    expect([...sequences].sort((x, y) => x - y)).toEqual(sequences)
    expect(new Set(sequences).size).toBe(sequences.length)
  })
})