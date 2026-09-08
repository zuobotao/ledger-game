import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerFinancials from '@/gameplay/components/PlayerFinancials.vue'
import { useGameStore } from '@/stores/game'
import { recalcPlayerFinancials } from '@/engine/financialEngine'

describe('PlayerFinancials', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('surfaces the key financial relationships before the detailed sections', () => {
    const store = useGameStore()
    store.startGame(
      { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
      [{ name: '小明', colorId: 'red', careerId: 'software-engineer', dreamId: '' }],
    )
    const player = store.currentPlayer!
    player.cash = 1000
    player.savings = 500
    player.expenses = { taxes: 100, mortgage: 100, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 100, child: 0 }
    player.assets = [{ id: 'asset-1', name: '出租房', type: 'real_estate', cost: 1000, marketPrice: 1200, cashFlow: 150, quantity: 1 }]
    recalcPlayerFinancials(player)

    const wrapper = mount(PlayerFinancials, { props: { player } })
    const summaryText = wrapper.find('section').text()

    expect(summaryText).toContain('财务导航')
    expect(summaryText).toContain('净资产')
    expect(summaryText).toContain('$2,700')
    expect(summaryText).toContain('月现金流')
    expect(summaryText).toContain('被动收入覆盖')
    expect(summaryText).toContain('50%')
    expect(summaryText).toContain('税负占比')
    expect(summaryText).toContain('33%')
    expect(summaryText).toContain('现金流为正，可寻找增加被动收入的机会。')
  })
})
