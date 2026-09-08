import { describe, expect, it } from 'vitest'
import {
  DREAMS,
  DREAM_FUNDING_MONTHS,
  getDreamPassiveIncomeRequirement,
  getRandomDream,
} from '@/data/dreams'
import { createSeededRandom } from '@/engine/randomSource'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'

describe('capital game dream balance', () => {
  it('抽取均匀覆盖所有梦想，价格分布由数据决定', () => {
    const random = createSeededRandom(20260908)
    const counts = new Map(DREAMS.map((dream) => [dream.id, 0]))
    for (let i = 0; i < DREAMS.length * 1000; i += 1) {
      const dream = getRandomDream(random)
      counts.set(dream.id, (counts.get(dream.id) ?? 0) + 1)
    }

    expect([...counts.values()].every((count) => count > 0)).toBe(true)
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThan(180)
    expect(DREAMS.filter((dream) => dream.price <= 200_000)).toHaveLength(5)
    expect(DREAMS.filter((dream) => dream.price <= 250_000)).toHaveLength(6)
  })

  it('梦想胜利需要现金以外的一年被动收入覆盖', () => {
    const dream = DREAMS.find((item) => item.id === 'world-travel')!
    expect(DREAM_FUNDING_MONTHS).toBe(12)
    expect(getDreamPassiveIncomeRequirement(dream)).toBe(Math.ceil(dream.price / 12))
    expect(getDreamPassiveIncomeRequirement(DREAMS.find((item) => item.id === 'space-travel')!)).toBe(83_334)
  })

  it('现金足够但被动收入不足时不能结束资本游戏', () => {
    setActivePinia(createPinia())
    localStorage.clear()
    const store = useGameStore()
    store.startGame(
      { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
      [{ name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' }],
    )
    const player = store.players[0]!
    player.phase = 'fast_track'
    player.cash = 100_000
    player.passiveIncome = 1_000
    player.dream = DREAMS.find((item) => item.id === 'world-travel')
    store.pendingAction = { type: 'fast_track_dream', card: null, message: '' }

    expect(store.buyDream()).toBe(false)
    expect(store.winnerId).toBeNull()
  })
})
