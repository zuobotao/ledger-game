import { describe, expect, it } from 'vitest'
import { getDreamPassiveIncomeRequirement } from '@/data/dreams'
import { capitalCashFlowOf } from '@/engine/financialEngine'
import { capitalGoalOf } from '@/gameplay/presentation'
import type { Dream, Player } from '@/types/game'

const dream: Dream = {
  id: 'dream-test',
  name: '测试梦想',
  description: '测试目标',
  price: 1_200_000,
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    cash: 500_000,
    savings: 0,
    passiveIncome: 120_000,
    totalExpenses: 20_000,
    salary: 300_000,
    cashFlow: 400_000,
    dream,
    ...overrides,
  } as Player
}

describe('capital game rules', () => {
  it('uses passive income minus expenses and excludes salary', () => {
    expect(capitalCashFlowOf(player())).toBe(100_000)
  })

  it('uses the dream price and passive-income requirement as the only goal', () => {
    const goal = capitalGoalOf(player())
    expect(goal.cashRequired).toBe(dream.price)
    expect(goal.passiveRequired).toBe(getDreamPassiveIncomeRequirement(dream))
    expect(goal.cashPercent).toBeCloseTo(500_000 / 1_200_000 * 100)
  })

  it('can represent a fully reached capital goal', () => {
    const goal = capitalGoalOf(player({ cash: dream.price, passiveIncome: getDreamPassiveIncomeRequirement(dream) }))
    expect(goal.cashPercent).toBe(100)
    expect(goal.passivePercent).toBe(100)
  })
})
