import { describe, it, expect } from 'vitest'
import { createGameHost } from '../../server/game/headlessStore'
import type { GameConfig } from '@/types/game'
import { START_AGE } from '@/types/game'

const P0 = { name: '小明', colorId: 'blue' as const, careerId: 'programmer', dreamId: 'beach-house' }
const P1 = { name: '小红', colorId: 'red' as const, careerId: 'doctor', dreamId: 'charity-foundation' }

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

// v2.4.1 P0-1：Time / Age / Turn 一致性。
// 年龄权威来源为玩家自身 ageMonths，按玩家各自 payday 独立推进，不允许随玩家数翻倍。
describe('v2.4.1 时间/年龄模型', () => {
  it('payday 推进当前玩家 ageMonths 且与 gameMonth 同步', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(1), [P0])
    const p = store.players[0]
    expect(p.ageMonths).toBe(0)
    expect(store.gameMonth).toBe(0)
    expect(store.currentPlayerAge.totalMonths).toBe(0)
    expect(store.currentPlayerAge.years).toBe(START_AGE)

    store.handlePayday(p)

    expect(p.ageMonths).toBe(1)
    expect(store.gameMonth).toBe(1)
    expect(store.currentPlayerAge.totalMonths).toBe(1)
    expect(store.currentPlayerAge.months).toBe(1)
    expect(store.currentPlayerAge.years).toBe(START_AGE)

    // 多次 payday 持续递增
    store.handlePayday(p)
    expect(p.ageMonths).toBe(2)
    expect(store.currentPlayerAge.totalMonths).toBe(2)
  })

  it('多人：任一玩家 payday 只推进该玩家年龄，世界时钟不随玩家数翻倍', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(2), [P0, P1])
    const [p0, p1] = store.players

    store.handlePayday(p0)
    expect(p0.ageMonths).toBe(1)
    expect(p1.ageMonths).toBe(0) // 另一名玩家不受影响

    store.handlePayday(p1)
    expect(p1.ageMonths).toBe(1)
    expect(p0.ageMonths).toBe(1) // 既不会被 p1 的 payday 翻倍，也不共享递增
    // 世界时钟不与玩家数成正比（两名玩家各老 1 月，不会累加为 2）
    expect(store.gameMonth).toBe(1)
  })

  it('年龄显示按当前玩家推导（多人切换不串号）', () => {
    const { store } = createGameHost()
    store.startGame(makeConfig(2), [P0, P1])
    const [p0, p1] = store.players

    // p0 已老化 6 个月
    for (let i = 0; i < 6; i++) store.handlePayday(p0)
    expect(p0.ageMonths).toBe(6)
    expect(store.currentPlayerAge.totalMonths).toBe(6)

    // 不与 gameMonth 或另一玩家耦合
    expect(p1.ageMonths).toBe(0)
    expect(store.currentPlayerAge.totalMonths).toBe(6)
  })
})