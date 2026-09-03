/**
 * Phase 4: Simulation Isolation Tests
 *
 * 验证：
 * 1. simulate() 不修改原始 GameState
 * 2. 多个分支互不污染
 * 3. SimulationResult 字段完整
 * 4. 失败分支不影响其他分支
 */

import { describe, expect, it } from 'vitest'
import { createSimulationEngine, SimulationEngine } from '@/engine/simulation'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { calculateStateHash } from '@/engine/stateHash'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameAction, SimulationBranch } from '@/engine/contract'

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

// ==================== Simulation Isolation Tests ====================

describe('Simulation Isolation', () => {
  it('should not modify base state after simulate()', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const baseHash = calculateStateHash(state)
    const baseCash = player.cash

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      { type: 'handle_payday', playerId: player.id },
      { type: 'end_turn', playerId: player.id },
    ]

    const result = simEngine.simulate(state, actions)

    // Base state must be unchanged
    expect(calculateStateHash(state)).toBe(baseHash)
    expect(player.cash).toBe(baseCash)
    expect(result.success).toBe(true)
  })

  it('should not modify base state after simulateBranches()', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const baseHash = calculateStateHash(state)

    const branches: SimulationBranch[] = [
      { id: 'a', label: 'Payday only', actions: [{ type: 'handle_payday', playerId: player.id }] },
      { id: 'b', label: 'Loan + Payday', actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
        { type: 'handle_payday', playerId: player.id },
      ]},
    ]

    simEngine.simulateBranches(state, branches)

    // Base state must be unchanged
    expect(calculateStateHash(state)).toBe(baseHash)
  })

  it('should not modify base state after evaluatePlayerActions()', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const baseHash = calculateStateHash(state)

    simEngine.evaluatePlayerActions(state, player.id, [
      { label: 'Payday', action: { type: 'handle_payday', playerId: player.id } },
      { label: 'Loan $500', action: { type: 'take_bank_loan', playerId: player.id, amount: 500 } },
    ])

    expect(calculateStateHash(state)).toBe(baseHash)
  })

  it('should produce different results for different branches', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const branches: SimulationBranch[] = [
      { id: 'payday', label: 'Payday', actions: [{ type: 'handle_payday', playerId: player.id }] },
      { id: 'loan', label: 'Loan', actions: [{ type: 'take_bank_loan', playerId: player.id, amount: 5000 }] },
    ]

    const results = simEngine.simulateBranches(state, branches)

    expect(results).toHaveLength(2)

    // Payday branch: cash should increase by cashFlow
    const paydayResult = results[0]!.result!
    expect(paydayResult.success).toBe(true)
    const paydayPlayer = paydayResult.playerResults[0]!
    expect(paydayPlayer.cashChange).toBeGreaterThanOrEqual(0)

    // Loan branch: cash should increase by loan amount
    const loanResult = results[1]!.result!
    expect(loanResult.success).toBe(true)
    const loanPlayer = loanResult.playerResults[0]!
    expect(loanPlayer.cashChange).toBe(5000)

    // Branches should produce different final states
    const paydayHash = calculateStateHash(paydayResult.finalState)
    const loanHash = calculateStateHash(loanResult.finalState)
    expect(paydayHash).not.toBe(loanHash)
  })

  it('should handle failed actions gracefully', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const baseHash = calculateStateHash(state)

    const result = simEngine.simulate(state, [
      { type: 'take_bank_loan', playerId: 'nonexistent', amount: 1000 },
    ])

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.actionsExecuted).toBe(0)
    expect(calculateStateHash(state)).toBe(baseHash)
  })

  it('should have complete SimulationResult fields', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const result = simEngine.simulate(state, [
      { type: 'handle_payday', playerId: player.id },
      { type: 'end_turn', playerId: player.id },
    ])

    expect(result.success).toBe(true)
    expect(result.finalState).toBeDefined()
    expect(result.playerResults).toHaveLength(1)
    expect(result.actionsExecuted).toBe(2)
    expect(result.error).toBeUndefined()

    const pr = result.playerResults[0]!
    expect(pr.playerId).toBe(player.id)
    expect(typeof pr.cashBefore).toBe('number')
    expect(typeof pr.cashAfter).toBe('number')
    expect(typeof pr.cashChange).toBe('number')
    expect(typeof pr.netWorthBefore).toBe('number')
    expect(typeof pr.netWorthAfter).toBe('number')
    expect(typeof pr.netWorthChange).toBe('number')
    expect(typeof pr.cashFlowBefore).toBe('number')
    expect(typeof pr.cashFlowAfter).toBe('number')
    expect(typeof pr.cashFlowChange).toBe('number')
    expect(typeof pr.actionsExecuted).toBe('undefined')
  })

  it('should isolate branch state from each other', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    // Branch A: take loan, then payday
    const branchA: SimulationBranch = {
      id: 'a',
      label: 'Loan then Payday',
      actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
        { type: 'handle_payday', playerId: player.id },
      ],
    }

    // Branch B: only payday
    const branchB: SimulationBranch = {
      id: 'b',
      label: 'Payday only',
      actions: [
        { type: 'handle_payday', playerId: player.id },
      ],
    }

    const results = simEngine.simulateBranches(state, [branchA, branchB])

    const resultA = results[0]!.result!
    const resultB = results[1]!.result!

    // Branch A should have more cash than Branch B (loan + payday vs just payday)
    const cashA = resultA.playerResults[0]!.cashAfter
    const cashB = resultB.playerResults[0]!.cashAfter
    expect(cashA).toBeGreaterThan(cashB)

    // Branch A should have 1 more liability than Branch B
    const liabilityCountA = resultA.playerResults[0]!.liabilityCountAfter
    const liabilityCountB = resultB.playerResults[0]!.liabilityCountAfter
    expect(liabilityCountA).toBe(liabilityCountB + 1)
  })

  it('should handle empty action list', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const result = simEngine.simulate(state, [])

    expect(result.success).toBe(true)
    expect(result.actionsExecuted).toBe(0)
    expect(result.playerResults).toHaveLength(1)
    // No changes
    expect(result.playerResults[0]!.cashChange).toBe(0)
  })

  it('should produce deterministic simulation with same seed', () => {
    const engine1 = createGameEngine(42)
    const simEngine1 = createSimulationEngine(engine1, 999)
    const state1 = createEmptyState()
    const player1 = createTestPlayer(engine1)
    state1.players = [player1]

    const engine2 = createGameEngine(42)
    const simEngine2 = createSimulationEngine(engine2, 999)
    const state2 = createEmptyState()
    const player2 = createTestPlayer(engine2)
    state2.players = [player2]

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player1.id },
      { type: 'handle_payday', playerId: player1.id },
      { type: 'take_bank_loan', playerId: player1.id, amount: 500 },
      { type: 'end_turn', playerId: player1.id },
    ]

    const result1 = simEngine1.simulate(state1, actions)
    const result2 = simEngine2.simulate(state2, actions)

    expect(calculateStateHash(result1.finalState)).toBe(calculateStateHash(result2.finalState))
  })

  it('should compare and rank branches correctly', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const branches: SimulationBranch[] = [
      { id: 'small-loan', label: 'Small Loan', actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 500 },
      ]},
      { id: 'big-loan', label: 'Big Loan', actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 5000 },
      ]},
      { id: 'payday', label: 'Payday', actions: [
        { type: 'handle_payday', playerId: player.id },
      ]},
    ]

    simEngine.simulateBranches(state, branches)
    const comparisons = simEngine.compareBranches(branches)

    expect(comparisons).toHaveLength(3)
    // Payday ranks highest: positive netWorthChange, no cashFlow penalty
    // Loans have zero netWorthChange (cash = liability) and negative cashFlowChange
    expect(comparisons[0]!.branchId).toBe('payday')
    expect(comparisons[0]!.rank).toBe(1)
    expect(comparisons[1]!.rank).toBe(2)
    expect(comparisons[2]!.rank).toBe(3)
  })

  it('should return best branch via getBestBranch', () => {
    const engine = createGameEngine(42)
    const simEngine = createSimulationEngine(engine, 100)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const branches: SimulationBranch[] = [
      { id: 'a', label: 'Loan $500', actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 500 },
      ]},
      { id: 'b', label: 'Loan $5000', actions: [
        { type: 'take_bank_loan', playerId: player.id, amount: 5000 },
      ]},
    ]

    simEngine.simulateBranches(state, branches)
    const best = simEngine.getBestBranch(branches)

    expect(best).not.toBeNull()
    expect(best!.id).toBe('b')
  })
})