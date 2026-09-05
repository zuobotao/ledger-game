import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { recalcPlayerFinancials } from '@/engine/financialEngine'
import type { GameConfig } from '@/types/game'

// v2.4.1 P1：失业保险必须真正参与结算并对玩家可见。
// 修复点：失业+有失业保险时按"可工作现金流"（工资+被动-支出）赔付，
// 而不是按被清零工资后的 cashFlow，使失业保险赔付与实际损失匹配。
describe('v2.4.1 失业保险结算', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function setup(insurer: boolean): { store: ReturnType<typeof useGameStore>; player: ReturnType<typeof useGameStore>['players'][number] } {
    const store = useGameStore()
    store.startGame(
      {
        playerCount: 1,
        insurance: false,
        bigFamily: false,
        mortgage: false,
        fastStart: false,
        ageLimit: true,
      } as GameConfig,
      [{ name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' }],
    )
    const player = store.players[0]
    player.hasUnemploymentInsurance = insurer
    player.isUnemployed = true
    player.salary = 3000
    player.childrenCount = 0
    player.assets = []
    player.expenses = { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 1000, child: 0 }
    player.cash = 5000
    recalcPlayerFinancials(player)
    return { store, player }
  }

  it('失业+有失业保险：按覆盖工资后的现金流赔付，不产生实际损失', () => {
    const { store, player } = setup(true)
    const covered = player.salary + player.passiveIncome - player.totalExpenses
    expect(player.totalExpenses).toBe(1000)

    store.handlePayday(player)

    expect(player.cash).toBe(5000 + covered)
    const t = store.transactions.find((x) => x.type === 'unemployment_insurance_benefit')
    expect(t).toBeTruthy()
    expect(t!.amount).toBe(covered)
  })

  it('失业+无失业保险：仍需支付支出（作为损失）', () => {
    const { store, player } = setup(false)
    const loss = player.totalExpenses
    store.handlePayday(player)
    expect(player.cash).toBe(5000 - loss)
    expect(store.transactions.some((x) => x.type === 'expense' && x.amount === -loss)).toBe(true)
  })

  it('就业+有失业保险：先扣保费再发工资，保费单独入账且未与失业赔付混淆', () => {
    const store = useGameStore()
    store.startGame(
      {
        playerCount: 1,
        insurance: false,
        bigFamily: false,
        mortgage: false,
        fastStart: false,
        ageLimit: true,
      } as GameConfig,
      [{ name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' }],
    )
    const player = store.players[0]
    player.hasUnemploymentInsurance = true
    player.childrenCount = 0
    player.cash = 5000
    recalcPlayerFinancials(player)

    store.handlePayday(player)

    // 就业 payday：记录保费并发放工资
    const premium = store.transactions.find((x) => x.type === 'unemployment_insurance_premium')
    const salary = store.transactions.find((x) => x.type === 'salary')
    expect(premium).toBeTruthy()
    expect(premium!.amount).toBeLessThan(0)
    expect(salary).toBeTruthy()
  })
})