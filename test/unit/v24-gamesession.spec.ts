import { describe, it, expect } from 'vitest'
import { GameSession } from '../../server/game/GameSession'
import { applyGameAction } from '../../server/game/actionMap'
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

function makeSession() {
  return new GameSession({
    id: 'sess-1',
    roomId: 'room-1',
    seed: 1,
    version: '2.4.0',
    config: CONFIG,
    players: [
      { name: '小明', colorId: 'blue', careerId: 'programmer', dreamId: 'beach-house' },
      { name: '小红', colorId: 'red', careerId: 'doctor', dreamId: 'charity-foundation' },
    ],
    startedAt: 1000,
  })
}

function actionForPlayer(session: GameSession, type: string, extra: Record<string, unknown> = {}): GameAction {
  return { type, playerId: session.currentPlayerId, ...extra } as GameAction
}

describe('GameSession 权威裁决', () => {
  it('创建即启动，双人已初始化', () => {
    const s = makeSession()
    const snap = s.snapshot()
    expect(s.status).toBe('playing')
    expect(snap.state.players).toHaveLength(2)
    expect(snap.session.turnNumber).toBe(1)
    expect(snap.turn.currentPlayerId).toBe(s.currentPlayerId)
    expect(snap.stateHash).toHaveLength(8)
  })

  it('当前玩家可 roll_dice，会产生状态变化与 dice 事件', () => {
    const s = makeSession()
    const r = s.dispatch(actionForPlayer(s, 'roll_dice'))
    expect(r.success).toBe(true)
    expect(r.events.some((e) => e.type === 'dice_rolled')).toBe(true)
    // 掷骰后应进入待定动作（轮到处理落点格），或仍可继续
    const snap = s.snapshot()
    expect(snap.sequence).toBeGreaterThan(0)
  })

  it('非当前玩家 roll_dice 被拒绝', () => {
    const s = makeSession()
    const other = s.snapshot().state.players[1]!.id
    const r = s.dispatch({ type: 'roll_dice', playerId: other })
    expect(r.success).toBe(false)
    expect(r.error).toBe('NOT_YOUR_TURN')
  })

  it('不允许的跳步动作被拒绝（market 之前不能 buy_opportunity）', () => {
    const s = makeSession()
    // 未掷骰时禁止直接买入机会
    const r = s.dispatch(actionForPlayer(s, 'buy_opportunity', { quantity: 1 }))
    expect(r.success).toBe(false)
    expect(r.error).toBe('INVALID_ACTION')
  })

  it('requestId 幂等：重复提交返回同一 sequence', () => {
    const s = makeSession()
    const action = actionForPlayer(s, 'roll_dice')
    const r1 = s.dispatch(action, 'req-A')
    const r2 = s.dispatch(action, 'req-A')
    expect(r1.sequence).toBe(r2.sequence)
  })
})

describe('actionMap 校验', () => {
  it('未知动作类型返回 INVALID_ACTION', () => {
    const s = makeSession()
    const r = s.dispatch({ type: 'hack_the_game', playerId: s.currentPlayerId } as unknown as GameAction)
    expect(r.success).toBe(false)
    expect(r.error).toBe('INVALID_ACTION')
  })

  it('动作执行后快照是合法的权威状态', () => {
    const s = makeSession()
    s.dispatch(actionForPlayer(s, 'roll_dice'))
    const snap = s.snapshot()
    // 快照可序列化且哈希稳定
    const rt = JSON.parse(JSON.stringify(snap))
    expect(rt.state.players.length).toBe(2)
    expect(typeof rt.stateHash).toBe('string')
  })

  it('完整推进：掷骰 → 处理落点 → 结束回合 → 轮到下一位', () => {
    const s = makeSession()
    const p0 = s.currentPlayerId
    s.dispatch(actionForPlayer(s, 'roll_dice'))
    // 根据落点，若产生待定动作则继续处理，直至回到"可掷骰"状态
    let guard = 0
    while (s.snapshot().turn.pendingAction !== null && guard < 20) {
      const turn = s.snapshot().turn
      const t = turn.pendingAction
      if (t === 'opportunity') s.dispatch(actionForPlayer(s, 'decline_opportunity'))
      else if (t === 'charity') s.dispatch(actionForPlayer(s, 'handle_charity', { accepted: false }))
      else if (t === 'market') s.dispatch(actionForPlayer(s, 'handle_market'))
      else if (t === 'doodad') s.dispatch(actionForPlayer(s, 'handle_doodad'))
      else if (t === 'story') s.dispatch(actionForPlayer(s, 'handle_story'))
      else if (t === 'need_loan') s.dispatch(actionForPlayer(s, 'decline_opportunity'))
      else break
      guard++
    }
    // 结束当前玩家回合，应轮到 P2
    const beforeEnd = s.currentPlayerId
    s.dispatch(actionForPlayer(s, 'end_turn'))
    expect(s.currentPlayerId).not.toBe(beforeEnd)
    expect(s.currentPlayerId).not.toBe(p0)
  })
})