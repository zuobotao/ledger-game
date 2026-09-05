import { describe, expect, it } from 'vitest'
import type { Player, OpportunityCard } from '@/types/game'
import {
  evaluateOpportunity,
  isBeyondReach,
  playerAvailableFunds,
  calcCashOnCash,
} from '@/engine/opportunityEvaluator'
import {
  rarityForSize,
  rarityWeight,
  bigCooldownRecovery,
  resolveOpportunityTier,
  RARITY_WEIGHT,
  DEFAULT_BIG_COOLDOWN_WINDOW,
} from '@/engine/opportunitySelector'

function makePlayer(over: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'T',
    colorId: 'red',
    careerId: 'cleaner',
    isAI: false,
    phase: 'rat_race',
    cash: 1000,
    savings: 500,
    assets: [],
    liabilities: [],
    expenses: { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 0, child: 0 },
    passiveIncome: 0,
    totalIncome: 0,
    totalExpenses: 0,
    cashFlow: 0,
    startingCash: 0,
    childrenCount: 0,
    ...over,
  }
}

function makeCard(over: Partial<OpportunityCard> = {}): OpportunityCard {
  return {
    id: 'c1',
    size: 'small',
    type: 'real_estate',
    title: 'Test',
    description: '',
    cost: 5000,
    cashFlow: 200,
    ...over,
  }
}

describe('OpportunityEvaluator', () => {
  it('可动用资金 = 现金 + 存款', () => {
    const p = makePlayer({ cash: 800, savings: 200 })
    expect(playerAvailableFunds(p)).toBe(1000)
  })

  it('金额足够 → full 参与，可全额购买', () => {
    const p = makePlayer({ cash: 8000, savings: 200 })
    const card = makeCard({ cost: 5000, downPayment: 5000 })
    const ev = evaluateOpportunity(p, card, 0)
    expect(ev.participation).toBe('full')
    expect(ev.canAfford).toBe(true)
    expect(ev.gap).toBe(0)
    expect(ev.cashOnCash).toBeCloseTo(200 / 5000, 5)
  })

  it('资金不足但贷款可覆盖缺口 → finance 融资参与', () => {
    const p = makePlayer({ cash: 1000, savings: 0 })
    const card = makeCard({ cost: 5000, downPayment: 5000 })
    const ev = evaluateOpportunity(p, card, 4000)
    expect(ev.participation).toBe('finance')
    expect(ev.canAfford).toBe(false)
    expect(ev.gap).toBe(4000)
  })

  it('资金与贷款都不足 → none，缺口明确，且 isBeyondReach 为 true', () => {
    const p = makePlayer({ cash: 500, savings: 0 })
    const card = makeCard({ cost: 5000, downPayment: 5000 })
    const ev = evaluateOpportunity(p, card, 0)
    expect(ev.participation).toBe('none')
    expect(ev.canAfford).toBe(false)
    expect(ev.gap).toBe(4500)
    expect(isBeyondReach(ev)).toBe(true)
  })

  it('现金投入回报 = 月现金流 / 投入', () => {
    expect(calcCashOnCash(makeCard({ cashFlow: 300, downPayment: 3000 }), 3000)).toBeCloseTo(0.1, 5)
  })
})

describe('OpportunitySelector', () => {
  it('大机会默认更高稀缺度', () => {
    expect(rarityForSize('big')).toBe('RARE')
    expect(rarityForSize('small')).toBe('COMMON')
    expect(RARITY_WEIGHT.LEGENDARY).toBeLessThan(RARITY_WEIGHT.COMMON)
  })

  it('无 rarity 时按 size 兜底权重', () => {
    expect(rarityWeight(makeCard({ size: 'small' }))).toBe(RARITY_WEIGHT.COMMON)
    expect(rarityWeight(makeCard({ size: 'big' }))).toBe(RARITY_WEIGHT.RARE)
    expect(rarityWeight(makeCard({ size: 'big', rarity: 'LEGENDARY' }))).toBe(RARITY_WEIGHT.LEGENDARY)
  })

  it('冷却恢复度：刚出现过低，窗口后恢复 1', () => {
    const win = DEFAULT_BIG_COOLDOWN_WINDOW
    expect(bigCooldownRecovery({ turnsSinceLastBig: 0, cooldownWindow: win })).toBeCloseTo(0.15, 5)
    expect(bigCooldownRecovery({ turnsSinceLastBig: win, cooldownWindow: win })).toBeCloseTo(1, 5)
    expect(
      bigCooldownRecovery({ turnsSinceLastBig: 2, cooldownWindow: win }),
    ).toBeGreaterThan(0.15)
  })

  it('非大机会格 → small', () => {
    const r = resolveOpportunityTier({
      landed: 'opportunity',
      funds: 99999,
      bigTierMinCost: 1000,
      bigCooldownRecovery: 1,
      unlockRatio: 1,
      roll: 0,
    })
    expect(r).toBe('small')
  })

  it('资金不足解锁门槛 → small（能力不足时降级，机会不强制以买不起方式呈现）', () => {
    const r = resolveOpportunityTier({
      landed: 'big_opportunity',
      funds: 500,
      bigTierMinCost: 5000,
      bigCooldownRecovery: 1,
      unlockRatio: 1,
      roll: 0,
    })
    expect(r).toBe('small')
  })

  it('资金达标且冷却恢复 → big', () => {
    const r = resolveOpportunityTier({
      landed: 'big_opportunity',
      funds: 6000,
      bigTierMinCost: 5000,
      bigCooldownRecovery: 1,
      unlockRatio: 1,
      roll: 0.9,
    })
    expect(r).toBe('big')
  })

  it('冷却未恢复时仍有概率兑现 big（保留随机性，不硬禁）', () => {
    // 冷却还是冷（0.3），但 roll 很低 → 仍可能触发 big
    const r = resolveOpportunityTier({
      landed: 'big_opportunity',
      funds: 6000,
      bigTierMinCost: 5000,
      bigCooldownRecovery: 0.3,
      unlockRatio: 1,
      roll: 0.05,
    })
    expect(r).toBe('big')
  })

  it('冷却冷 + 随机数高 → 降级 small', () => {
    const r = resolveOpportunityTier({
      landed: 'big_opportunity',
      funds: 6000,
      bigTierMinCost: 5000,
      bigCooldownRecovery: 0.3,
      unlockRatio: 1,
      roll: 0.9,
    })
    expect(r).toBe('small')
  })
})