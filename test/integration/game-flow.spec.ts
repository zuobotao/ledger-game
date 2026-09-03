import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

describe('Game Flow Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(): GameConfig {
    return {
      playerCount: 2,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: true,
      ageLimit: true,
    }
  }

  it('should start a two-player game and advance turns', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Alice', colorId: 'red', careerId: 'cleaner', dreamId: '' },
      { name: 'Bob', colorId: 'blue', careerId: 'security-guard', dreamId: '' },
    ])
    expect(store.players.length).toBe(2)
    expect(store.currentPlayerIndex).toBe(0)
    const firstPlayer = store.currentPlayer
    store.endTurn()
    expect(store.currentPlayerIndex).toBe(1)
    expect(store.currentPlayer).not.toEqual(firstPlayer)
  })
})
