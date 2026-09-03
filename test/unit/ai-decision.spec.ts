import { describe, expect, it } from 'vitest'
import { decideBuyOpportunity } from '@/utils/aiDecision'
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
