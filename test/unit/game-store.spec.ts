import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { CAREERS } from '@/data/careers'
import type { GameConfig } from '@/types/game'

describe('Game Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(overrides: Partial<GameConfig> = {}): GameConfig {
    return {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
      ...overrides,
    }
  }

  it('should start a game with one player', () => {
    const store = useGameStore()
    const result = store.startGame(createConfig(), [
      { name: 'Test', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    expect(result).toBe(true)
    expect(store.players.length).toBe(1)
    expect(store.currentPlayer).not.toBeNull()
    expect(store.phase).toBe('rat_race')
  })

  it('should create player with career salary and expenses', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const career = CAREERS.find((c) => c.id === 'cleaner')
    expect(career).toBeDefined()
    expect(player.salary).toBe(career!.salary)
    expect(player.cash).toBe(career!.startingCash)
    expect(player.totalIncome).toBe(career!.salary)
    expect(player.totalExpenses).toBeGreaterThan(0)
  })

  it('should calculate cash flow as total income minus total expenses', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    expect(player.cashFlow).toBe(player.totalIncome - player.totalExpenses)
  })

  it('should apply mortgage rule when enabled', () => {
    const store = useGameStore()
    store.startGame(createConfig({ mortgage: true }), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const career = CAREERS.find((c) => c.id === 'cleaner')
    expect(career).toBeDefined()
    expect(player.expenses.mortgage).toBe(Math.round(career!.expenses.mortgage * 1.5))
  })

  it('should apply fast start rule when enabled', () => {
    const store = useGameStore()
    store.startGame(createConfig({ fastStart: true }), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const career = CAREERS.find((c) => c.id === 'cleaner')
    expect(career).toBeDefined()
    expect(player.cash).toBe(career!.salary)
  })

  it('should create liabilities based on career', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Security', colorId: 'red', careerId: 'security-guard', dreamId: '' },
    ])
    const player = store.players[0]
    expect(player.liabilities.length).toBeGreaterThan(0)
    const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)
    expect(totalLiabilities).toBeGreaterThan(0)
  })

  it('should handle payday by increasing cash', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const beforeCash = player.cash
    store.handlePayday(player)
    expect(player.cash).toBe(beforeCash + player.cashFlow)
  })
})
