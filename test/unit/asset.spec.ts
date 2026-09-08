import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig, OpportunityCard } from '@/types/game'

describe('Asset Operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(playerCount = 1): GameConfig {
    return {
      playerCount,
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

  function createRealEstateCard(): OpportunityCard {
    return {
      id: 'test-real-estate',
      type: 'real_estate',
      size: 'small',
      title: 'Test Rental',
      description: 'Test rental',
      cost: 5000,
      downPayment: 5000,
      totalValue: 50000,
      cashFlow: 220,
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

  it('should cap real estate purchases at one unit even when a larger quantity is requested', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    player.cash = 10000
    const beforeCash = player.cash
    store.setPending('opportunity', 'test', createRealEstateCard())

    expect(store.buyOpportunity(3)).toBe(true)
    const asset = player.assets.find((a) => a.type === 'real_estate')
    expect(asset?.quantity).toBe(1)
    expect(player.cash).toBe(beforeCash - 5000)
    expect(player.passiveIncome).toBe(220)
  })

  it('should auction a multiplayer opportunity to the strongest affordable bidder', () => {
    const store = useGameStore()
    store.startGame(createConfig(2), [
      { name: '发现者', colorId: 'red', careerId: 'cleaner', dreamId: '' },
      { name: '竞得者', colorId: 'blue', careerId: 'doctor', dreamId: '' },
    ])
    const seller = store.players[0]!
    const bidder = store.players[1]!
    bidder.cash = 30_000
    const sellerCash = seller.cash
    const card = createRealEstateCard()
    store.setPending('opportunity', '多人机会', card)

    expect(store.auctionOpportunity()).toBe(true)
    expect(store.players[1]!.assets.some((asset) => asset.type === 'real_estate')).toBe(true)
    expect(store.players[0]!.cash).toBeGreaterThan(sellerCash)
    expect(store.pendingAction.type).toBeNull()
  })
})
