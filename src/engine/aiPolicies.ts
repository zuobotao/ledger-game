/**
 * AI Policies — DecisionPolicy 接口与三种策略实现
 *
 * 提供可插拔的 AI 决策策略，用于不同难度等级。
 * 与 src/utils/aiDecision.ts 并存，不替代原有逻辑。
 */

import { RandomSource } from '@/engine/randomSource'
import type { GameObservation } from '@/engine/aiTypes'
import { BANK_CONFIG } from '@/types/game'

// ==================== 接口定义 ====================

/** 买入决策结果 */
export interface BuyDecision {
  buy: boolean
  quantity: number
}

/**
 * 决策策略接口。
 * 每个方法接收 GameObservation 和 RandomSource，
 * 返回确定性（相同 seed 可复现）的决策结果。
 */
export interface DecisionPolicy {
  /** 策略名称，用于调试和日志 */
  readonly name: string

  /** 决定是否买入机会卡以及买入数量 */
  decideBuyOpportunity(obs: GameObservation, random: RandomSource): BuyDecision

  /** 决定是否卖出股票 */
  decideSellStock(
    obs: GameObservation,
    symbol: string,
    currentPrice: number,
    random: RandomSource,
  ): { sell: boolean; quantity: number }

  /** 决定是否参与慈善 */
  decideCharity(obs: GameObservation, donationAmount: number, random: RandomSource): boolean

  /** 决定是否贷款以及贷款金额 */
  decideTakeLoan(obs: GameObservation, random: RandomSource): { take: boolean; amount: number }

  /** 决定是否还款以及还款金额 */
  decideRepayLoan(obs: GameObservation, random: RandomSource): { repay: boolean; amount: number }
}

// ==================== 辅助函数 ====================

/**
 * 估算机会卡的年化 ROI。
 * 股票：基于价格水平估算（低价股预期回报高）
 * 其他：cashFlow / cost * 12
 */
function estimateROI(obs: GameObservation): number {
  const card = obs.pendingCard
  if (!card) return 0

  if (card.type === 'stock') {
    const price = card.cost
    if (price <= 0) return 0
    if (price < 15) return 1.5 + 0.5 // 150% - 200%
    if (price < 40) return 0.5 + 0.25 // 50% - 75%
    return 0.2 + 0.15 // 20% - 35%
  }

  const costBasis = card.cost
  if (costBasis <= 0) return 0
  const monthlyROI = card.cashFlow / costBasis
  return monthlyROI * 12
}

/**
 * 计算最大可贷款金额
 */
function getMaxLoanAmount(obs: GameObservation): number {
  const maxTotalLoan = obs.totalIncome * BANK_CONFIG.maxLoanMultiple
  const remaining = Math.max(0, maxTotalLoan - obs.totalBankLoan)
  return Math.floor(remaining / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
}

/**
 * 在 base 附近加入随机抖动（±variance%）
 */
function jitter(base: number, variance: number, random: RandomSource): number {
  const factor = 1 - variance + random.next() * variance * 2
  return Math.max(0, base * factor)
}

/**
 * 估算股票的平均成本基础
 */
function estimateAvgCost(obs: GameObservation): number {
  if (obs.stockCount <= 0) return 0
  return obs.stockValue / obs.stockCount
}

// ==================== 保守策略 (Easy) ====================

export class ConservativePolicy implements DecisionPolicy {
  readonly name = 'Conservative'

  decideBuyOpportunity(obs: GameObservation, random: RandomSource): BuyDecision {
    const card = obs.pendingCard
    if (!card) return { buy: false, quantity: 0 }

    const roi = estimateROI(obs)

    // 保守：ROI 必须 > 12%
    if (roi < 0.12) return { buy: false, quantity: 0 }

    // 只买低价股（< $15）
    if (card.type === 'stock' && card.cost >= 15) {
      return { buy: false, quantity: 0 }
    }

    // 最多用 30% 现金
    const investableFunds = obs.cash * jitter(0.3, 0.1, random)

    if (investableFunds < card.cost) return { buy: false, quantity: 0 }

    let quantity = Math.floor(investableFunds / card.cost)
    if (card.type !== 'stock') quantity = Math.min(quantity, 1)
    if (quantity < 1) return { buy: false, quantity: 0 }

    return { buy: true, quantity }
  }

  decideSellStock(
    obs: GameObservation,
    _symbol: string,
    currentPrice: number,
    _random: RandomSource,
  ): { sell: boolean; quantity: number } {
    if (obs.stockCount <= 0) return { sell: false, quantity: 0 }

    const avgCost = estimateAvgCost(obs)
    if (avgCost <= 0) return { sell: false, quantity: 0 }

    const profitRatio = (currentPrice - avgCost) / avgCost

    // 保守：盈利 30% 全卖，亏损 20% 止损
    if (profitRatio >= 0.3) return { sell: true, quantity: obs.stockCount }
    if (profitRatio <= -0.2) return { sell: true, quantity: obs.stockCount }

    return { sell: false, quantity: 0 }
  }

  decideCharity(obs: GameObservation, donationAmount: number, _random: RandomSource): boolean {
    // 保守：不参与慈善
    return false
  }

  decideTakeLoan(_obs: GameObservation, _random: RandomSource): { take: boolean; amount: number } {
    // 保守：不主动贷款
    return { take: false, amount: 0 }
  }

  decideRepayLoan(obs: GameObservation, _random: RandomSource): {
    repay: boolean
    amount: number
  } {
    if (obs.totalBankLoan <= 0) return { repay: false, amount: 0 }

    // 保持 3 个月支出储备
    const reserve = obs.totalExpenses * 3
    const surplus = obs.cash - reserve
    if (surplus <= 0) return { repay: false, amount: 0 }

    // 80% 闲置现金用于还款
    let repayAmount = Math.min(surplus * 0.8, obs.totalBankLoan)
    repayAmount = Math.floor(repayAmount / 100) * 100

    if (repayAmount <= 0) return { repay: false, amount: 0 }
    return { repay: true, amount: repayAmount }
  }
}

// ==================== 均衡策略 (Medium) ====================

export class BalancedPolicy implements DecisionPolicy {
  readonly name = 'Balanced'

  decideBuyOpportunity(obs: GameObservation, random: RandomSource): BuyDecision {
    const card = obs.pendingCard
    if (!card) return { buy: false, quantity: 0 }

    const roi = estimateROI(obs)

    // 均衡：ROI > 8%
    if (roi < 0.08) return { buy: false, quantity: 0 }

    // 最多用 55% 现金
    let investableFunds = obs.cash * jitter(0.55, 0.1, random)

    // 如果 ROI > 15%，考虑贷款
    if (roi > 0.15) {
      const maxLoan = obs.totalIncome * 5
      const additionalLoan = Math.max(0, maxLoan - obs.totalBankLoan)
      investableFunds += additionalLoan * jitter(0.5, 0.2, random)
    }

    if (investableFunds < card.cost) return { buy: false, quantity: 0 }

    let quantity = Math.floor(investableFunds / card.cost)
    if (card.type !== 'stock') quantity = Math.min(quantity, 1)
    if (quantity < 1) return { buy: false, quantity: 0 }

    return { buy: true, quantity }
  }

  decideSellStock(
    obs: GameObservation,
    _symbol: string,
    currentPrice: number,
    _random: RandomSource,
  ): { sell: boolean; quantity: number } {
    if (obs.stockCount <= 0) return { sell: false, quantity: 0 }

    const avgCost = estimateAvgCost(obs)
    if (avgCost <= 0) return { sell: false, quantity: 0 }

    const profitRatio = (currentPrice - avgCost) / avgCost

    // 均衡：翻倍全卖，亏损 30% 止损
    if (profitRatio >= 1.0) return { sell: true, quantity: obs.stockCount }
    if (profitRatio <= -0.3) return { sell: true, quantity: obs.stockCount }

    // 盈利 50% 卖一半
    if (profitRatio >= 0.5) {
      return { sell: true, quantity: Math.ceil(obs.stockCount * 0.5) }
    }

    return { sell: false, quantity: 0 }
  }

  decideCharity(obs: GameObservation, donationAmount: number, random: RandomSource): boolean {
    if (obs.cash < donationAmount) return false
    // 50% 概率参与
    return random.next() < 0.5
  }

  decideTakeLoan(obs: GameObservation, _random: RandomSource): {
    take: boolean
    amount: number
  } {
    const maxLoan = getMaxLoanAmount(obs)
    if (maxLoan < BANK_CONFIG.minLoanAmount) return { take: false, amount: 0 }

    // 均衡：贷款不超过月收入 × 5
    const targetTotal = obs.totalIncome * 5
    const desired = Math.max(0, targetTotal - obs.totalBankLoan)
    const loanAmount = Math.min(desired, maxLoan)
    const rounded = Math.floor(loanAmount / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep

    if (rounded < BANK_CONFIG.minLoanAmount) return { take: false, amount: 0 }
    return { take: true, amount: rounded }
  }

  decideRepayLoan(obs: GameObservation, _random: RandomSource): {
    repay: boolean
    amount: number
  } {
    if (obs.totalBankLoan <= 0) return { repay: false, amount: 0 }

    const reserve = obs.totalExpenses * 3
    const surplus = obs.cash - reserve
    if (surplus <= 0) return { repay: false, amount: 0 }

    // 40% 闲置现金用于还款
    let repayAmount = Math.min(surplus * 0.4, obs.totalBankLoan)
    repayAmount = Math.floor(repayAmount / 100) * 100

    if (repayAmount <= 0) return { repay: false, amount: 0 }
    return { repay: true, amount: repayAmount }
  }
}

// ==================== 激进策略 (Hard) ====================

export class AggressivePolicy implements DecisionPolicy {
  readonly name = 'Aggressive'

  decideBuyOpportunity(obs: GameObservation, random: RandomSource): BuyDecision {
    const card = obs.pendingCard
    if (!card) return { buy: false, quantity: 0 }

    const roi = estimateROI(obs)

    // 激进：ROI > 5% 就考虑
    if (roi < 0.05) return { buy: false, quantity: 0 }

    // 最多用 85% 现金
    let investableFunds = obs.cash * jitter(0.85, 0.1, random)

    // 积极使用杠杆
    const maxLoan = obs.totalIncome * 9
    const additionalLoan = Math.max(0, maxLoan - obs.totalBankLoan)
    investableFunds += additionalLoan * jitter(0.8, 0.2, random)

    if (investableFunds < card.cost) return { buy: false, quantity: 0 }

    let quantity = Math.floor(investableFunds / card.cost)
    if (card.type !== 'stock') quantity = Math.min(quantity, 1)
    if (quantity < 1) return { buy: false, quantity: 0 }

    return { buy: true, quantity }
  }

  decideSellStock(
    obs: GameObservation,
    _symbol: string,
    currentPrice: number,
    _random: RandomSource,
  ): { sell: boolean; quantity: number } {
    if (obs.stockCount <= 0) return { sell: false, quantity: 0 }

    const avgCost = estimateAvgCost(obs)
    if (avgCost <= 0) return { sell: false, quantity: 0 }

    const profitRatio = (currentPrice - avgCost) / avgCost

    // 激进：盈利 200% 才全卖，亏损 50% 才止损
    if (profitRatio >= 2.0) return { sell: true, quantity: obs.stockCount }
    if (profitRatio <= -0.5) return { sell: true, quantity: obs.stockCount }

    // 盈利 100% 卖 30%
    if (profitRatio >= 1.0) {
      return { sell: true, quantity: Math.ceil(obs.stockCount * 0.3) }
    }

    return { sell: false, quantity: 0 }
  }

  decideCharity(obs: GameObservation, donationAmount: number, _random: RandomSource): boolean {
    if (obs.cash < donationAmount) return false
    // 激进：一定参与慈善（双骰更有利）
    return true
  }

  decideTakeLoan(obs: GameObservation, _random: RandomSource): {
    take: boolean
    amount: number
  } {
    const maxLoan = getMaxLoanAmount(obs)
    if (maxLoan < BANK_CONFIG.minLoanAmount) return { take: false, amount: 0 }

    // 激进：贷款用到月收入 × 9
    const targetTotal = obs.totalIncome * 9
    const desired = Math.max(0, targetTotal - obs.totalBankLoan)
    const loanAmount = Math.min(desired, maxLoan)
    const rounded = Math.floor(loanAmount / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep

    if (rounded < BANK_CONFIG.minLoanAmount) return { take: false, amount: 0 }
    return { take: true, amount: rounded }
  }

  decideRepayLoan(obs: GameObservation, _random: RandomSource): {
    repay: boolean
    amount: number
  } {
    if (obs.totalBankLoan <= 0) return { repay: false, amount: 0 }

    // 保持 6 个月支出储备，只用 10% 闲置现金还款
    const reserve = obs.totalExpenses * 6
    const surplus = obs.cash - reserve
    if (surplus <= 0) return { repay: false, amount: 0 }

    let repayAmount = Math.min(surplus * 0.1, obs.totalBankLoan)
    repayAmount = Math.floor(repayAmount / 100) * 100

    if (repayAmount <= 0) return { repay: false, amount: 0 }
    return { repay: true, amount: repayAmount }
  }
}

// ==================== 策略映射 ====================

/** 根据难度获取对应的决策策略 */
export function getPolicyForDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
): DecisionPolicy {
  switch (difficulty) {
    case 'easy':
      return new ConservativePolicy()
    case 'medium':
      return new BalancedPolicy()
    case 'hard':
      return new AggressivePolicy()
    default:
      return new BalancedPolicy()
  }
}

/** 预创建的策略实例（单例，避免重复创建） */
export const policies = {
  conservative: new ConservativePolicy(),
  balanced: new BalancedPolicy(),
  aggressive: new AggressivePolicy(),
} as const