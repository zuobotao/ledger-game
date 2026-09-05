import { describe, it, expect } from 'vitest'
import { createGameHost } from '../../server/game/headlessStore'
import { buildGameState, buildTurnContext } from '../../server/game/snapshot'
import { calculateStateHash } from '@/engine/stateHash'
import type { GameConfig } from '@/types/game'

const SETUPS = [
  { name: '小明', colorId: 'blue' as const, careerId: 'programmer', dreamId: 'beach-house' },
  { name: '小红', colorId: 'red' as const, careerId: 'doctor', dreamId: 'charity-foundation' },
]

function makeConfig(playerCount: number): GameConfig {
  return {
    playerCount,
    insurance: false,
    bigFamily: false,
    mortgage: false,
    fastStart: false,
    ageLimit: true,
  }
}

describe('无头游戏宿主', () => {
  it('可在无浏览器环境实例化 store 并空跑', () => {
    const { store } = createGameHost()
    expect(store.phase).toBe('setup')
    expect(store.players).toHaveLength(0)
  })

  it('双人 startGame 初始化玩家与回合上下文', () => {
    const { store } = createGameHost()
    const ok = store.startGame(makeConfig(2), SETUPS)
    expect(ok).toBe(true)
    expect(store.players).toHaveLength(2)
    expect(store.phase).toBe('rat_race')
    expect(store.currentPlayerIndex).toBe(0)
    expect(store.currentPlayer?.name).toBe('小明')
  })

  it('saveState 产出完整可序列化 GameState', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(2), SETUPS)
    const state = buildGameState(store)
    expect(state.players).toHaveLength(2)
    expect(state.phase).toBe('rat_race')
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.config.playerCount).toBe(2)
    // 往返序列化无损
    const roundTrip = JSON.parse(JSON.stringify(state))
    expect(roundTrip.players[0].name).toBe('小明')
  })

  it('buildTurnContext 反映当前玩家与待定动作', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(2), SETUPS)
    const turn = buildTurnContext(store)
    expect(turn.currentPlayerId).toBe(store.players[0].id)
    expect(turn.pendingAction).toBeNull()
    expect(turn.allowedActions).toContain('roll_dice')
  })

  it('状态哈希在序列化往返后保持一致', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(2), SETUPS)
    const a = buildGameState(store)
    const b = JSON.parse(JSON.stringify(a))
    expect(calculateStateHash(a)).toBe(calculateStateHash(b))
  })

  it('独立宿主互不串扰', () => {
    const hostA = createGameHost()
    const hostB = createGameHost()
    hostA.store.startGame(makeConfig(2), SETUPS)
    expect(hostB.store.players).toHaveLength(0)
    expect(hostA.store.players).toHaveLength(2)
  })
})