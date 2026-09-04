/**
 * Phase 8: GameState Invariant Tests
 *
 * 验证 validateGameState 和 assertGameState：
 * 1. 合法状态通过验证
 * 2. NaN 值被检测
 * 3. 负数被检测
 * 4. 财务不一致被检测
 * 5. 游戏级非法状态被检测
 * 6. assertGameState 在违规时抛出
 */

import { describe, expect, it } from 'vitest'
import {
  validateGameState,
  assertGameState,
  quickValidateState,
  type InvariantResult,
} from '@/engine/invariant'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'

// ==================== Helpers ====================

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

function createTestPlayer(engine: GameEngine): Player {
  const career = CAREERS.find((c) => c.id === 'cleaner')!
  return engine.createPlayer('Test', career, createTestConfig(), false)
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ==================== Tests ====================

describe('validateGameState', () => {
  it('should pass for valid state', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]

    const result = validateGameState(state)
    expect(result.valid).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('should pass for empty state (no players)', () => {
    const state = createEmptyState()
    const result = validateGameState(state)
    expect(result.valid).toBe(true)
  })

  it('should detect NaN in player cash', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cash = NaN
    state.players = [player]

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path.includes('cash'))).toBe(true)
  })

  it('should detect NaN in player cashFlow', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cashFlow = NaN
    state.players = [player]

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
  })

  it('should detect NaN in asset cost', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.assets.push({
      id: 'test',
      name: 'Test',
      type: 'stock',
      cost: NaN,
      cashFlow: 0,
      quantity: 1,
      symbol: undefined,
      marketPrice: undefined,
      loanAmount: undefined,
      monthlyLoanPayment: undefined,
    })
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path.includes('cost'))).toBe(true)
  })

  it('should detect NaN in liability amount', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.liabilities[0]!.amount = NaN
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path.includes('amount'))).toBe(true)
  })

  it('should detect negative childrenCount', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.childrenCount = -1
    state.players = [player]

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.message.includes('childrenCount'))).toBe(true)
  })

  it('should detect negative asset quantity', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.assets.push({
      id: 'test',
      name: 'Test',
      type: 'stock',
      cost: 100,
      cashFlow: 0,
      quantity: -5,
      symbol: undefined,
      marketPrice: undefined,
      loanAmount: undefined,
      monthlyLoanPayment: undefined,
    })
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.message.includes('quantity'))).toBe(true)
  })

  it('should detect negative liability amount', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.liabilities[0]!.amount = -100
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.message.includes('Liability amount'))).toBe(true)
  })

  it('should detect invalid phase', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]
    state.phase = 'invalid_phase' as GameState['phase']

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path === 'phase')).toBe(true)
  })

  it('should detect invalid currentPlayerIndex', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]
    state.currentPlayerIndex = 5

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path === 'currentPlayerIndex')).toBe(true)
  })

  it('should detect missing winner player', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]
    state.winnerId = 'nonexistent'

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path === 'winnerId')).toBe(true)
  })

  it('should detect game_over without endReason', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]
    state.phase = 'game_over'

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path === 'gameEndReason')).toBe(true)
  })

  it('should detect financial inconsistency (cashFlow)', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    // Deliberately break cashFlow = totalIncome - totalExpenses
    player.cashFlow = player.totalIncome - player.totalExpenses + 1000
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path.includes('cashFlow'))).toBe(true)
  })

  it('should detect financial inconsistency (totalIncome)', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.totalIncome = player.salary + player.passiveIncome + 500
    state.players = [player]

    const result = validateGameState(state, 'full')
    expect(result.valid).toBe(false)
    expect(result.violations.some((v) => v.path.includes('totalIncome'))).toBe(true)
  })

  it('should detect invalid lastRoll (> 12)', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]
    state.lastRoll = 13

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
  })

  it('should detect non-finite values', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cash = Infinity
    state.players = [player]

    const result = validateGameState(state)
    expect(result.valid).toBe(false)
  })
})

describe('assertGameState', () => {
  it('should not throw for valid state', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]

    expect(() => assertGameState(state)).not.toThrow()
  })

  it('should throw with detailed message for invalid state', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cash = NaN
    state.players = [player]

    expect(() => assertGameState(state)).toThrow(/GameState invariant violation/)
    expect(() => assertGameState(state)).toThrow(/NaN/)
  })
})

describe('quickValidateState', () => {
  it('should return true for valid state', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    state.players = [createTestPlayer(engine)]

    expect(quickValidateState(state)).toBe(true)
  })

  it('should return false for NaN in basic check', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cash = NaN
    state.players = [player]

    expect(quickValidateState(state)).toBe(false)
  })

  it('should return true for financial inconsistency in basic check', () => {
    // Financial inconsistency is only checked in full mode
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    player.cashFlow = 99999
    state.players = [player]

    expect(quickValidateState(state)).toBe(true)
  })
})