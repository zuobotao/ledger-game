import type { Player, OpportunityCard, Asset } from '@/types/game'
import { BANK_CONFIG } from '@/types/game'

// AI 难度
export type AIDifficulty = 'easy' | 'medium' | 'hard'

// ==================== 内部辅助函数 ====================

/**
 * 计算机会卡的预期年化 ROI
 * - 股票：基于当前价格与历史波动的估算（简化模型：低价买入预期盈利 50%-200%）
 * - 房产/企业：cashFlow / cost = 月 ROI，年化 ROI = 月 ROI × 12
 */
function estimateROI(card: OpportunityCard): number {
  if (card.type === 'stock') {
    // 股票简化模型：价格越低，预期 ROI 越高
    // 参考：低价股 < $15 预期盈利 100%-200%；中价 $15-$40 预期 50%-100%；高价 > $40 预期 20%-50%
    const price = card.cost
    if (price <= 0) return 0
    if (price < 15) {
      return 1.5 + Math.random() * 1.0 // 150% - 250%
    } else if (price < 40) {
      return 0.5 + Math.random() * 0.5 // 50% - 100%
    } else {
      return 0.2 + Math.random() * 0.3 // 20% - 50%
    }
  }

  // 房产 / 企业 / 其他：用现金流计算年化 ROI
  if (card.cost <= 0) return 0
  const monthlyROI = card.cashFlow / card.cost
  return monthlyROI * 12
}

/**
 * 获取玩家当前的银行贷款总额
 */
function getBankLoanAmount(player: Player): number {
  const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
  return bankLoan?.amount ?? 0
}

/**
 * 计算玩家还能借多少银行贷款（上限：月收入 × 10 - 已借）
 */
function getMaxAdditionalLoan(player: Player): number {
  const currentLoan = getBankLoanAmount(player)
  const maxTotalLoan = player.totalIncome * BANK_CONFIG.maxLoanMultiple
  const remaining = Math.max(0, maxTotalLoan - currentLoan)
  return Math.floor(remaining / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
}

/**
 * 在给定范围内加入随机扰动，使决策不完全确定
 */
function randomFactor(base: number, variance: number): number {
  const factor = 1 - variance + Math.random() * variance * 2
  return Math.max(0, base * factor)
}

// ==================== 1. 买入机会决策 ====================

/**
 * 决策：是否买入机会卡，以及买入数量
 *
 * @returns { buy: boolean; quantity: number }
 */
export function decideBuyOpportunity(
  player: Player,
  card: OpportunityCard,
  difficulty: AIDifficulty,
): { buy: boolean; quantity: number } {
  const roi = estimateROI(card)
  const availableCash = player.cash

  // 不同难度的配置
  const config = {
    easy: {
      minROI: 0.05, // ROI > 5%
      maxCashRatio: 0.3, // 最多用 30% 现金
      maxLoanRatio: 0, // 几乎不贷款
      stockMaxPrice: 15, // 只买低价股
      willLoan: false,
    },
    medium: {
      minROI: 0.08, // ROI > 8%
      maxCashRatio: 0.55, // 用 50-60% 现金
      maxLoanRatio: 5, // 贷款不超过月收入 × 5
      stockMaxPrice: Infinity,
      willLoan: roi > 0.15, // ROI > 15% 才考虑贷款
    },
    hard: {
      minROI: 0.1, // ROI > 10%
      maxCashRatio: 0.85, // 用 80-90% 现金
      maxLoanRatio: 9, // 贷款用到月收入 × 8-10
      stockMaxPrice: Infinity,
      willLoan: true, // 积极使用杠杆
    },
  }[difficulty]

  // 简单难度只买低价股
  if (difficulty === 'easy' && card.type === 'stock' && card.cost >= config.stockMaxPrice) {
    return { buy: false, quantity: 0 }
  }

  // ROI 不达门槛，不买
  if (roi < config.minROI) {
    return { buy: false, quantity: 0 }
  }

  // 计算可投入资金
  let investableFunds = availableCash * randomFactor(config.maxCashRatio, 0.1)

  // 如果考虑贷款，加上可贷额度
  if (config.willLoan && config.maxLoanRatio > 0) {
    const maxLoan = player.totalIncome * config.maxLoanRatio
    const currentLoan = getBankLoanAmount(player)
    const additionalLoan = Math.max(0, maxLoan - currentLoan)
    investableFunds += additionalLoan * randomFactor(0.7, 0.2)
  }

  // 买不起一份
  if (investableFunds < card.cost) {
    return { buy: false, quantity: 0 }
  }

  // 计算可买数量
  let quantity = Math.floor(investableFunds / card.cost)

  // 股票受 maxQuantity 限制
  if (card.maxQuantity && card.type === 'stock') {
    quantity = Math.min(quantity, card.maxQuantity)
  }

  // 非股票类（房产/企业）一般只能买 1 份
  if (card.type !== 'stock') {
    quantity = Math.min(quantity, 1)
  }

  // 确保至少买 1 份
  if (quantity < 1) {
    return { buy: false, quantity: 0 }
  }

  return { buy: true, quantity }
}

// ==================== 2. 市场事件卖出决策 ====================

/**
 * 决策：市场事件中卖出多少数量的资产
 *
 * @returns 卖出数量
 */
export function decideSellMarket(
  player: Player,
  asset: Asset,
  sellPrice: number,
  difficulty: AIDifficulty,
): number {
  if (asset.quantity <= 0) return 0

  const costBasis = asset.cost // 买入成本单价
  const profitRatio = (sellPrice - costBasis) / costBasis // 盈亏比例

  const config = {
    easy: {
      takeProfit: 0.3, // 盈利 30% 全卖
      stopLoss: -0.2, // 亏损 20% 止损
      partialSellRatio: 0, // 不部分卖出
      partialSellThreshold: 999, // 不触发部分卖出
    },
    medium: {
      takeProfit: 1.0, // 翻倍全卖
      stopLoss: -0.3, // 亏损 30% 止损
      partialSellRatio: 0.5, // 盈利 50% 卖一半
      partialSellThreshold: 0.5,
    },
    hard: {
      takeProfit: 2.0, // 盈利 200% 才全卖
      stopLoss: -0.5, // 亏损 50% 才止损
      partialSellRatio: 0.3, // 盈利 100% 卖 30%
      partialSellThreshold: 1.0,
    },
  }[difficulty]

  // 达到止损线，全部卖出
  if (profitRatio <= config.stopLoss) {
    return asset.quantity
  }

  // 达到止盈线，全部卖出
  if (profitRatio >= config.takeProfit) {
    return asset.quantity
  }

  // 中等难度：盈利超过部分卖出阈值，卖一半
  if (difficulty === 'medium' && profitRatio >= config.partialSellThreshold) {
    return Math.ceil(asset.quantity * config.partialSellRatio)
  }

  // 困难难度：盈利超过部分卖出阈值，卖一小部分
  if (difficulty === 'hard' && profitRatio >= config.partialSellThreshold) {
    return Math.ceil(asset.quantity * config.partialSellRatio)
  }

  // 简单难度：盈利未达止盈线就不卖，亏损未到止损也不卖
  // 其他情况：不卖，继续持有
  return 0
}

// ==================== 3. 银行贷款决策 ====================

/**
 * 决策：是否贷款以及贷款金额
 * 注：此函数用于主动贷款决策（非强制），通常在有好机会时调用
 *
 * @returns 贷款金额，0 表示不贷
 */
export function decideBankLoan(
  player: Player,
  difficulty: AIDifficulty,
  opportunityROI?: number,
): number {
  const currentLoan = getBankLoanAmount(player)
  const maxLoan = player.totalIncome * BANK_CONFIG.maxLoanMultiple
  const remainingCapacity = Math.max(0, maxLoan - currentLoan)

  if (remainingCapacity < BANK_CONFIG.minLoanAmount) {
    return 0 // 已达上限或剩余不足最小贷款额
  }

  const config = {
    easy: {
      // 几乎不贷款，只有现金非常少且有好机会时才考虑
      minCash: 500,
      maxLoanRatio: 1, // 最多月收入 × 1
      minROI: 0.2, // ROI > 20% 才考虑
    },
    medium: {
      minCash: 0,
      maxLoanRatio: 5, // 最多月收入 × 5
      minROI: 0.15, // ROI > 15% 才考虑
    },
    hard: {
      minCash: 0,
      maxLoanRatio: 9, // 最多月收入 × 8-10
      minROI: 0.08, // ROI > 8% 就考虑
    },
  }[difficulty]

  // 简单难度：现金充足就不贷
  if (difficulty === 'easy' && player.cash >= config.minCash) {
    return 0
  }

  // 如果有明确的机会 ROI，检查是否达到门槛
  if (opportunityROI !== undefined && opportunityROI < config.minROI) {
    return 0
  }

  // 计算目标贷款总额
  const targetTotalLoan = player.totalIncome * config.maxLoanRatio
  const desiredAdditional = Math.max(0, targetTotalLoan - currentLoan)

  // 受剩余额度限制
  const loanAmount = Math.min(desiredAdditional, remainingCapacity)

  // 向下取整到贷款步长
  const rounded = Math.floor(loanAmount / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep

  if (rounded < BANK_CONFIG.minLoanAmount) {
    return 0
  }

  return rounded
}

// ==================== 4. 还款决策 ====================

/**
 * 决策：是否还款以及还款金额
 *
 * @returns 还款金额，0 表示不还
 */
export function decideRepayLoan(
  player: Player,
  difficulty: AIDifficulty,
): number {
  const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
  if (!bankLoan || bankLoan.amount <= 0) {
    return 0 // 没有贷款
  }

  const monthlyExpenses = player.totalExpenses
  const cash = player.cash

  const config = {
    easy: {
      // 有闲置现金就优先还
      minReserveMonths: 3, // 保持 3 个月支出的储备
      repayRatio: 0.8, // 闲置现金的 80% 用于还款
    },
    medium: {
      minReserveMonths: 3, // 保持 3 个月支出
      repayRatio: 0.4, // 闲置现金的 40% 用于还款
    },
    hard: {
      // 优先投资不还款，只有现金非常充裕时才还
      minReserveMonths: 6, // 保持 6 个月支出
      repayRatio: 0.1, // 只用 10% 闲置现金还款
    },
  }[difficulty]

  // 计算安全储备金
  const reserve = monthlyExpenses * config.minReserveMonths

  // 现金不足以覆盖储备，不还款
  if (cash <= reserve) {
    return 0
  }

  // 闲置现金
  const surplus = cash - reserve

  // 还款金额
  let repayAmount = surplus * config.repayRatio

  // 不能超过贷款余额
  repayAmount = Math.min(repayAmount, bankLoan.amount)

  // 向下取整到 100 的整数（保持整洁）
  repayAmount = Math.floor(repayAmount / 100) * 100

  if (repayAmount <= 0) {
    return 0
  }

  return repayAmount
}

// ==================== 5. 保险购买决策 ====================

/**
 * 决策：是否购买保险
 *
 * @returns true = 买，false = 不买
 */
export function decideBuyInsurance(
  player: Player,
  difficulty: AIDifficulty,
): boolean {
  // 已经有保险了就不买
  if (player.hasInsurance) {
    return false
  }

  switch (difficulty) {
    case 'easy':
      // 一定买
      return true
    case 'medium':
      // 买，除非现金非常紧张
      return player.cash >= player.totalExpenses * 0.5
    case 'hard':
      // 不买（节省成本，风险自担）
      return false
    default:
      return false
  }
}

// ==================== 6. 慈善决策 ====================

/**
 * 决策：是否接受慈善（捐赠换双骰）
 *
 * @param donationAmount 捐赠金额（通常为收入的 10%）
 * @returns true = 参与，false = 不参与
 */
export function decideCharity(
  player: Player,
  donationAmount: number,
  difficulty: AIDifficulty,
): boolean {
  // 现金不够就不参与
  if (player.cash < donationAmount) {
    return false
  }

  switch (difficulty) {
    case 'easy':
      // 不参与
      return false
    case 'medium':
      // 50% 概率参与
      return Math.random() < 0.5
    case 'hard':
      // 积极参与（双骰 = 更多机会）
      // 只要现金足够就参与
      return true
    default:
      return false
  }
}

// ==================== 汇总导出 ====================

export const AIDecision = {
  decideBuyOpportunity,
  decideSellMarket,
  decideBankLoan,
  decideRepayLoan,
  decideBuyInsurance,
  decideCharity,
}

export default AIDecision
