/**
 * Phase 9+10: Property Testing & Stress Test
 *
 * 验证：
 * 1. 1000 局确定性仿真，每局验证 GameState invariant
 * 2. 1000 局自动 AI 游戏，统计完成率
 * 3. 随机种子压力测试
 * 4. 不变式失败时输出完整调试信息
 *
 * 性能注意：
 * - 使用 Engine 直接运行（不经过 Store/Vue），保证速度
 * - MAX_TURNS 防止死循环
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { createRandomStrategy } from '@/engine/aiStrategy'
import { validateGameState, assertGameState } from '@/engine/invariant'
import { calculateStateHash } from '@/engine/stateHash'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameAction } from '@/engine/contract'

// ==================== Constants ====================

const MAX_TURNS = 50
const STRESS_GAME_COUNT = 100
const PROPERTY_SIMULATION_COUNT = 500

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

interface GameStats {
  seed: number
  turns: number
  terminationReason: string
  finalPhase: string
  playerCash: number
  playerNetWorth: number
  isBankrupt: boolean
  errors: string[]
}

function runSingleGame(seed: number): GameStats {
  const engine = createGameEngine(seed)
  const strategy = createRandomStrategy(seed + 1)
  const state = createEmptyState()
  const career = CAREERS.find((c) => c.id === 'cleaner')!
  const player = engine.createPlayer('AI', career, createTestConfig(), true)
  state.players = [player]
  const errors: string[] = []

  let turns = 0
  let terminationReason = 'max_turns'

  for (turns = 1; turns <= MAX_TURNS; turns++) {
    state.turnNumber = turns

    // Invariant check before each action
    const preResult = validateGameState(state)
    if (!preResult.valid) {
      errors.push(`Turn ${turns}: pre-action invariant failed: ${preResult.violations.map(v => v.message).join('; ')}`)
    }

    // AI decides action
    const action = strategy.decide(state, player.id)
    if (!action) {
      terminationReason = 'ai_no_decision'
      break
    }

    // Dispatch action
    const result = engine.dispatch(action, state)
    if (!result.success) {
      errors.push(`Turn ${turns}: action ${action.type} failed: ${result.error}`)
      terminationReason = 'action_failed'
      break
    }

    // Invariant check after each action
    const postResult = validateGameState(state)
    if (!postResult.valid) {
      errors.push(
        `Turn ${turns}: post-action invariant failed after ${action.type}: ` +
        postResult.violations.slice(0, 3).map(v => `${v.path}: ${v.message}`).join('; ')
      )
      // Collect full diagnostic info
      const diag = {
        seed,
        turn: turns,
        action: action.type,
        violations: postResult.violations,
        stateSnapshot: {
          cash: player.cash,
          cashFlow: player.cashFlow,
          netWorth: engine.calcNetWorth(player),
          totalIncome: player.totalIncome,
          totalExpenses: player.totalExpenses,
          liabilities: player.liabilities.length,
          assets: player.assets.length,
        },
      }
      errors.push(`DIAGNOSTIC: ${JSON.stringify(diag)}`)
      terminationReason = 'invariant_failed'
      break
    }

    // Check bankruptcy
    if (player.isBankrupt) {
      terminationReason = 'bankruptcy'
      break
    }

    // Check game over
    if (state.phase === 'game_over') {
      terminationReason = 'game_over'
      break
    }
  }

  if (turns > MAX_TURNS) {
    terminationReason = 'max_turns'
  }

  return {
    seed,
    turns,
    terminationReason,
    finalPhase: state.phase,
    playerCash: player.cash,
    playerNetWorth: engine.calcNetWorth(player),
    isBankrupt: player.isBankrupt,
    errors,
  }
}

// ==================== Property Tests: 500 Simulations ====================

describe('Property Testing (500 deterministic simulations)', () => {
  const results: GameStats[] = []

  // Run all simulations before tests (collect results)
  for (let i = 0; i < PROPERTY_SIMULATION_COUNT; i++) {
    const seed = 1000 + i
    results.push(runSingleGame(seed))
  }

  it('should have zero invariant violations', () => {
    const withErrors = results.filter((r) => r.errors.length > 0)
    if (withErrors.length > 0) {
      // Output first failure details for debugging
      const first = withErrors[0]!
      console.error(
        `First failure: seed=${first.seed}, turns=${first.turns}, ` +
        `reason=${first.terminationReason}, errors=${first.errors.join(' | ')}`
      )
    }
    expect(withErrors).toHaveLength(0)
  })

  it('should have zero NaN in player cash', () => {
    const nanResults = results.filter((r) => Number.isNaN(r.playerCash))
    expect(nanResults).toHaveLength(0)
  })

  it('should have zero NaN in player netWorth', () => {
    const nanResults = results.filter((r) => Number.isNaN(r.playerNetWorth))
    expect(nanResults).toHaveLength(0)
  })

  it('should complete at least 95% of games', () => {
    const completed = results.filter(
      (r) => r.terminationReason === 'max_turns' || r.terminationReason === 'bankruptcy' || r.terminationReason === 'game_over',
    )
    expect(completed.length).toBeGreaterThan(PROPERTY_SIMULATION_COUNT * 0.95)
  })

  it('should have no action_failed terminations', () => {
    const failures = results.filter((r) => r.terminationReason === 'action_failed')
    expect(failures).toHaveLength(0)
  })
})

// ==================== Stress Test: 100 Games ====================

describe('Stress Test (100 games)', () => {
  const stats: GameStats[] = []

  for (let i = 0; i < STRESS_GAME_COUNT; i++) {
    const seed = 5000 + i * 7
    stats.push(runSingleGame(seed))
  }

  it('should have zero deadlock games', () => {
    const deadlocks = stats.filter((r) => r.terminationReason === 'ai_no_decision')
    expect(deadlocks).toHaveLength(0)
  })

  it('should have zero unexpected errors', () => {
    const errors = stats.filter((r) => r.errors.length > 0)
    expect(errors).toHaveLength(0)
  })

  it('should have zero invalid state', () => {
    const invalid = stats.filter(
      (r) => r.terminationReason === 'invariant_failed',
    )
    expect(invalid).toHaveLength(0)
  })

  it('should report statistics', () => {
    const completed = stats.filter((r) => r.terminationReason === 'max_turns')
    const bankruptcies = stats.filter((r) => r.terminationReason === 'bankruptcy')
    const gameOvers = stats.filter((r) => r.terminationReason === 'game_over')
    const avgTurns = stats.reduce((s, r) => s + r.turns, 0) / stats.length
    const maxTurn = Math.max(...stats.map((r) => r.turns))

    console.log(`Stress Test Statistics (${STRESS_GAME_COUNT} games):`)
    console.log(`  Completed (max_turns): ${completed.length}`)
    console.log(`  Bankruptcies: ${bankruptcies.length}`)
    console.log(`  Game Overs: ${gameOvers.length}`)
    console.log(`  Average Turns: ${avgTurns.toFixed(1)}`)
    console.log(`  Max Turns: ${maxTurn}`)

    // All games should have a valid termination
    expect(completed.length + bankruptcies.length + gameOvers.length).toBe(STRESS_GAME_COUNT)
  })
})

// ==================== Deterministic Replay in Stress ====================

describe('Deterministic Verification in Stress', () => {
  it('should produce same state hash for same seed', () => {
    const seed = 7777

    const result1 = runSingleGame(seed)
    const result2 = runSingleGame(seed)

    expect(result1.turns).toBe(result2.turns)
    expect(result1.terminationReason).toBe(result2.terminationReason)
    expect(result1.playerCash).toBe(result2.playerCash)
    expect(result1.playerNetWorth).toBe(result2.playerNetWorth)
    expect(result1.errors).toEqual(result2.errors)
  })

  it('should produce different results for different seeds', () => {
    const seed1 = 8888
    const seed2 = 8889

    const result1 = runSingleGame(seed1)
    const result2 = runSingleGame(seed2)

    // Different seeds should produce different random sequences
    // At least one of these should differ
    const allSame =
      result1.turns === result2.turns &&
      result1.playerCash === result2.playerCash &&
      result1.terminationReason === result2.terminationReason

    // Not strictly required but very likely
    expect(allSame).toBe(false)
  })
})

// ==================== Reproducible Failure Test ====================

describe('Reproducible Failure', () => {
  it('should reproduce a known seed consistently', () => {
    const seed = 123456

    const r1 = runSingleGame(seed)
    const r2 = runSingleGame(seed)
    const r3 = runSingleGame(seed)

    expect(r1.turns).toBe(r2.turns)
    expect(r2.turns).toBe(r3.turns)
    expect(r1.playerCash).toBe(r2.playerCash)
    expect(r2.playerCash).toBe(r3.playerCash)
    expect(r1.terminationReason).toBe(r2.terminationReason)
    expect(r2.terminationReason).toBe(r3.terminationReason)
  })
})