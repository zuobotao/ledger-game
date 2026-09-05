/**
 * OpportunitySelector — 机会梯级选择层（纯函数）
 *
 * 职责：
 * - 决定玩家遇到的机会梯级（small / big），处理"参与能力不足"时的降级
 * - 维护 Big 机会的冷却权重，缓解连续大机会带来的挫败
 * - 保留随机性：冷却机制是"降低再次出现的概率"，不是"硬性禁止下一次"
 *
 * 原则：
 * - 不修改任何状态，输入机会上下文 + 掷骰结果，输出梯级
 * - 可被 UI / Engine / Simulation 复用，保证同一套规则
 */

import type { OpportunityCard, OpportunityRarity } from '@/types/game'

// 稀缺度 → 相对权重（越高越稀缺）
export const RARITY_WEIGHT: Record<OpportunityRarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 0.55,
  RARE: 0.3,
  LEGENDARY: 0.14,
}

export const RARITY_ORDER: OpportunityRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY']

/** 根据机会 size 推导默认稀缺度（card.rarity 未定义时使用） */
export function rarityForSize(size: OpportunityCard['size']): OpportunityRarity {
  return size === 'big' ? 'RARE' : 'COMMON'
}

export function rarityWeight(card: OpportunityCard): number {
  return RARITY_WEIGHT[card.rarity ?? rarityForSize(card.size)]
}

export interface BigCooldownContext {
  /** 距上一次真正遇到 Big 机会的回合数（越大表示越久没遇到） */
  turnsSinceLastBig: number
  /** Big 冷却窗口（回合），窗口之后完全恢复 */
  cooldownWindow: number
}

/**
 * Big 冷却恢复度：刚出现过时低，随时间回升到 1。
 * 返回 [0.15, 1]，用于决定当期"兑现 Big"的概率上限。
 */
export function bigCooldownRecovery(ctx: BigCooldownContext): number {
  if (ctx.cooldownWindow <= 0) return 1
  const progress = Math.min(1, Math.max(0, ctx.turnsSinceLastBig / ctx.cooldownWindow))
  return 0.15 + progress * 0.85
}

export interface OpportunityTierContext {
  /** 落点格类型 */
  landed: 'opportunity' | 'big_opportunity'
  /** 玩家可动用资金（现金 + 存款） */
  funds: number
  /** 大机会牌堆最低参与成本（首付或成本） */
  bigTierMinCost: number
  /** 冷却恢复度（由 bigCooldownRecovery 计算） */
  bigCooldownRecovery: number
  /** 解锁门槛比值：需资金 >= 最低成本 * 该值 */
  unlockRatio: number
  /** 随机数 [0,1)，用于在"刚达标但冷却冷"时降级 Big */
  roll: number
}

export type ResolvedOpportunityTier = 'big' | 'small'

export const DEFAULT_UNLOCK_RATIO = 1.0

/**
 * 决定本次机会最终梯级。
 *
 * 规则说明：
 * - 非大机会格 → small
 * - 资金不足解锁门槛：机会仍是 Big，但当前能力不足 → 降级为可决策的 small，
 *   同时由 OpportunityEvaluator 在 UI 提示"机会存在，能力尚未到位"。
 * - 资金达标：当期兑现 Big 的概率 = min(1, 冷却恢复度)，结合 roll 保留随机性，
 *   即冷却未恢复时仍保留随机性、不硬禁；恢复后稳定兑现。
 */
export function resolveOpportunityTier(ctx: OpportunityTierContext): ResolvedOpportunityTier {
  if (ctx.landed !== 'big_opportunity') return 'small'
  if (ctx.funds < ctx.bigTierMinCost * (ctx.unlockRatio || DEFAULT_UNLOCK_RATIO)) return 'small'

  // 冷却恢复度作为当期愿意兑现 Big 的倾向；配合 roll 保留随机性
  const bigChance = Math.min(1, Math.max(0.15, ctx.bigCooldownRecovery))
  return ctx.roll < bigChance ? 'big' : 'small'
}

export const DEFAULT_BIG_COOLDOWN_WINDOW = 4