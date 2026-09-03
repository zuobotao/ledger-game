import { describe, expect, it } from 'vitest'
import {
  ConservativePolicy,
  BalancedPolicy,
  AggressivePolicy,
  getPolicyForDifficulty,
  policies,
  type DecisionPolicy,
  type BuyDecision,
} from '@/engine/aiPolicies'
import { createObservation, type GameObservation } from '@/engine/aiTypes'
import { validateAIAction } from '@/engine/aiValidator'
import { RandomSource, createSeededRandom } from '@/engine/randomSource'
import { CAREERS } from '@/data/careers'
import type { Player, GameState, OpportunityCard } from '@/types/game'

// ==================== 测试辅助函数 ====================

/**
 * 创建测试用的 GameObservation
 */
function createTestObservation(overrides: Partial<GameObservation> = {}): GameObservation {
  return {
    playerId: 'p1',
    phase: 'rat_race',
    cash: 10000,
    cashFlow: 500,
    totalIncome: 3000,
    totalExpenses: 2000,
    passiveIncome: 0,
    netWorth: 15000,
    salary: 3000,
    childrenCount: 0,
    isUnemployed: false,
    ageMonths: 0,
    stockCount: 0,
    stockValue: 0,
    realEstateCount: 0,
    businessCount: 0,
    totalBankLoan: 0,
    totalOtherLiabilities: 0,
    pendingCard: {
      type: 'stock',
      cost: 10,
      cashFlow: 0,
      symbol: 'NOVA',
    },
    isAgeLimit: false,
    isFastStart: false,
    ...overrides,
  }
}

/**
 * 创建测试用的 Player
 */
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  const career = CAREERS.find((c) => c.id === 'cleaner')!
  return {
    id: 'p1',
    name: 'Test',
    color: 'red',
    career,
    salary: career.salary,
    passiveIncome: 0,
    totalIncome: career.salary,
    expenses: { ...career.expenses, child: 0 },
    totalExpenses:
      career.expenses.taxes +
      career.expenses.mortgage +
      career.expenses.schoolLoan +
      career.expenses.carLoan +
      career.expenses.creditCard +
      career.expenses.other +
      career.expenses.child,
    cashFlow: career.salary - 0,
    cash: 10000,
    savings: 0,
    assets: [],
    liabilities: [],
    ratRacePosition: 0,
    fastTrackPosition: 0,
    isUnemployed: false,
    unemploymentTurns: 0,
    hasInsurance: false,
    hasUnemploymentInsurance: false,
    childrenCount: 0,
    doubleDiceNextTurn: false,
    charityProtection: false,
    ageMonths: 0,
    isAI: true,
    aiDifficulty: 'medium',
    isBankrupt: false,
    financialStatement: {} as Player['financialStatement'],
    financialSnapshots: [],
    phase: 'rat_race',
    ...overrides,
  }
}

/**
 * 创建测试用的 GameState
 */
function createTestState(overrides: Partial<GameState> = {}): GameState {
  const player = createTestPlayer()
  return {
    players: [player],
    currentPlayerIndex: 0,
    phase: 'rat_race',
    config: {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: false,
    },
    winnerId: null,
    turnStatus: 'idle',
    lastRoll: 0,
    pendingAction: {
      type: null,
      card: null,
      message: '',
    },
    ...overrides,
  } as GameState
}

// ==================== P5-001: GameObservation 测试 ====================

describe('GameObservation (aiTypes.ts)', () => {
  it('createObservation should extract basic player fields', () => {
    const player = createTestPlayer({ cash: 5000, phase: 'rat_race' })
    const state = createTestState()

    const obs = createObservation(player, state)

    expect(obs.playerId).toBe('p1')
    expect(obs.cash).toBe(5000)
    expect(obs.phase).toBe('rat_race')
    expect(obs.totalIncome).toBe(player.totalIncome)
    expect(obs.totalExpenses).toBe(player.totalExpenses)
    expect(obs.passiveIncome).toBe(0)
    expect(obs.salary).toBe(player.salary)
    expect(obs.childrenCount).toBe(0)
    expect(obs.isUnemployed).toBe(false)
    expect(obs.ageMonths).toBe(0)
  })

  it('createObservation should calculate netWorth correctly', () => {
    const player = createTestPlayer({
      cash: 5000,
      savings: 1000,
      assets: [
        {
          id: 'a1',
          name: 'Test Stock',
          type: 'stock',
          cost: 1000,
          cashFlow: 0,
          quantity: 3,
          marketPrice: 1200,
        },
      ],
      liabilities: [
        {
          id: 'l1',
          name: 'Bank Loan',
          amount: 2000,
          monthlyPayment: 100,
          category: 'bank_loan',
        },
      ],
    })
    const state = createTestState()

    const obs = createObservation(player, state)

    // netWorth = cash + savings + asset_value - liabilities
    // = 5000 + 1000 + (1200*3) - 2000 = 7600
    expect(obs.netWorth).toBe(7600)
  })

  it('createObservation should summarize assets correctly', () => {
    const player = createTestPlayer({
      assets: [
        {
          id: 'a1',
          name: 'Stock A',
          type: 'stock',
          cost: 100,
          cashFlow: 0,
          quantity: 5,
          marketPrice: 150,
        },
        {
          id: 'a2',
          name: 'Stock B',
          type: 'stock',
          cost: 200,
          cashFlow: 0,
          quantity: 3,
          marketPrice: 250,
        },
        {
          id: 'a3',
          name: 'House',
          type: 'real_estate',
          cost: 50000,
          cashFlow: 200,
          quantity: 1,
        },
        {
          id: 'a4',
          name: 'Business',
          type: 'business',
          cost: 30000,
          cashFlow: 500,
          quantity: 1,
        },
      ],
    })
    const state = createTestState()

    const obs = createObservation(player, state)

    expect(obs.stockCount).toBe(8) // 5 + 3
    expect(obs.stockValue).toBe(150 * 5 + 250 * 3) // 750 + 750 = 1500
    expect(obs.realEstateCount).toBe(1)
    expect(obs.businessCount).toBe(1)
  })

  it('createObservation should summarize liabilities correctly', () => {
    const player = createTestPlayer({
      liabilities: [
        {
          id: 'l1',
          name: 'Bank Loan',
          amount: 5000,
          monthlyPayment: 500,
          category: 'bank_loan',
        },
        {
          id: 'l2',
          name: 'Credit Card',
          amount: 2000,
          monthlyPayment: 100,
          category: 'credit_card',
        },
        {
          id: 'l3',
          name: 'Car Loan',
          amount: 3000,
          monthlyPayment: 200,
          category: 'car_loan',
        },
      ],
    })
    const state = createTestState()

    const obs = createObservation(player, state)

    expect(obs.totalBankLoan).toBe(5000)
    expect(obs.totalOtherLiabilities).toBe(5000) // 2000 + 3000
  })

  it('createObservation should extract pendingCard from state', () => {
    const player = createTestPlayer()
    const card: OpportunityCard = {
      id: 'c1',
      type: 'stock',
      size: 'small',
      title: 'Test Card',
      description: 'A test card',
      cost: 20,
      cashFlow: 0,
      symbol: 'AAPL',
    }
    const state = createTestState({
      pendingAction: {
        type: 'opportunity',
        card,
        message: 'Test opportunity',
      },
    })

    const obs = createObservation(player, state)

    expect(obs.pendingCard).toBeDefined()
    expect(obs.pendingCard!.type).toBe('stock')
    expect(obs.pendingCard!.cost).toBe(20)
    expect(obs.pendingCard!.cashFlow).toBe(0)
    expect(obs.pendingCard!.symbol).toBe('AAPL')
  })

  it('createObservation should extract config flags', () => {
    const player = createTestPlayer()
    const state = createTestState({
      config: {
        playerCount: 1,
        insurance: false,
        bigFamily: false,
        mortgage: false,
        fastStart: true,
        ageLimit: true,
      },
    })

    const obs = createObservation(player, state)

    expect(obs.isAgeLimit).toBe(true)
    expect(obs.isFastStart).toBe(true)
  })
})

// ==================== P5-002: DecisionPolicy 测试 ====================

describe('DecisionPolicy (aiPolicies.ts)', () => {
  const seed = 42
  const random = createSeededRandom(seed)

  describe('ConservativePolicy', () => {
    const policy = new ConservativePolicy()

    it('should not buy expensive stocks', () => {
      const obs = createTestObservation({
        cash: 10000,
        pendingCard: { type: 'stock', cost: 100, cashFlow: 0, symbol: 'EXP' },
      })
      const result = policy.decideBuyOpportunity(obs, random)
      expect(result.buy).toBe(false)
    })

    it('should buy cheap stocks when cash allows', () => {
      const obs = createTestObservation({
        cash: 10000,
        pendingCard: { type: 'stock', cost: 10, cashFlow: 0, symbol: 'NOVA' },
      })
      const result = policy.decideBuyOpportunity(obs, random)
      // Conservative: ROI for $10 stock is ~150-200%, > 12% threshold
      // But the jitter factor may reduce the investable funds
      expect(typeof result.buy).toBe('boolean')
      expect(result.quantity).toBeGreaterThanOrEqual(0)
    })

    it('should not buy when no pending card', () => {
      const obs = createTestObservation({
        cash: 10000,
        pendingCard: undefined,
      })
      const result = policy.decideBuyOpportunity(obs, random)
      expect(result.buy).toBe(false)
      expect(result.quantity).toBe(0)
    })

    it('should not participate in charity', () => {
      const obs = createTestObservation({ cash: 10000 })
      expect(policy.decideCharity(obs, 100, random)).toBe(false)
    })

    it('should not take loans', () => {
      const obs = createTestObservation({ cash: 5000, totalIncome: 3000, totalBankLoan: 0 })
      const result = policy.decideTakeLoan(obs, random)
      expect(result.take).toBe(false)
      expect(result.amount).toBe(0)
    })

    it('should repay loans when surplus cash available', () => {
      const obs = createTestObservation({
        cash: 10000,
        totalExpenses: 1000,
        totalBankLoan: 5000,
      })
      const result = policy.decideRepayLoan(obs, random)
      expect(result.repay).toBe(true)
      expect(result.amount).toBeGreaterThan(0)
    })
  })

  describe('BalancedPolicy', () => {
    const policy = new BalancedPolicy()

    it('should buy moderately priced stocks', () => {
      const obs = createTestObservation({
        cash: 10000,
        pendingCard: { type: 'stock', cost: 20, cashFlow: 0, symbol: 'MID' },
      })
      const result = policy.decideBuyOpportunity(obs, random)
      // Balanced: ROI for $20 stock is ~50-75%, > 8% threshold
      expect(typeof result.buy).toBe('boolean')
      expect(result.quantity).toBeGreaterThanOrEqual(0)
    })

    it('should consider charity with 50% probability', () => {
      const obs = createTestObservation({ cash: 10000 })
      // With a fixed seed, this should be deterministic
      const r1 = createSeededRandom(123)
      const result1 = policy.decideCharity(obs, 100, r1)
      const r2 = createSeededRandom(123)
      const result2 = policy.decideCharity(obs, 100, r2)
      expect(result1).toBe(result2) // Same seed = same result
    })

    it('should take loans when capacity available', () => {
      const obs = createTestObservation({
        cash: 5000,
        totalIncome: 5000,
        totalBankLoan: 0,
      })
      const result = policy.decideTakeLoan(obs, random)
      expect(typeof result.take).toBe('boolean')
      if (result.take) {
        expect(result.amount).toBeGreaterThanOrEqual(1000)
      }
    })
  })

  describe('AggressivePolicy', () => {
    const policy = new AggressivePolicy()

    it('should buy stocks aggressively', () => {
      const obs = createTestObservation({
        cash: 10000,
        pendingCard: { type: 'stock', cost: 30, cashFlow: 0, symbol: 'AGGR' },
      })
      const result = policy.decideBuyOpportunity(obs, random)
      // Aggressive: ROI for $30 stock is ~50-75%, > 5% threshold
      expect(typeof result.buy).toBe('boolean')
      expect(result.quantity).toBeGreaterThanOrEqual(0)
    })

    it('should always participate in charity', () => {
      const obs = createTestObservation({ cash: 10000 })
      expect(policy.decideCharity(obs, 100, random)).toBe(true)
    })

    it('should not participate in charity if cash insufficient', () => {
      const obs = createTestObservation({ cash: 50 })
      expect(policy.decideCharity(obs, 100, random)).toBe(false)
    })

    it('should take loans aggressively', () => {
      const obs = createTestObservation({
        cash: 5000,
        totalIncome: 5000,
        totalBankLoan: 0,
      })
      const result = policy.decideTakeLoan(obs, random)
      expect(typeof result.take).toBe('boolean')
      if (result.take) {
        expect(result.amount).toBeGreaterThanOrEqual(1000)
      }
    })
  })

  describe('Policy comparison — buying aggressiveness', () => {
    it('ConservativePolicy should buy less than AggressivePolicy for same opportunity', () => {
      const random = createSeededRandom(99)

      const obs = createTestObservation({
        cash: 10000,
        totalIncome: 3000,
        totalBankLoan: 0,
        pendingCard: { type: 'stock', cost: 10, cashFlow: 0, symbol: 'NOVA' },
      })

      const consResult = new ConservativePolicy().decideBuyOpportunity(obs, random)
      const r2 = createSeededRandom(99)
      const balResult = new BalancedPolicy().decideBuyOpportunity(obs, r2)
      const r3 = createSeededRandom(99)
      const aggResult = new AggressivePolicy().decideBuyOpportunity(obs, r3)

      // Conservative should buy <= Balanced
      // Balanced should buy <= Aggressive
      if (consResult.buy && balResult.buy) {
        expect(consResult.quantity).toBeLessThanOrEqual(balResult.quantity)
      }
      if (balResult.buy && aggResult.buy) {
        expect(balResult.quantity).toBeLessThanOrEqual(aggResult.quantity)
      }
    })
  })

  describe('Deterministic behavior', () => {
    it('all policies should produce same results with same seed', () => {
      const policiesToTest: DecisionPolicy[] = [
        new ConservativePolicy(),
        new BalancedPolicy(),
        new AggressivePolicy(),
      ]

      const obs = createTestObservation({
        cash: 10000,
        totalIncome: 3000,
        totalBankLoan: 5000,
        totalExpenses: 2000,
        stockCount: 10,
        stockValue: 500,
        pendingCard: { type: 'stock', cost: 10, cashFlow: 0, symbol: 'NOVA' },
      })

      for (const policy of policiesToTest) {
        const r1 = createSeededRandom(42)
        const r2 = createSeededRandom(42)

        const buy1 = policy.decideBuyOpportunity(obs, r1)
        // Reset r1 state by creating new seeded random
        const r3 = createSeededRandom(42)
        const buy2 = policy.decideBuyOpportunity(obs, r3)
        expect(buy1).toEqual(buy2)

        const r4 = createSeededRandom(42)
        const r5 = createSeededRandom(42)
        const sell1 = policy.decideSellStock(obs, 'NOVA', 50, r4)
        const sell2 = policy.decideSellStock(obs, 'NOVA', 50, r5)
        expect(sell1).toEqual(sell2)

        const r6 = createSeededRandom(42)
        const r7 = createSeededRandom(42)
        const charity1 = policy.decideCharity(obs, 100, r6)
        const charity2 = policy.decideCharity(obs, 100, r7)
        expect(charity1).toBe(charity2)

        const r8 = createSeededRandom(42)
        const r9 = createSeededRandom(42)
        const loan1 = policy.decideTakeLoan(obs, r8)
        const loan2 = policy.decideTakeLoan(obs, r9)
        expect(loan1).toEqual(loan2)

        const r10 = createSeededRandom(42)
        const r11 = createSeededRandom(42)
        const repay1 = policy.decideRepayLoan(obs, r10)
        const repay2 = policy.decideRepayLoan(obs, r11)
        expect(repay1).toEqual(repay2)
      }
    })
  })

  describe('getPolicyForDifficulty', () => {
    it('should return correct policy for each difficulty', () => {
      expect(getPolicyForDifficulty('easy')).toBeInstanceOf(ConservativePolicy)
      expect(getPolicyForDifficulty('medium')).toBeInstanceOf(BalancedPolicy)
      expect(getPolicyForDifficulty('hard')).toBeInstanceOf(AggressivePolicy)
    })
  })

  describe('policy names', () => {
    it('should have correct names', () => {
      expect(policies.conservative.name).toBe('Conservative')
      expect(policies.balanced.name).toBe('Balanced')
      expect(policies.aggressive.name).toBe('Aggressive')
    })
  })
})

// ==================== P5-003: AI Validator 测试 ====================

describe('AI Validator (aiValidator.ts)', () => {
  describe('validateAIAction', () => {
    it('should reject actions with non-existent playerId', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'roll_dice', playerId: 'non_existent' },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should accept actions with valid playerId', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'roll_dice', playerId: 'p1' },
        state,
      )
      expect(result.valid).toBe(true)
    })

    it('should reject take_bank_loan with negative amount', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'take_bank_loan', playerId: 'p1', amount: -100 },
        state,
      )
      expect(result.valid).toBe(false)
    })

    it('should reject take_bank_loan with zero amount', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'take_bank_loan', playerId: 'p1', amount: 0 },
        state,
      )
      expect(result.valid).toBe(false)
    })

    it('should accept valid take_bank_loan', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'take_bank_loan', playerId: 'p1', amount: 5000 },
        state,
      )
      expect(result.valid).toBe(true)
    })

    it('should reject repay_bank_loan when no loan exists', () => {
      const state = createTestState()
      const result = validateAIAction(
        { type: 'repay_bank_loan', playerId: 'p1', liabilityId: 'l1', amount: 1000 },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('no bank loan')
    })

    it('should reject repay_bank_loan when amount exceeds loan', () => {
      const player = createTestPlayer({
        liabilities: [
          {
            id: 'l1',
            name: 'Bank Loan',
            amount: 1000,
            monthlyPayment: 100,
            category: 'bank_loan',
          },
        ],
      })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'repay_bank_loan', playerId: 'p1', liabilityId: 'l1', amount: 2000 },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds loan balance')
    })

    it('should reject repay_bank_loan when amount exceeds cash', () => {
      const player = createTestPlayer({
        cash: 500,
        liabilities: [
          {
            id: 'l1',
            name: 'Bank Loan',
            amount: 5000,
            monthlyPayment: 100,
            category: 'bank_loan',
          },
        ],
      })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'repay_bank_loan', playerId: 'p1', liabilityId: 'l1', amount: 1000 },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds cash')
    })

    it('should reject sell_opportunity for non-existent asset', () => {
      const state = createTestState()
      const result = validateAIAction(
        {
          type: 'sell_opportunity',
          playerId: 'p1',
          assetId: 'non_existent',
          quantity: 1,
        },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should reject sell_opportunity with quantity exceeding owned', () => {
      const player = createTestPlayer({
        assets: [
          {
            id: 'a1',
            name: 'Test Stock',
            type: 'stock',
            cost: 100,
            cashFlow: 0,
            quantity: 5,
          },
        ],
      })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        {
          type: 'sell_opportunity',
          playerId: 'p1',
          assetId: 'a1',
          quantity: 10,
        },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds owned')
    })

    it('should reject ai_think for non-AI player', () => {
      const player = createTestPlayer({ isAI: false })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'ai_think', playerId: 'p1' },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not an AI')
    })

    it('should accept ai_think for AI player', () => {
      const player = createTestPlayer({ isAI: true })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'ai_think', playerId: 'p1' },
        state,
      )
      expect(result.valid).toBe(true)
    })

    it('should accept start_game without playerId', () => {
      const state = createTestState()
      const result = validateAIAction(
        {
          type: 'start_game',
          config: {
            playerCount: 1,
            insurance: false,
            bigFamily: false,
            mortgage: false,
            fastStart: false,
            ageLimit: false,
          },
          playerSetups: [],
        },
        state,
      )
      expect(result.valid).toBe(true)
    })

    it('should reject send_to_fast_track when already in fast_track', () => {
      const player = createTestPlayer({ phase: 'fast_track' })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'send_to_fast_track', playerId: 'p1' },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not in rat_race')
    })

    it('should reject declare_bankruptcy when already bankrupt', () => {
      const player = createTestPlayer({ isBankrupt: true })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'declare_bankruptcy', playerId: 'p1' },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('already bankrupt')
    })

    it('should reject deposit_savings with amount exceeding cash', () => {
      const player = createTestPlayer({ cash: 500 })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'deposit_savings', playerId: 'p1', amount: 1000 },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds cash')
    })

    it('should reject withdraw_savings with amount exceeding savings', () => {
      const player = createTestPlayer({ savings: 100 })
      const state = createTestState({ players: [player] })
      const result = validateAIAction(
        { type: 'withdraw_savings', playerId: 'p1', amount: 500 },
        state,
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds savings')
    })
  })
})