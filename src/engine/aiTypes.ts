/**
 * AI Types — GameObservation
 *
 * 为 AI 决策提供精简的游戏状态视图。
 * 不直接暴露 Player 和 GameState，只暴露 AI 需要的信息。
 */

import type { Player, GameState, OpportunityCard } from '@/types/game'

/**
 * AI 决策所需的游戏观察数据。
 * 与完整 Player/GameState 解耦，便于测试和策略迭代。
 */
export interface GameObservation {
  playerId: string
  phase: 'rat_race' | 'fast_track'
  cash: number
  cashFlow: number
  totalIncome: number
  totalExpenses: number
  passiveIncome: number
  netWorth: number
  salary: number
  childrenCount: number
  isUnemployed: boolean
  ageMonths: number

  /** 资产汇总 */
  stockCount: number
  stockValue: number
  realEstateCount: number
  businessCount: number

  /** 负债汇总 */
  totalBankLoan: number
  totalOtherLiabilities: number

  /** 当前待处理的机会卡（如果有） */
  pendingCard?: {
    type: string
    cost: number
    cashFlow: number
    symbol?: string
  }

  /** 游戏配置 */
  isAgeLimit: boolean
  isFastStart: boolean
}

/**
 * 从 Player 和 GameState 创建 GameObservation。
 *
 * @param player - 当前玩家
 * @param state - 游戏状态（用于获取 pendingCard 和 config）
 * @returns 精简的观察数据
 */
export function createObservation(player: Player, state: GameState): GameObservation {
  const stockAssets = player.assets.filter((a) => a.type === 'stock')
  const realEstateAssets = player.assets.filter((a) => a.type === 'real_estate')
  const businessAssets = player.assets.filter((a) => a.type === 'business')

  const stockCount = stockAssets.reduce((sum, a) => sum + a.quantity, 0)
  const stockValue = stockAssets.reduce(
    (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity,
    0,
  )
  const realEstateCount = realEstateAssets.reduce((sum, a) => sum + a.quantity, 0)
  const businessCount = businessAssets.reduce((sum, a) => sum + a.quantity, 0)

  const totalBankLoan = player.liabilities
    .filter((l) => l.category === 'bank_loan')
    .reduce((sum, l) => sum + l.amount, 0)

  const totalOtherLiabilities = player.liabilities
    .filter((l) => l.category !== 'bank_loan')
    .reduce((sum, l) => sum + l.amount, 0)

  const totalAssetValue =
    player.cash +
    player.savings +
    player.assets.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)

  const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)

  const netWorth = totalAssetValue - totalLiabilities

  // 提取 pendingCard 信息
  let pendingCard: GameObservation['pendingCard'] | undefined
  const pendingAction = state.pendingAction
  if (pendingAction?.card && 'type' in pendingAction.card) {
    const card = pendingAction.card as OpportunityCard
    pendingCard = {
      type: card.type,
      cost: card.cost,
      cashFlow: card.cashFlow,
      symbol: card.symbol,
    }
  }

  return {
    playerId: player.id,
    phase: player.phase,
    cash: player.cash,
    cashFlow: player.cashFlow,
    totalIncome: player.totalIncome,
    totalExpenses: player.totalExpenses,
    passiveIncome: player.passiveIncome,
    netWorth,
    salary: player.salary,
    childrenCount: player.childrenCount,
    isUnemployed: player.isUnemployed,
    ageMonths: player.ageMonths,
    stockCount,
    stockValue,
    realEstateCount,
    businessCount,
    totalBankLoan,
    totalOtherLiabilities,
    pendingCard,
    isAgeLimit: state.config.ageLimit,
    isFastStart: state.config.fastStart,
  }
}