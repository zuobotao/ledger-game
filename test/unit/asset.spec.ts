import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig, OpportunityCard } from '@/types/game'

describe('Asset Operations', () => {
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

  function createStockCard(symbol: string, cost: number): OpportunityCard {
    return {
      id: 'test-stock',
      type: 'stock',
      size: 'small',
      title: 'Test Stock',
      description: 'Test',
      symbol,
      cost,
      cashFlow: 0,
      quantity: 1,
    } as OpportunityCard
  }

  it('should buy stock and create asset', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const beforeCash = player.cash
    store.setPending('opportunity', 'test', createStockCard('NOVA', 10))
    const result = store.tradeBuyStock(10)
    expect(result).toBe(true)
    const asset = player.assets.find((a) => a.type === 'stock' && a.symbol === 'NOVA')
    expect(asset).toBeDefined()
    expect(asset!.quantity).toBe(10)
    expect(player.cash).toBe(beforeCash - 100)
  })

  it('should reject buying stock with insufficient cash', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    store.setPending('opportunity', 'test', createStockCard('NOVA', 10000))
    const result = store.tradeBuyStock(10)
    expect(result).toBe(false)
  })

  it('should update existing stock quantity when buying more', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    store.setPending('opportunity', 'test', createStockCard('NOVA', 10))
    store.tradeBuyStock(5)
    store.setPending('opportunity', 'test', createStockCard('NOVA', 20))
    store.tradeBuyStock(5)
    const asset = store.players[0].assets.find((a) => a.type === 'stock' && a.symbol === 'NOVA')
    expect(asset).toBeDefined()
    expect(asset!.quantity).toBe(10)
  })
})
