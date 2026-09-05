import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { recalcPlayerFinancials } from '@/engine/financialEngine'
import { getFastTrackEligibility, canEnterFastTrack } from '@/engine/turnEngine'
import type { GameConfig, Player } from '@/types/game'

/**
 * v2.3 P0-3 回归测试：Rat Race → Fast Track 状态转换
 *
 * Scenario A：未满足条件 → 不能进入
 * Scenario B：满足条件 → 显示资格 → 可进入
 * Scenario C：还清最后一笔贷款 → 立即重算 → 获得资格
 * Scenario D：已满足条件 → 刷新页面 → 仍可进入（资格保持，仍在 Rat Race）
 * Scenario E：已进入 Fast Track → 刷新页面 → 仍处于 Fast Track
 */
describe('Fast Track Eligibility (v2.3 P0-3)', () => {
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

  function startCleaner(): ReturnType<typeof useGameStore> {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    return store
  }

  /** 构造一个被动收入=1200、车贷月供=1500 的受控玩家 */
  function makePlayerControlled(p: Player): void {
    p.cash = 5000
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
    p.expenses = {
      taxes: 0,
      mortgage: 0,
      schoolLoan: 0,
      carLoan: 1500,
      creditCard: 0,
      other: 0,
      child: 0,
    }
    p.liabilities = [{ id: 'car1', name: '车贷', category: 'car_loan', amount: 3000, monthlyPayment: 1500 }]
    recalcPlayerFinancials(p)
  }

  describe('纯函数 getFastTrackEligibility', () => {
    it('被动收入 < 总支出：未达标，输出缺口与原因', () => {
      const p = {
        phase: 'rat_race',
        passiveIncome: 1000,
        totalExpenses: 1500,
      } as unknown as Player
      const r = getFastTrackEligibility(p)
      expect(r.eligible).toBe(false)
      expect(r.gap).toBe(500)
      expect(r.reason).toBe('NOT_ELIGIBLE')
      expect(canEnterFastTrack(p)).toBe(false)
    })

    it('被动收入 >= 总支出：达标，缺口为 0', () => {
      const p = {
        phase: 'rat_race',
        passiveIncome: 2000,
        totalExpenses: 1500,
      } as unknown as Player
      const r = getFastTrackEligibility(p)
      expect(r.eligible).toBe(true)
      expect(r.gap).toBe(0)
      expect(r.reason).toBe('PASSIVE_INCOME_COVERS_EXPENSES')
      expect(canEnterFastTrack(p)).toBe(true)
    })

    it('已处于 fast_track：不作为进入资格判定', () => {
      const p = {
        phase: 'fast_track',
        passiveIncome: 99999,
        totalExpenses: 0,
      } as unknown as Player
      expect(getFastTrackEligibility(p).eligible).toBe(false)
      expect(canEnterFastTrack(p)).toBe(false)
    })
  })

  describe('Scenario A：未满足条件 → 不能进入', () => {
    it('初始玩家不可进入，enterFastTrack 返回 false', () => {
      const store = startCleaner()
      const p = store.players[0]
      expect(p.passiveIncome).toBeLessThan(p.totalExpenses)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(false)
      expect(store.fastTrackEligibility?.eligible).toBe(false)
      expect(store.enterFastTrack()).toBe(false)
      expect(p.phase).toBe('rat_race')
    })
  })

  describe('Scenario B：满足条件 → 显示资格 → 可进入', () => {
    it('达标后资格为 true，可进入 Fast Track', () => {
      const store = startCleaner()
      const p = store.players[0]
      makePlayerControlled(p)
      expect(p.passiveIncome).toBe(1200)
      expect(p.totalExpenses).toBe(1500)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(false)

      // 还清车贷使支出降至 0 → 被动收入 1200 > 0，达标
      expect(store.payoffLiability('car1')).toBe(true)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
      expect(store.fastTrackEligibility?.eligible).toBe(true)
      expect(store.fastTrackEligibility?.reason).toBe('PASSIVE_INCOME_COVERS_EXPENSES')

      expect(store.enterFastTrack()).toBe(true)
      expect(p.phase).toBe('fast_track')
    })
  })

  describe('Scenario C：还清最后一笔贷款 → 立即重算 → 获得资格', () => {
    it('payoffLiability 触发 recalc + eligibility 立即更新（无陈旧值）', () => {
      const store = startCleaner()
      const p = store.players[0]
      makePlayerControlled(p)
      // 达标前：被动收入 1200 < 车贷 1500
      expect(store.fastTrackEligibility?.eligible).toBe(false)
      expect(store.fastTrackEligibility?.gap).toBe(300)

      store.payoffLiability('car1')

      // 状态派生立即可见，无陈旧 eligibility
      expect(p.expenses.carLoan).toBe(0)
      expect(p.totalExpenses).toBe(0)
      expect(p.passiveIncome).toBe(1200)
      expect(store.fastTrackEligibility?.eligible).toBe(true)
      expect(store.fastTrackEligibility?.gap).toBe(0)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
    })

    it('repayBankLoan 全部还清后同样触发重算', () => {
      const store = startCleaner()
      const p = store.players[0]
      makePlayerControlled(p)
      store.takeBankLoan(1000)
      const bankLoan = p.liabilities.find((l) => l.category === 'bank_loan')!
      store.repayBankLoan(bankLoan.id, 99999)
      // 车贷仍存在 → 不达标
      expect(store.canCurrentPlayerEnterFastTrack).toBe(false)
      store.payoffLiability('car1')
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
    })
  })

  describe('Scenario D：已满足条件 → 刷新 → 仍可进入（仍在 Rat Race）', () => {
    it('资格为派生状态，保存后重载仍为 true', () => {
      let store = startCleaner()
      let player = store.players[0]
      makePlayerControlled(player)
      store.payoffLiability('car1')
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
      expect(player.phase).toBe('rat_race')
      store.saveState?.()

      // 刷新页面（新建 pinia 自动 loadState）
      setActivePinia(createPinia())
      store = useGameStore()
      player = store.players[0]
      expect(player.phase).toBe('rat_race')
      expect(player.passiveIncome).toBe(1200)
      expect(store.canCurrentPlayerEnterFastTrack).toBe(true)
      expect(store.fastTrackEligibility?.eligible).toBe(true)
      // 刷新后可正常进入
      expect(store.enterFastTrack()).toBe(true)
      expect(player.phase).toBe('fast_track')
    })
  })

  describe('Scenario E：已进入 Fast Track → 刷新 → 仍处于 Fast Track', () => {
    it('phase 持久化，重载后仍为 fast_track', () => {
      let store = startCleaner()
      let player = store.players[0]
      makePlayerControlled(player)
      store.payoffLiability('car1')
      store.enterFastTrack()
      expect(player.phase).toBe('fast_track')
      store.saveState?.()

      setActivePinia(createPinia())
      store = useGameStore()
      player = store.players[0]
      expect(player.phase).toBe('fast_track')
      expect(player.fastTrackPosition).toBe(0)
    })
  })
})