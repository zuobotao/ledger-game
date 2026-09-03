import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

describe('Financial Calculation Regression', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(): GameConfig {
    return {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
  }

  it('should keep net worth consistent after payday', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const beforeNetWorth = store.calcPlayerNetWorth(player)
    store.handlePayday(player)
    const afterNetWorth = store.calcPlayerNetWorth(player)
    expect(afterNetWorth).toBe(beforeNetWorth + player.cashFlow)
  })

  it('should recalculate financials after liability change', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const beforeExpenses = player.totalExpenses
    store.takeBankLoan(1000)
    expect(player.totalExpenses).toBeGreaterThan(beforeExpenses)
  })
})
