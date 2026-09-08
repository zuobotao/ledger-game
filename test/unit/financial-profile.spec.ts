import { describe, expect, it } from 'vitest'
import { buildFinancialProfile } from '@/utils/financialProfile'
import type { Player } from '@/types/game'

const player = {
  id: 'p1',
  totalExpenses: 1000,
  passiveIncome: 500,
  cash: 3000,
  savings: 200,
  liabilities: [],
} as Player

describe('buildFinancialProfile', () => {
  it('returns four stable dimensions with evidence from the player history', () => {
    const result = buildFinancialProfile({
      player,
      transactions: [
        { id: 'd', playerId: 'p1', turnNumber: 1, type: 'savings_deposit', amount: -300, description: '存款', timestamp: 1 },
        { id: 'b', playerId: 'p1', turnNumber: 2, type: 'stock_buy', amount: -1200, description: '买入股票', timestamp: 2 },
        { id: 'l', playerId: 'p1', turnNumber: 3, type: 'bank_loan', amount: 500, description: '银行贷款', timestamp: 3 },
      ],
      cardHistory: [
        { id: 'c1', playerId: 'p1', turnNumber: 2, type: 'opportunity', cardId: 'big_stock_1', cardTitle: '大机会', cardDescription: '', action: 'accepted', timestamp: 2 },
      ],
    })

    expect(result.dimensions.map((item) => item.key)).toEqual([
      'cashflowPlanning', 'riskPreference', 'liquidityDiscipline', 'opportunitySelection',
    ])
    expect(result.dimensions.every((item) => item.score >= 0 && item.score <= 100)).toBe(true)
    expect(result.dimensions[1]?.evidence).toContainEqual({ label: '大机会接受', value: '1次' })
    expect(result.disclaimer).toContain('不代表心理诊断')
  })

  it('does not mix another player’s events into the report', () => {
    const result = buildFinancialProfile({
      player,
      transactions: [{ id: 'other', playerId: 'p2', turnNumber: 1, type: 'bank_loan', amount: 99999, description: '贷款', timestamp: 1 }],
      cardHistory: [],
    })

    expect(result.dimensions.find((item) => item.key === 'riskPreference')?.evidence).toContainEqual({ label: '贷款 / 偿还', value: '0 / 0' })
  })
})
