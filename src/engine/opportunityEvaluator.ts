/**
 * OpportunityEvaluator — 机会评估层（纯函数）
 *
 * 职责：
 * - 基于玩家能力（cash / savings / cashFlow / netWorth / liabilities）评估机会可参与度
 * - 输出参与方式建议（full / partial / finance / defer）
 * - 计算参与所需资金与缺口
 *
 * 原则：
 * - 不修改任何状态，纯计算
 * - 只负责"评估"，不决定"生成"（生成由 OpportunitySelector 负责）
 * - 可被 UI / AI / Simulation / 多人在线共用同一套规则
 */

import type { Player, OpportunityCard } from '@/types/game'
import { getCardCost, isCardAffordable } from './cardEngine'

export type ParticipationKind = 'full' | 'finance' | 'partial' | 'none'

export interface OpportunityEvaluation {
  /** 参与方式（按玩家当前能力） */
  participation: ParticipationKind
  /** 是否可全额（用自有现金 + 存款）购买 */
  canAfford: boolean
  /** 全额参与所需资金（首付或成本） */
  requiredCapital: number
  /** 现金 + 存款的可动用资金 */
  availableFunds: number
  /** 全额资金缺口（超出部分，仅当 insufficient 时 > 0） */
  gap: number
  /** 现金投入回报，用于辅助判断性价比 */
  cashOnCash: number
  /** 玩家月现金流余量（判断是否承担得起贷款月供） */
  cashFlowHeadroom: number
  /** 是否符合资本游戏资格（被动收入 >= 总支出） */
  fastTrackEligible: boolean
  /** 供 UI 展示的建议话术 key */
  hintKey: 'affordable' | 'need_finance' | 'need_save' | 'eligible_fast_track'
}

/**
 * 计算玩家可动用资金（现金 + 存款）
 * 存款与现金统一作为流动资金来源，但两者都不改变净资产。
 */
export function playerAvailableFunds(player: Player): number {
  return player.cash + player.savings
}

/**
 * 计算现金投入回报率（月现金流 / 现金投入）
 */
export function calcCashOnCash(card: OpportunityCard, investedCapital: number): number {
  if (investedCapital <= 0) return 0
  return card.cashFlow / investedCapital
}

const FAST_TRACK_MARGIN = 0.15

/**
 * 评估机会参与度。
 *
 * @param player     当前玩家
 * @param card       机会卡
 * @param maxLoan    玩家通过贷款最多可借到的金额（用于"融资参与"判断），可传 0 表示暂不考虑融资
 */
export function evaluateOpportunity(
  player: Player,
  card: OpportunityCard,
  maxLoan: number,
): OpportunityEvaluation {
  const required = getCardCost(card)
  const funds = playerAvailableFunds(player)
  const gap = Math.max(0, required - funds)
  const canAfford = isCardAffordable(card, funds)
  const headroom = Math.max(0, player.cashFlow)
  const ftEligible = player.phase === 'rat_race' && player.passiveIncome >= player.totalExpenses

  // 参与方式判定
  let participation: ParticipationKind
  let hintKey: OpportunityEvaluation['hintKey']
  if (canAfford) {
    participation = 'full'
    hintKey = 'affordable'
  } else if (maxLoan > 0 && maxLoan >= gap) {
    // 全款买不起，但可通过银行贷款覆盖缺口
    participation = 'finance'
    hintKey = 'need_finance'
  } else if (gap <= Math.max(required * FAST_TRACK_MARGIN, 200)) {
    // 缺口较小，接近参与能力（可视为需要再储蓄一小笔即可参与）
    participation = 'partial'
    hintKey = 'need_save'
  } else {
    participation = 'none'
    hintKey = 'need_save'
  }

  return {
    participation,
    canAfford,
    requiredCapital: required,
    availableFunds: funds,
    gap,
    cashOnCash: calcCashOnCash(card, required),
    cashFlowHeadroom: headroom,
    fastTrackEligible: ftEligible,
    hintKey,
  }
}

/**
 * 判断当前玩家是否"暂时无法完整参与"该机会（但机会本身仍保留在场）。
 * 用于 UI 提示：机会存在，只是玩家能力尚未到位。
 */
export function isBeyondReach(evaluation: OpportunityEvaluation): boolean {
  return evaluation.participation === 'none' || evaluation.participation === 'partial'
}