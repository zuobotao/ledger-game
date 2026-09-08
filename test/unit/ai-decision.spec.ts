import { describe, expect, it } from 'vitest'
import { decideBuyOpportunity, evaluateAIOpportunity } from '@/utils/aiDecision'
import { CAREERS } from '@/data/careers'
import type { Player, OpportunityCard } from '@/types/game'

function createTestPlayer(cash: number): Player {
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
    totalExpenses: 0,
    cashFlow: 0,
    cash,
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
  }
}

function createStockCard(cost: number): OpportunityCard {
  return {
    id: 'test',
    type: 'stock',
    size: 'small',
    title: 'Test Stock',
    description: 'Test',
    symbol: 'NOVA',
    cost,
    cashFlow: 0,
    quantity: 1,
  } as OpportunityCard
}

describe('AI Decision', () => {
  it('should favor cash-flow opportunities when the player is short of passive income', () => {
    const player = createTestPlayer(20_000)
    player.totalExpenses = 2_000
    player.cashFlow = 100
    const card: OpportunityCard = {
      id: 'rental',
      type: 'real_estate',
      size: 'small',
      title: '出租公寓',
      description: '每月产生现金流',
      cost: 10_000,
      downPayment: 10_000,
      totalValue: 10_000,
      cashFlow: 800,
    }
    const evaluation = evaluateAIOpportunity(player, card, 'medium')
    expect(evaluation.reason).toBe('cashflow_gap')
    expect(evaluation.monthlyCashFlowGain).toBe(800)
    expect(decideBuyOpportunity(player, card, 'medium').buy).toBe(true)
  })

  it('should protect a cash-poor player from buying a zero-cash-flow stock', () => {
    const player = createTestPlayer(1_000)
    player.totalExpenses = 1_000
    player.cashFlow = -500
    const decision = decideBuyOpportunity(player, createStockCard(10), 'medium')
    expect(decision).toEqual({ buy: false, quantity: 0 })
  })

  it('should return a valid buy decision', () => {
    const player = createTestPlayer(10000)
    const card = createStockCard(10)
    const decision = decideBuyOpportunity(player, card, 'medium')
    expect(typeof decision.buy).toBe('boolean')
    expect(decision.quantity).toBeGreaterThanOrEqual(0)
  })

  it('easy AI should not buy expensive stocks', () => {
    const player = createTestPlayer(10000)
    const card = createStockCard(100)
    const decision = decideBuyOpportunity(player, card, 'easy')
    expect(decision.buy).toBe(false)
    expect(decision.quantity).toBe(0)
  })
})
