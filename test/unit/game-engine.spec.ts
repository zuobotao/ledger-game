import { describe, expect, it, beforeEach } from 'vitest'
import { createGameEngine } from '@/engine/gameEngine'
import { createSeededRandom } from '@/engine/randomSource'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig } from '@/types/game'

function createTestConfig(): GameConfig {
  return {
    playerCount: 1,
    insurance: false,
    bigFamily: false,
    mortgage: false,
    fastStart: true,
    ageLimit: true,
  }
}

function createEmptyState(): GameState {
  return {
    players: [],
    currentPlayerIndex: 0,
    phase: 'rat_race',
    config: createTestConfig(),
    winnerId: null,
    turnStatus: 'idle',
    lastRoll: 0,
    turnNumber: 1,
    gameMonth: 0,
    pendingAction: { type: null, card: null, message: '' },
    decks: undefined,
    transactions: [],
    cardHistory: [],
  }
}

describe('GameEngine', () => {
  let engine: ReturnType<typeof createGameEngine>

  beforeEach(() => {
    engine = createGameEngine(42)
  })

  it('should create engine with seed', () => {
    expect(engine.gameId).toBeTruthy()
    expect(engine.random).toBeDefined()
  })

  it('should produce deterministic dice rolls with same seed', () => {
    const e1 = createGameEngine(42)
    const e2 = createGameEngine(42)
    const rolls1 = e1.diceRoll('p1', 5)
    const rolls2 = e2.diceRoll('p1', 5)
    expect(rolls1).toEqual(rolls2)
  })

  it('should create a player with correct career data', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    expect(player.name).toBe('Test')
    expect(player.salary).toBe(career.salary)
    expect(player.cash).toBe(career.salary) // fastStart
    expect(player.cashFlow).toBeGreaterThan(0)
    expect(player.phase).toBe('rat_race')
  })

  it('should handle payday and increase cash', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const state = createEmptyState()
    state.players = [player]
    const beforeCash = player.cash
    const result = engine.dispatch({ type: 'handle_payday', playerId: player.id }, state)
    expect(result.success).toBe(true)
    expect(player.cash).toBe(beforeCash + player.cashFlow)
  })

  it('should handle bank loan', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const state = createEmptyState()
    state.players = [player]
    const beforeCash = player.cash
    const result = engine.dispatch({ type: 'take_bank_loan', playerId: player.id, amount: 1000 }, state)
    expect(result.success).toBe(true)
    expect(player.cash).toBe(beforeCash + 1000)
    expect(player.liabilities.some((l) => l.category === 'bank_loan')).toBe(true)
  })

  it('should reject invalid loan amount', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const state = createEmptyState()
    state.players = [player]
    const result = engine.dispatch({ type: 'take_bank_loan', playerId: player.id, amount: 0 }, state)
    expect(result.success).toBe(false)
  })

  it('should repay bank loan', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const state = createEmptyState()
    state.players = [player]
    engine.dispatch({ type: 'take_bank_loan', playerId: player.id, amount: 1000 }, state)
    const loan = player.liabilities.find((l) => l.category === 'bank_loan')!
    const beforeCash = player.cash
    const result = engine.dispatch({ type: 'repay_bank_loan', playerId: player.id, liabilityId: loan.id, amount: 500 }, state)
    expect(result.success).toBe(true)
    expect(player.cash).toBe(beforeCash - 500)
  })

  it('should log events', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const state = createEmptyState()
    state.players = [player]
    engine.dispatch({ type: 'handle_payday', playerId: player.id }, state)
    engine.dispatch({ type: 'take_bank_loan', playerId: player.id, amount: 1000 }, state)
    const eventLog = engine.getEventLog()
    expect(eventLog.events.length).toBe(2)
    expect(eventLog.events[0].type).toBe('payday_received')
    expect(eventLog.events[1].type).toBe('bank_loan_taken')
  })

  it('should calculate net worth', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    const netWorth = engine.calcNetWorth(player)
    expect(netWorth).toBeGreaterThan(0)
  })

  it('should check fast track eligibility', () => {
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    expect(engine.checkFastTrackEligibility(player)).toBe(false)
    player.passiveIncome = player.totalExpenses + 100
    expect(engine.checkFastTrackEligibility(player)).toBe(true)
  })
})