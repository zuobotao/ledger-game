import { describe, expect, it } from 'vitest'
import { buildTurnReviews } from '@/utils/historyReview'

describe('buildTurnReviews', () => {
  it('groups cards and transactions by turn and derives financial deltas', () => {
    const result = buildTurnReviews(
      [
        {
          id: 'tx-1', turnNumber: 2, playerId: 'p1', type: 'stock_buy', amount: -500,
          description: '买入 AAPL 股票', timestamp: 2,
        },
        {
          id: 'tx-2', turnNumber: 3, playerId: 'p1', type: 'salary', amount: 1000,
          description: '发工资', timestamp: 3,
        },
      ],
      [
        {
          id: 'card-1', turnNumber: 2, playerId: 'p1', type: 'opportunity', cardId: 'o1',
          cardTitle: '科技股机会', cardDescription: '投资机会', action: 'accepted', amount: 500, timestamp: 2,
        },
      ],
      [
        { turn: 1, cash: 1000, totalAssets: 1000, totalLiabilities: 0, netWorth: 1000, totalIncome: 0, totalExpenses: 0, monthlyCashFlow: 0, stockValue: 0, realEstateValue: 0, businessValue: 0 },
        { turn: 2, cash: 500, totalAssets: 1500, totalLiabilities: 0, netWorth: 1500, totalIncome: 0, totalExpenses: 0, monthlyCashFlow: 0, stockValue: 500, realEstateValue: 0, businessValue: 0 },
        { turn: 3, cash: 1500, totalAssets: 2500, totalLiabilities: 0, netWorth: 2500, totalIncome: 1000, totalExpenses: 0, monthlyCashFlow: 1000, stockValue: 1000, realEstateValue: 0, businessValue: 0 },
      ],
    )

    expect(result.map((item) => item.turn)).toEqual([1, 2, 3])
    expect(result[1]).toMatchObject({
      landings: ['机会：科技股机会'],
      financial: { cashDelta: -500, assetsDelta: 500, netWorthDelta: 500 },
    })
    expect(result[1]!.actions).toEqual([
      { label: '科技股机会', amount: 500, kind: 'card', action: 'accepted' },
      { label: '买入 AAPL 股票', amount: -500, kind: 'transaction' },
    ])
  })

  it('keeps legacy turns without snapshots and estimates cash from transactions', () => {
    const result = buildTurnReviews(
      [{ id: 'tx-1', turnNumber: 4, playerId: 'p1', type: 'bank_loan', amount: 1000, description: '银行贷款', timestamp: 4 }],
      [],
      [],
    )

    expect(result).toEqual([
      {
        turn: 4,
        landings: ['财务操作'],
        actions: [{ label: '银行贷款', amount: 1000, kind: 'transaction' }],
        financial: { cashDelta: 1000, cash: 1000 },
      },
    ])
  })
})
