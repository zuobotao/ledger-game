import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { recalcPlayerFinancials } from '@/engine/financialEngine'
import { getFastTrackEligibility } from '@/engine/turnEngine'
import type { GameConfig, Player } from '@/types/game'

// v2.4.1 P0-2：Finance / Loan / Expense / FastTrack。
// 核心不变量：偿清 liability → 联动 recurring expense → totalExpenses → cashflow → eligibility 立即重算。
describe('v2.4.1 贷款偿清联动 FastTrack 资格', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(): GameConfig {
    return {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
  }

  function startPlayer(): { store: ReturnType<typeof useGameStore>; p: Player } {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const p = store.players[0]
    // 受控玩家：被动收入 1200，无子女，其余支出清零
    p.cash = 100000
    p.childrenCount = 0
    p.assets = [
      {
        id: 'a1',
        name: '测试房产',
        type: 'real_estate',
        cost: 50000,
        marketPrice: 52000,
        loanAmount: 0,
        monthlyLoanPayment: 0,
        cashFlow: 1200,
        quantity: 1,
      },
    ]
    p.expenses = { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 0, child: 0 }
    p.liabilities = []
    recalcPlayerFinancials(p)
    return { store, p }
  }

  describe('FastTrack 资格边界（被动收入 = 支出）', () => {
    it('被动收入 = 支出：达标，无缺口', () => {
      const p = { phase: 'rat_race', passiveIncome: 1500, totalExpenses: 1500 } as unknown as Player
      const r = getFastTrackEligibility(p)
      expect(r.eligible).toBe(true)
      expect(r.gap).toBe(0)
      expect(r.reason).toBe('PASSIVE_INCOME_COVERS_EXPENSES')
    })

    it('被动收入 < 支出：不达标', () => {
      const p = { phase: 'rat_race', passiveIncome: 1000, totalExpenses: 1500 } as unknown as Player
      expect(getFastTrackEligibility(p).eligible).toBe(false)
    })

    it('被动收入 > 支出：达标', () => {
      const p = { phase: 'rat_race', passiveIncome: 2000, totalExpenses: 1500 } as unknown as Player
      expect(getFastTrackEligibility(p).eligible).toBe(true)
    })
  })

  describe('银行贷款记账联动', () => {
    it('银行贷款把月供计入 other 支出；还清后 other 支出清算，资格立即重算', () => {
      const { store, p } = startPlayer()
      expect(p.passiveIncome).toBe(1200)
      expect(p.totalExpenses).toBe(0)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)

      // 借一笔贷款 → other 支出增加 → 总支出随之增加
      store.takeBankLoan(10000)
      expect(p.expenses.other).toBeGreaterThan(0)
      expect(p.totalExpenses).toBe(p.expenses.other)
      expect(p.liabilities).toHaveLength(1)

      // 还清全部银行贷款 → other 支出清算 → 总支出归 0 → 重新获得资格
      const total = store.totalBankLoanAmount(p)
      store.repayAllBankLoans(total)
      expect(p.liabilities).toHaveLength(0)
      expect(p.expenses.other).toBe(0)
      expect(p.totalExpenses).toBe(0)
      // 支出清零后现金流 = 总收入（工资 + 被动收入）
      expect(p.cashFlow).toBe(p.totalIncome)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
      expect(store.enterFastTrack()).toBe(true)
      expect(p.phase).toBe('fast_track')
    })
  })

  describe('各贷款类别偿清均清空对应 recurring expense', () => {
    it('车贷 / 房贷 / 学贷 / 信用卡 还清后对应支出归零', () => {
      const { store, p } = startPlayer()
      p.expenses = {
        taxes: 0,
        mortgage: 1200,
        schoolLoan: 400,
        carLoan: 300,
        creditCard: 200,
        other: 0,
        child: 0,
      }
      p.liabilities = [
        { id: 'm1', name: '房贷', category: 'mortgage', amount: 20000, monthlyPayment: 1200 },
        { id: 's1', name: '学贷', category: 'school_loan', amount: 8000, monthlyPayment: 400 },
        { id: 'c1', name: '车贷', category: 'car_loan', amount: 5000, monthlyPayment: 300 },
        { id: 'cc1', name: '信用卡', category: 'credit_card', amount: 2000, monthlyPayment: 200 },
      ]
      recalcPlayerFinancials(p)
      expect(p.totalExpenses).toBe(1200 + 400 + 300 + 200)

      for (const id of ['m1', 's1', 'c1', 'cc1']) {
        store.payoffLiability(id)
      }
      expect(p.liabilities).toHaveLength(0)
      expect(p.expenses.mortgage).toBe(0)
      expect(p.expenses.schoolLoan).toBe(0)
      expect(p.expenses.carLoan).toBe(0)
      expect(p.expenses.creditCard).toBe(0)
      expect(p.totalExpenses).toBe(0)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
    })
  })
})