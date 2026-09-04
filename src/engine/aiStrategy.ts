/**
 * AIStrategy — AI 决策策略接口
 *
 * 职责：
 * - 从 GameState 读取信息，产生 GameAction
 * - AI 不直接修改 GameState，只产生 Action
 * - AI Action 必须经过 AIValidator 验证后才能送入 GameEngine
 *
 * 原则：
 * - AI 只能产生 GameAction，不能直接修改 State
 * - 策略可插拔、可测试
 * - 本阶段不接入 LLM
 */

import type { GameState } from '@/types/game'
import type { GameAction } from './contract'
import type { DecisionPolicy } from './aiPolicies'
import { createObservation } from './aiTypes'
import { RandomSource } from './randomSource'

// ==================== AIStrategy 接口 ====================

/**
 * AI 策略接口。
 * 每个实现从 GameState 读取信息，返回一个 GameAction 或 null（无法决策时）。
 */
export interface AIStrategy {
  /** 策略名称 */
  readonly name: string

  /**
   * 根据当前游戏状态，为指定玩家做出决策。
   *
   * @param state - 当前游戏状态（只读）
   * @param playerId - 目标玩家 ID
   * @returns GameAction 或 null（当前无法做出决策）
   */
  decide(state: GameState, playerId: string): GameAction | null
}

// ==================== RandomStrategy ====================

/**
 * 随机策略。
 * 在所有合法操作中随机选择，用于测试、基准测试和压力测试。
 */
export class RandomStrategy implements AIStrategy {
  readonly name = 'Random'
  private random: RandomSource

  constructor(seed?: number) {
    this.random = new RandomSource(seed)
  }

  decide(state: GameState, playerId: string): GameAction | null {
    const player = state.players.find((p) => p.id === playerId)
    if (!player) return null

    const options: GameAction[] = []

    // 基本操作
    options.push({ type: 'roll_dice', playerId })
    options.push({ type: 'handle_payday', playerId })
    options.push({ type: 'end_turn', playerId })

    // 贷款操作（有一定概率）
    if (this.random.next() < 0.3) {
      const loanAmount = this.random.nextInt(1, 11) * 1000
      options.push({ type: 'take_bank_loan', playerId, amount: loanAmount })
    }

    // 还款操作（如果有银行贷款）
    const bankLoan = player.liabilities
      .filter((l) => l.category === 'bank_loan')
      .reduce((sum, l) => sum + l.amount, 0)
    if (bankLoan > 0 && this.random.next() < 0.2) {
      const repayAmount = Math.min(
        player.cash * 0.5,
        bankLoan,
      )
      if (repayAmount > 0) {
        options.push({
          type: 'repay_bank_loan',
          playerId,
          amount: Math.floor(repayAmount / 100) * 100,
          liabilityId: player.liabilities.find((l) => l.category === 'bank_loan')?.id ?? '',
        })
      }
    }

    return this.random.pick(options)
  }
}

// ==================== PolicyBasedStrategy ====================

/**
 * 基于 DecisionPolicy 的策略适配器。
 * 将 DecisionPolicy 的细粒度决策转换为 GameAction。
 *
 * 当前 DecisionPolicy 已有完整的决策逻辑（买入/卖出/慈善/贷款/还款），
 * 本适配器基于 GameState 的 pendingCard 等信息选择合适的 Action。
 */
export class PolicyBasedStrategy implements AIStrategy {
  readonly name: string
  private policy: DecisionPolicy
  private random: RandomSource

  constructor(policy: DecisionPolicy, seed?: number) {
    this.name = policy.name
    this.policy = policy
    this.random = new RandomSource(seed)
  }

  decide(state: GameState, playerId: string): GameAction | null {
    const player = state.players.find((p) => p.id === playerId)
    if (!player) return null

    const obs = createObservation(player, state)

    // 如果有 pendingCard，决定是否买入
    if (obs.pendingCard) {
      const decision = this.policy.decideBuyOpportunity(obs, this.random)
      if (decision.buy) {
        return {
          type: 'buy_opportunity',
          playerId,
          card: obs.pendingCard as GameAction extends { card: infer C } ? C : never,
          quantity: decision.quantity,
        } as GameAction
      }
      // 不买入则拒绝
      return {
        type: 'decline_opportunity',
        playerId,
      } as GameAction
    }

    // 决策优先级：贷款 > 还款 > 慈善 > 掷骰
    const loanDecision = this.policy.decideTakeLoan(obs, this.random)
    if (loanDecision.take && loanDecision.amount > 0) {
      return {
        type: 'take_bank_loan',
        playerId,
        amount: loanDecision.amount,
      }
    }

    const repayDecision = this.policy.decideRepayLoan(obs, this.random)
    if (repayDecision.repay && repayDecision.amount > 0) {
      const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
      return {
        type: 'repay_bank_loan',
        playerId,
        amount: repayDecision.amount,
        liabilityId: bankLoan?.id ?? '',
      }
    }

    // 默认掷骰
    return { type: 'roll_dice', playerId }
  }
}

// ==================== Factory ====================

import { policies } from './aiPolicies'

export function createRandomStrategy(seed?: number): RandomStrategy {
  return new RandomStrategy(seed)
}

export function createConservativeStrategy(seed?: number): PolicyBasedStrategy {
  return new PolicyBasedStrategy(policies.conservative, seed)
}

export function createBalancedStrategy(seed?: number): PolicyBasedStrategy {
  return new PolicyBasedStrategy(policies.balanced, seed)
}

export function createAggressiveStrategy(seed?: number): PolicyBasedStrategy {
  return new PolicyBasedStrategy(policies.aggressive, seed)
}