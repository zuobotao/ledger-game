import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

describe('Game Over Conditions', () => {
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
      fastStart: true,
      ageLimit: true,
    }
  }

  it('should declare bankruptcy when cash is deeply negative', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    player.cash = -100000
    store.recalcPlayerFinancials(player)
    store.declareBankruptcy()
    expect(player.isBankrupt).toBe(true)
  })

  it('should reset game state', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    store.resetGame()
    expect(store.players.length).toBe(0)
    expect(store.phase).toBe('setup')
    expect(store.currentPlayer).toBeNull()
  })
})
