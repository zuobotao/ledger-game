/**
 * StateEvaluator — 可插拔状态评价器
 *
 * 职责：
 * - 对游戏状态变化进行评分
 * - 支持多种评价策略（财务、策略、风险等）
 * - 为 AI 决策和 Simulation 分支比较提供可替换的评价机制
 *
 * 原则：
 * - 评价器为纯函数，不修改状态
 * - 可插拔：通过接口抽象，支持替换实现
 * - 每个维度独立评分，最终综合
 */

import type { GameState, Player } from '@/types/game'
import { calcPlayerNetWorth } from './financialEngine'

// ==================== EvaluationScore ====================

/**
 * 评价分数，包含多个维度。
 * - total: 综合评分（越高越好）
 * - 各维度独立评分，便于分析和调试
 */
export interface EvaluationScore {
  /** 综合评分 */
  total: number
  /** 净值维度 */
  netWorth: number
  /** 现金流维度 */
  cashFlow: number
  /** 流动性维度（现金/月支出比率） */
  liquidity: number
  /** 风险维度（越高越安全，负值表示风险） */
  risk: number
  /** 进度维度（距离快车道的接近程度） */
  progress: number
}

// ==================== StateEvaluator ====================

/**
 * 状态评价器接口。
 *
 * 每个实现定义自己的评分逻辑。
 * 可用于：
 * - Simulation 分支比较
 * - AI 决策评估
 * - 策略回测
 */
export interface StateEvaluator {
  /**
   * 评价一个玩家的状态变化。
   *
   * @param before - 操作前的游戏状态
   * @param after - 操作后的游戏状态
   * @param playerId - 目标玩家 ID
   * @returns 评价分数
   */
  evaluate(
    before: GameState,
    after: GameState,
    playerId: string,
  ): EvaluationScore

  /** 评价器名称（用于日志和调试） */
  readonly name: string
}

// ==================== BasicFinancialEvaluator ====================

/**
 * 基础财务评价器。
 *
 * 评分逻辑：
 * - netWorth: 净值变化，越高越好
 * - cashFlow: 现金流变化，越高越好（被动收入权重更高）
 * - liquidity: 现金/月支出比率，安全区间 3-6 个月
 * - risk: 负债率，越低越安全
 * - progress: 被动收入/总支出比率，接近 1.0 表示可进入快车道
 */
export class BasicFinancialEvaluator implements StateEvaluator {
  readonly name = 'BasicFinancial'

  evaluate(
    _before: GameState,
    after: GameState,
    playerId: string,
  ): EvaluationScore {
    const player = this.findPlayer(after, playerId)
    if (!player) {
      return {
        total: -Infinity,
        netWorth: -Infinity,
        cashFlow: -Infinity,
        liquidity: -Infinity,
        risk: -Infinity,
        progress: -Infinity,
      }
    }

    const netWorth = this.evalNetWorth(player)
    const cashFlow = this.evalCashFlow(player)
    const liquidity = this.evalLiquidity(player)
    const risk = this.evalRisk(player)
    const progress = this.evalProgress(player)

    // 加权综合：净值 30% + 现金流 25% + 流动性 15% + 风险 15% + 进度 15%
    const total =
      netWorth * 0.30 +
      cashFlow * 0.25 +
      liquidity * 0.15 +
      risk * 0.15 +
      progress * 0.15

    return { total, netWorth, cashFlow, liquidity, risk, progress }
  }

  // ==================== Private Scoring ====================

  /**
   * 净值评分：基于净值变化的 sigmoid 归一化。
   * 正向变化 -> 正分，负向变化 -> 负分。
   */
  private evalNetWorth(player: Player): number {
    const nw = calcPlayerNetWorth(player)
    // 使用 tanh 归一化到 [-1, 1]，scale 控制敏感度
    return Math.tanh(nw / 100000)
  }

  /**
   * 现金流评分：月现金流归一化。
   * 现金流越高越好，被动收入额外加权。
   */
  private evalCashFlow(player: Player): number {
    const cf = player.cashFlow
    const pi = player.passiveIncome
    // 现金流 + 被动收入溢价
    const score = (cf + pi * 0.5) / 10000
    return Math.tanh(score)
  }

  /**
   * 流动性评分：现金/月支出比率。
   * 3-12 个月为安全区间（满分），低于 1 个月为危险。
   */
  private evalLiquidity(player: Player): number {
    if (player.totalExpenses <= 0) return 1.0
    const months = player.cash / player.totalExpenses
    if (months >= 12) return 1.0
    if (months >= 6) return 0.8
    if (months >= 3) return 0.6
    if (months >= 1) return 0.3
    // 低于 1 个月，线性扣分
    return Math.max(-1, months - 1)
  }

  /**
   * 风险评分：负债率。
   * 负债率越低越安全（正分），越高越危险（负分）。
   */
  private evalRisk(player: Player): number {
    const totalLiabilities = player.liabilities.reduce(
      (sum, l) => sum + l.amount,
      0,
    )
    const totalAssets = player.cash + player.savings
    if (totalAssets <= 0 && totalLiabilities > 0) return -1.0
    if (totalLiabilities <= 0) return 1.0

    const ratio = totalLiabilities / (totalAssets + totalLiabilities)
    // ratio 0 -> 1 (safe), ratio 1 -> -1 (risky)
    return 1 - ratio * 2
  }

  /**
   * 进度评分：被动收入/总支出比率。
   * 接近 1.0 表示可进入快车道。
   */
  private evalProgress(player: Player): number {
    if (player.totalExpenses <= 0) return 0
    const ratio = player.passiveIncome / player.totalExpenses
    // ratio 0 -> 0, ratio 1.0 -> 1.0 (ready for fast track)
    return Math.min(1.0, ratio)
  }

  // ==================== Helpers ====================

  private findPlayer(
    state: GameState,
    playerId: string,
  ): Player | undefined {
    return state.players.find((p) => p.id === playerId)
  }
}

// ==================== Factory ====================

export function createBasicFinancialEvaluator(): BasicFinancialEvaluator {
  return new BasicFinancialEvaluator()
}