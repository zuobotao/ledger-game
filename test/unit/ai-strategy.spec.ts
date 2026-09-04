/**
 * Phase 6: AI Strategy Tests
 *
 * 验证：
 * 1. RandomStrategy 产生合法 GameAction
 * 2. ConservativeStrategy 产生合法 GameAction
 * 3. BalancedStrategy 产生合法 GameAction
 * 4. AggressiveStrategy 产生合法 GameAction
 * 5. AI 产生的 Action 通过 AIValidator
 * 6. AI 不直接修改 GameState
 * 7. 策略确定性（相同 seed 产生相同决策）
 */

import { describe, expect, it } from 'vitest'
import {
  RandomStrategy,
  PolicyBasedStrategy,
  createRandomStrategy,
  createConservativeStrategy,
  createBalancedStrategy,
  createAggressiveStrategy,
  type AIStrategy,
} from '@/engine/aiStrategy'
import { validateAIAction } from '@/engine/aiValidator'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { calculateStateHash } from '@/engine/stateHash'
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

// ==================== RandomStrategy Tests ====================

describe('RandomStrategy', () => {
  it('should have name', () => {
    const strategy = createRandomStrategy()
    expect(strategy.name).toBe('Random')
  })

  it('should return null for non-existent player', () => {
    const strategy = createRandomStrategy()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const action = strategy.decide(state, 'nonexistent')
    expect(action).toBeNull()
  })

  it('should produce a valid action', () => {
    const strategy = createRandomStrategy(42)
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const action = strategy.decide(state, player.id)
    expect(action).not.toBeNull()
    if (action) {
      const validation = validateAIAction(action, state)
      expect(validation.valid).toBe(true)
    }
  })

  it('should be deterministic with same seed', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const strategy1 = createRandomStrategy(42)
    const strategy2 = createRandomStrategy(42)

    const action1 = strategy1.decide(state, player.id)
    const action2 = strategy2.decide(state, player.id)

    expect(action1).toEqual(action2)
  })

  it('should not modify game state', () => {
    const strategy = createRandomStrategy(42)
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const hashBefore = calculateStateHash(state)
    strategy.decide(state, player.id)
    const hashAfter = calculateStateHash(state)

    // AI should not modify state
    expect(hashBefore).toBe(hashAfter)
  })
})

// ==================== PolicyBasedStrategy Tests ====================

describe('PolicyBasedStrategy', () => {
  it('Conservative should have name', () => {
    expect(createConservativeStrategy().name).toBe('Conservative')
  })

  it('Balanced should have name', () => {
    expect(createBalancedStrategy().name).toBe('Balanced')
  })

  it('Aggressive should have name', () => {
    expect(createAggressiveStrategy().name).toBe('Aggressive')
  })

  it('Conservative should produce valid action', () => {
    const strategy = createConservativeStrategy(42)
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const action = strategy.decide(state, player.id)
    expect(action).not.toBeNull()
    if (action) {
      const validation = validateAIAction(action, state)
      expect(validation.valid).toBe(true)
    }
  })

  it('Balanced should produce valid action', () => {
    const strategy = createBalancedStrategy(42)
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const action = strategy.decide(state, player.id)
    expect(action).not.toBeNull()
    if (action) {
      const validation = validateAIAction(action, state)
      expect(validation.valid).toBe(true)
    }
  })

  it('Aggressive should produce valid action', () => {
    const strategy = createAggressiveStrategy(42)
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const action = strategy.decide(state, player.id)
    expect(action).not.toBeNull()
    if (action) {
      const validation = validateAIAction(action, state)
      expect(validation.valid).toBe(true)
    }
  })

  it('should not modify game state', () => {
    const strategies = [
      createConservativeStrategy(42),
      createBalancedStrategy(42),
      createAggressiveStrategy(42),
    ]

    for (const strategy of strategies) {
      const engine = createGameEngine(42)
      const state = createEmptyState()
      const player = createTestPlayer(engine)
      state.players = [player]

      const hashBefore = calculateStateHash(state)
      strategy.decide(state, player.id)
      const hashAfter = calculateStateHash(state)
      expect(hashBefore).toBe(hashAfter)
    }
  })

  it('should be deterministic with same seed', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const s1 = createBalancedStrategy(42)
    const s2 = createBalancedStrategy(42)

    expect(s1.decide(state, player.id)).toEqual(s2.decide(state, player.id))
  })

  it('all strategies should implement AIStrategy interface', () => {
    const strategies: AIStrategy[] = [
      createRandomStrategy(),
      createConservativeStrategy(),
      createBalancedStrategy(),
      createAggressiveStrategy(),
    ]

    expect(strategies).toHaveLength(4)
    for (const s of strategies) {
      expect(typeof s.name).toBe('string')
      expect(typeof s.decide).toBe('function')
    }
  })
})

// ==================== AIValidator Integration Tests ====================

describe('AI Validator Integration', () => {
  it('should reject action with invalid playerId', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const result = validateAIAction(
      { type: 'roll_dice', playerId: 'nonexistent' },
      state,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should reject take_bank_loan with negative amount', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const result = validateAIAction(
      { type: 'take_bank_loan', playerId: player.id, amount: -100 },
      state,
    )
    expect(result.valid).toBe(false)
  })

  it('should accept valid roll_dice action', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const result = validateAIAction(
      { type: 'roll_dice', playerId: player.id },
      state,
    )
    expect(result.valid).toBe(true)
  })
})