import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { computeFinancialDelta, calcFinancialFreedomRatio } from '@/engine/financialEngine'
import { createEmptyDelta, mergeDeltas, isDeltaEmpty } from '@/engine/contract'
import type { Player } from '@/types/game'

describe('FinancialDelta', () => {
  describe('utility functions', () => {
    it('createEmptyDelta returns all zeros', () => {
      const delta = createEmptyDelta()
      expect(delta.cash).toBe(0)
      expect(delta.passiveIncome).toBe(0)
      expect(delta.assets).toBe(0)
      expect(delta.liabilities).toBe(0)
      expect(delta.netWorth).toBe(0)
      expect(delta.cashFlow).toBe(0)
      expect(delta.totalIncome).toBe(0)
      expect(delta.totalExpenses).toBe(0)
      expect(delta.savings).toBe(0)
      expect(delta.childrenCount).toBe(0)
      expect(delta.salary).toBe(0)
    })

    it('isDeltaEmpty returns true for zero delta', () => {
      expect(isDeltaEmpty(createEmptyDelta())).toBe(true)
    })

    it('isDeltaEmpty returns false for non-zero delta', () => {
      const d = createEmptyDelta()
      d.cash = 100
      expect(isDeltaEmpty(d)).toBe(false)
    })

    it('mergeDeltas adds multiple deltas together', () => {
      const a = createEmptyDelta()
      a.cash = 100
      a.assets = 500
      a.passiveIncome = 50

      const b = createEmptyDelta()
      b.cash = -30
      b.liabilities = 200
      b.passiveIncome = 20

      const c = createEmptyDelta()
      c.cash = 50
      c.netWorth = 1000

      const merged = mergeDeltas(a, b, c)
      expect(merged.cash).toBe(120) // 100 - 30 + 50
      expect(merged.assets).toBe(500)
      expect(merged.liabilities).toBe(200)
      expect(merged.passiveIncome).toBe(70) // 50 + 20
      expect(merged.netWorth).toBe(1000)
    })
  })

  describe('computeFinancialDelta', () => {
    function createTestPlayer(): Player {
      return {
        id: 'test-player',
        name: 'Test',
        color: '#ff0000',
        career: {
          id: 'engineer',
          name: '工程师',
          salary: 5000,
          startingCash: 10000,
          expenses: {
            taxes: 1000,
            mortgage: 800,
            schoolLoan: 200,
            carLoan: 150,
            creditCard: 100,
            other: 500,
            child: 0,
          },
          description: '',
        },
        salary: 5000,
        passiveIncome: 0,
        totalIncome: 5000,
        expenses: {
          taxes: 1000,
          mortgage: 800,
          schoolLoan: 200,
          carLoan: 150,
          creditCard: 100,
          other: 500,
          child: 0,
        },
        totalExpenses: 2750,
        cashFlow: 2250,
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
        dream: undefined,
        isAI: false,
        aiDifficulty: undefined,
        isBankrupt: false,
        financialStatement: {} as any,
        financialSnapshots: [],
        phase: 'rat_race',
      }
    }

    it('returns all zeros for identical players', () => {
      const p = createTestPlayer()
      const delta = computeFinancialDelta(p, p)
      expect(isDeltaEmpty(delta)).toBe(true)
    })

    it('correctly calculates cash change', () => {
      const before = createTestPlayer()
      const after = createTestPlayer()
      after.cash = 15000
      const delta = computeFinancialDelta(before, after)
      expect(delta.cash).toBe(5000)
    })

    it('correctly calculates asset and netWorth change when buying asset', () => {
      const before = createTestPlayer()
      const after = createTestPlayer()

      // 模拟买入 $10000 资产，首付 $2000，贷款 $8000，月现金流 +$200
      after.cash = after.cash - 2000
      after.assets = [{
        id: 'a1',
        name: 'Test Asset',
        type: 'real_estate',
        cost: 10000,
        cashFlow: 200,
        quantity: 1,
        loanAmount: 8000,
        monthlyLoanPayment: 40,
      }]
      after.liabilities = [{
        id: 'l1',
        name: 'Test Loan',
        amount: 8000,
        monthlyPayment: 40,
        category: 'real_estate_loan',
      }]
      // 重新计算财务
      after.passiveIncome = 200
      after.totalIncome = after.salary + after.passiveIncome
      after.expenses.other = after.expenses.other + 40
      after.totalExpenses = 2750 + 40
      after.cashFlow = after.totalIncome - after.totalExpenses

      const delta = computeFinancialDelta(before, after)

      // 现金减少 2000（首付）
      expect(delta.cash).toBe(-2000)
      // 资产增加 10000
      expect(delta.assets).toBe(10000)
      // 负债增加 8000
      expect(delta.liabilities).toBe(8000)
      // 净资产变化 = -2000 + 10000 - 8000 = 0（等价交换）
      expect(delta.netWorth).toBe(0)
      // 被动收入增加 200
      expect(delta.passiveIncome).toBe(200)
      // 现金流变化 = 200 被动收入 - 40 还款 = 160
      expect(delta.cashFlow).toBe(160)
    })

    it('correctly calculates liability and cash flow change for loan', () => {
      const before = createTestPlayer()
      const after = createTestPlayer()

      // 借入 $5000 贷款，月还款 $50
      after.cash = after.cash + 5000
      after.liabilities = [{
        id: 'l1',
        name: 'Bank Loan',
        amount: 5000,
        monthlyPayment: 50,
        category: 'bank_loan',
      }]
      after.expenses.other = after.expenses.other + 50
      after.totalExpenses = 2750 + 50
      after.cashFlow = after.totalIncome - after.totalExpenses

      const delta = computeFinancialDelta(before, after)

      expect(delta.cash).toBe(5000)
      expect(delta.liabilities).toBe(5000)
      expect(delta.netWorth).toBe(0) // 现金 +5000, 负债 +5000 → 净资产不变
      expect(delta.cashFlow).toBe(-50) // 还款导致现金流减少
      expect(delta.totalExpenses).toBe(50)
    })
  })

  describe('calcFinancialFreedomRatio', () => {
    function createPlayerWithIncome(passiveInc: number, expenses: number): Player {
      return {
        id: 'test',
        name: 'Test',
        color: '#ff0000',
        career: {} as any,
        salary: 3000,
        passiveIncome: passiveInc,
        totalIncome: 3000 + passiveInc,
        expenses: { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 0, child: 0 },
        totalExpenses: expenses,
        cashFlow: 3000 + passiveInc - expenses,
        cash: 0,
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
        isAI: false,
        isBankrupt: false,
        financialStatement: {} as any,
        financialSnapshots: [],
        phase: 'rat_race',
      }
    }

    it('returns 0 when no passive income', () => {
      const p = createPlayerWithIncome(0, 2000)
      expect(calcFinancialFreedomRatio(p)).toBe(0)
    })

    it('returns 0.5 when passive income covers half expenses', () => {
      const p = createPlayerWithIncome(1000, 2000)
      expect(calcFinancialFreedomRatio(p)).toBe(0.5)
    })

    it('returns 1.0 when passive income equals expenses', () => {
      const p = createPlayerWithIncome(2000, 2000)
      expect(calcFinancialFreedomRatio(p)).toBe(1.0)
    })

    it('returns > 1 when passive income exceeds expenses', () => {
      const p = createPlayerWithIncome(3000, 2000)
      expect(calcFinancialFreedomRatio(p)).toBe(1.5)
    })

    it('returns 1.0 when expenses are zero (edge case)', () => {
      const p = createPlayerWithIncome(1000, 0)
      expect(calcFinancialFreedomRatio(p)).toBe(1.0)
    })
  })
})

describe('Store Decision Feedback', () => {
  let store: ReturnType<typeof useGameStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameStore()
    store.startGame(
      { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
      [{ name: 'TestPlayer', careerId: 'engineer', colorId: 'red', isAI: false }],
    )
  })

  it('lastActionResult is null initially', () => {
    expect(store.lastActionResult).toBeNull()
  })

  it('takeBankLoan produces action result with correct delta', () => {
    const beforeCash = store.currentPlayer!.cash
    const result = store.takeBankLoan(5000)

    expect(result).toBe(true)
    expect(store.lastActionResult).not.toBeNull()
    expect(store.lastActionResult!.action).toBe('take_bank_loan')
    expect(store.lastActionResult!.success).toBe(true)
    expect(store.lastActionResult!.delta).not.toBeNull()

    const delta = store.lastActionResult!.delta!
    // 现金增加
    expect(delta.cash).toBe(5000)
    // 负债增加
    expect(delta.liabilities).toBeGreaterThan(0)
    // 净资产不变（现金 = 负债）
    expect(delta.netWorth).toBeCloseTo(0, 0)
    // 现金流减少（月供）
    expect(delta.cashFlow).toBeLessThan(0)
  })

  it('repayBankLoan produces action result with correct delta', () => {
    // 先借一笔
    store.takeBankLoan(5000)
    store.clearActionResult()

    const loan = store.currentPlayer!.liabilities.find((l) => l.category === 'bank_loan')!
    // 全额还清（部分还款不改变月供）
    const result = store.repayBankLoan(loan.id, loan.amount)

    expect(result).toBe(true)
    expect(store.lastActionResult).not.toBeNull()
    expect(store.lastActionResult!.action).toBe('repay_bank_loan')

    const delta = store.lastActionResult!.delta!
    // 现金减少
    expect(delta.cash).toBeLessThan(0)
    // 负债减少（还清）
    expect(delta.liabilities).toBe(-5000)
    // 净资产不变（现金减少 = 负债减少）
    expect(delta.netWorth).toBeCloseTo(0, 0)
    // 现金流增加（月供取消）
    expect(delta.cashFlow).toBeGreaterThan(0)
  })

  it('clearActionResult resets lastActionResult to null', () => {
    store.takeBankLoan(1000)
    expect(store.lastActionResult).not.toBeNull()

    store.clearActionResult()
    expect(store.lastActionResult).toBeNull()
  })

  it('calcFinancialFreedomRatio is accessible from store', () => {
    const player = store.currentPlayer!
    const ratio = store.calcFinancialFreedomRatio(player)
    expect(typeof ratio).toBe('number')
    // 初始状态没有被动收入，比率为 0
    expect(ratio).toBe(0)
  })
})
