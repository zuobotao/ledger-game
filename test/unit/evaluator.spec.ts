/**
 * Phase 5: StateEvaluator Tests
 *
 * 验证 BasicFinancialEvaluator:
 * 1. 更高净值 -> score 更高
 * 2. 更高现金流 -> score 更高
 * 3. 严重流动性风险 -> score 降低
 * 4. 各维度独立评分
 * 5. 玩家不存在时返回 -Infinity
 */

import { describe, expect, it } from 'vitest'
import {
  BasicFinancialEvaluator,
  createBasicFinancialEvaluator,
  type StateEvaluator,
  type EvaluationScore,
} from '@/engine/evaluator'
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

describe('BasicFinancialEvaluator', () => {
  it('should have name', () => {
    const evaluator = createBasicFinancialEvaluator()
    expect(evaluator.name).toBe('BasicFinancial')
  })

  it('should return -Infinity for non-existent player', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const score = evaluator.evaluate(state, state, 'nonexistent')
    expect(score.total).toBe(-Infinity)
    expect(score.netWorth).toBe(-Infinity)
  })

  it('should give higher score for higher net worth', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state1 = createEmptyState()
    const player1 = createTestPlayer(engine)
    state1.players = [player1]

    const state2 = deepClone(state1)
    const player2 = state2.players[0]!
    // Add cash to increase net worth
    player2.cash += 50000

    const score1 = evaluator.evaluate(state1, state1, player1.id)
    const score2 = evaluator.evaluate(state2, state2, player2.id)

    expect(score2.netWorth).toBeGreaterThan(score1.netWorth)
    expect(score2.total).toBeGreaterThan(score1.total)
  })

  it('should give higher score for higher cash flow', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state1 = createEmptyState()
    const player1 = createTestPlayer(engine)
    state1.players = [player1]

    const state2 = deepClone(state1)
    const player2 = state2.players[0]!
    // Simulate higher cash flow by adding a passive income asset
    player2.assets.push({
      id: 'test-asset',
      name: 'Rental Property',
      type: 'real_estate',
      cost: 100000,
      cashFlow: 2000,
      quantity: 1,
      symbol: undefined,
      marketPrice: 100000,
      loanAmount: 0,
      monthlyLoanPayment: 0,
    })
    player2.passiveIncome = 2000
    player2.totalIncome = player2.salary + 2000
    player2.cashFlow = player2.totalIncome - player2.totalExpenses

    const score1 = evaluator.evaluate(state1, state1, player1.id)
    const score2 = evaluator.evaluate(state2, state2, player2.id)

    expect(score2.cashFlow).toBeGreaterThan(score1.cashFlow)
  })

  it('should give lower score for severe liquidity risk', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    // Normal state: player has cash
    const scoreNormal = evaluator.evaluate(state, state, player.id)

    const stateLow = deepClone(state)
    const playerLow = stateLow.players[0]!
    // Drain cash to create liquidity risk
    playerLow.cash = 100

    const scoreLow = evaluator.evaluate(stateLow, stateLow, playerLow.id)

    expect(scoreLow.liquidity).toBeLessThan(scoreNormal.liquidity)
    expect(scoreLow.total).toBeLessThan(scoreNormal.total)
  })

  it('should give lower risk score for high debt', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const scoreNormal = evaluator.evaluate(state, state, player.id)

    const stateHighDebt = deepClone(state)
    const playerHighDebt = stateHighDebt.players[0]!
    // Add a large loan
    playerHighDebt.liabilities.push({
      id: 'huge-loan',
      name: 'Huge Loan',
      amount: 100000,
      monthlyPayment: 10000,
      category: 'bank_loan',
    })

    const scoreHighDebt = evaluator.evaluate(
      stateHighDebt,
      stateHighDebt,
      playerHighDebt.id,
    )

    expect(scoreHighDebt.risk).toBeLessThan(scoreNormal.risk)
  })

  it('should give higher progress score as passive income approaches expenses', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const scoreBase = evaluator.evaluate(state, state, player.id)

    // Near fast track: passive income close to total expenses
    const stateNearFT = deepClone(state)
    const playerNearFT = stateNearFT.players[0]!
    playerNearFT.passiveIncome = playerNearFT.totalExpenses * 0.9
    playerNearFT.totalIncome = playerNearFT.salary + playerNearFT.passiveIncome
    playerNearFT.cashFlow = playerNearFT.totalIncome - playerNearFT.totalExpenses

    const scoreNearFT = evaluator.evaluate(
      stateNearFT,
      stateNearFT,
      playerNearFT.id,
    )

    expect(scoreNearFT.progress).toBeGreaterThan(scoreBase.progress)
  })

  it('should implement StateEvaluator interface', () => {
    const evaluator = createBasicFinancialEvaluator()
    // TypeScript structural check: if it compiles, it implements the interface
    const evaluator2: StateEvaluator = evaluator
    expect(evaluator2.name).toBe('BasicFinancial')
  })

  it('should return all score dimensions', () => {
    const evaluator = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const score = evaluator.evaluate(state, state, player.id)

    expect(typeof score.total).toBe('number')
    expect(typeof score.netWorth).toBe('number')
    expect(typeof score.cashFlow).toBe('number')
    expect(typeof score.liquidity).toBe('number')
    expect(typeof score.risk).toBe('number')
    expect(typeof score.progress).toBe('number')
    expect(isFinite(score.total)).toBe(true)
  })

  it('should be pluggable (different evaluators produce different scores)', () => {
    // Create a simple alternative evaluator
    const altEvaluator: StateEvaluator = {
      name: 'Alt',
      evaluate(_before, _after, _playerId) {
        return {
          total: 0.5,
          netWorth: 0.5,
          cashFlow: 0.5,
          liquidity: 0.5,
          risk: 0.5,
          progress: 0.5,
        }
      },
    }

    const basic = createBasicFinancialEvaluator()
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]

    const basicScore = basic.evaluate(state, state, player.id)
    const altScore = altEvaluator.evaluate(state, state, player.id)

    // Different evaluators should produce different scores
    expect(basicScore.total).not.toBe(altScore.total)
  })
})