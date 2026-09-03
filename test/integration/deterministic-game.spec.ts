/**
 * Phase 2: Deterministic Game Integration Test
 *
 * 验证：
 * 相同初始状态 + 相同 Seed + 相同 Action Sequence = 相同最终状态
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine } from '@/engine/gameEngine'
import { createSeededRandom } from '@/engine/randomSource'
import { createBankLoan } from '@/engine/loanEngine'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameAction } from '@/engine/contract'

function createTestConfig(): GameConfig {
  return {
    playerCount: 1, insurance: false, bigFamily: false,
    mortgage: false, fastStart: true, ageLimit: true,
  }
}

function createStateWithPlayer(seed: number): GameState {
  const engine = createGameEngine(seed)
  const career = CAREERS.find((c) => c.id === 'cleaner')!
  const player = engine.createPlayer('Test', career, createTestConfig(), false)
  return {
    players: [player], currentPlayerIndex: 0, phase: 'rat_race',
    config: createTestConfig(), winnerId: null, turnStatus: 'idle',
    lastRoll: 0, turnNumber: 1, gameMonth: 0,
    pendingAction: { type: null, card: null, message: '' },
    decks: undefined, transactions: [], cardHistory: [],
  }
}

/** 执行一系列操作并返回最终状态 */
function runActions(seed: number, actions: GameAction[]): GameState {
  const engine = createGameEngine(seed)
  const state = createStateWithPlayer(seed)

  for (const action of actions) {
    engine.dispatch(action, state)
  }
  return state
}

/** 计算状态的简单哈希（只包含关键字段） */
function stateHash(state: GameState): string {
  const keyFields = state.players.map((p) => ({
    id: p.id,
    cash: p.cash,
    savings: p.savings,
    passiveIncome: p.passiveIncome,
    totalIncome: p.totalIncome,
    totalExpenses: p.totalExpenses,
    cashFlow: p.cashFlow,
    ratRacePosition: p.ratRacePosition,
    phase: p.phase,
    isBankrupt: p.isBankrupt,
    isUnemployed: p.isUnemployed,
    childrenCount: p.childrenCount,
    assetCount: p.assets.length,
    liabilityCount: p.liabilities.length,
  }))

  return JSON.stringify({
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    turnNumber: state.turnNumber,
    lastRoll: state.lastRoll,
    players: keyFields,
  })
}

describe('Deterministic Game', () => {
  it('should produce same final state with same seed and actions', () => {
    const seed = 100
    const playerId = createStateWithPlayer(seed).players[0]!.id

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId },
      { type: 'handle_payday', playerId },
      { type: 'take_bank_loan', playerId, amount: 500 },
      { type: 'handle_payday', playerId },
      { type: 'handle_payday', playerId },
      { type: 'handle_payday', playerId },
      { type: 'handle_payday', playerId },
      { type: 'handle_payday', playerId },
      { type: 'end_turn', playerId },
    ]

    const state1 = runActions(seed, actions)
    const state2 = runActions(seed, actions)

    const hash1 = stateHash(state1)
    const hash2 = stateHash(state2)

    expect(hash1).toBe(hash2)
  })

  it('should produce different state with different seed', () => {
    const seed1 = 100
    const seed2 = 101
    const playerId1 = createStateWithPlayer(seed1).players[0]!.id
    const playerId2 = createStateWithPlayer(seed2).players[0]!.id

    const actions1: GameAction[] = [
      { type: 'roll_dice', playerId: playerId1 },
      { type: 'handle_payday', playerId: playerId1 },
    ]

    const actions2: GameAction[] = [
      { type: 'roll_dice', playerId: playerId2 },
      { type: 'handle_payday', playerId: playerId2 },
    ]

    const state1 = runActions(seed1, actions1)
    const state2 = runActions(seed2, actions2)

    // Player IDs should be different (generated from different seeds)
    expect(state1.players[0]!.id).not.toBe(state2.players[0]!.id)
  })

  it('should produce deterministic dice rolls across runs', () => {
    const seed = 42
    const playerId = createStateWithPlayer(seed).players[0]!.id

    const engine1 = createGameEngine(seed)
    const engine2 = createGameEngine(seed)

    const rolls1 = Array.from({ length: 10 }, () => engine1.diceRoll(playerId, 1)[0]!)
    const rolls2 = Array.from({ length: 10 }, () => engine2.diceRoll(playerId, 1)[0]!)

    expect(rolls1).toEqual(rolls2)
  })

  it('should have deterministic loan amount calculations', () => {
    const r1 = createSeededRandom(42)
    const r2 = createSeededRandom(42)

    const loan1 = createBankLoan(1000, r1)
    const loan2 = createBankLoan(1000, r2)

    // Same seed, same amount, same loan terms
    expect(loan1.id).toBe(loan2.id)
    expect(loan1.amount).toBe(loan2.amount)
    expect(loan1.monthlyPayment).toBe(loan2.monthlyPayment)
  })
})