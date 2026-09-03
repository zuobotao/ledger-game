/**
 * Card Engine — 卡组/卡牌管理纯函数
 *
 * 提供通用的卡组操作（洗牌、抽牌）以及机会卡（OpportunityCard）的
 * 分类、成本、现金流、可负担性等查询函数。
 *
 * 所有函数均为纯函数，不依赖外部状态。
 */

import type { OpportunityCard } from '@/types/game'
import { RandomSource, defaultRandom } from './randomSource'

// ==================== 通用卡组操作 ====================

/**
 * Fisher-Yates 洗牌
 */
function shuffle<T>(arr: T[], random: RandomSource): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random.nextInt(0, i + 1)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * 创建一副洗好的牌组
 * @param cards 原始牌列表
 * @param random 随机源，默认使用 defaultRandom
 * @returns 乱序后的新牌组
 */
export function createDeck<T>(cards: T[], random: RandomSource = defaultRandom): T[] {
  return shuffle(cards, random)
}

/**
 * 从牌组中抽一张牌
 * @param deck 当前牌组
 * @returns 抽到的牌和剩余的牌组
 * @throws 如果牌组为空则抛出错误
 */
export function drawCard<T>(deck: T[]): { card: T; remaining: T[] } {
  if (deck.length === 0) {
    throw new Error('Cannot draw from empty deck — call reshuffleDeck or createDeck first')
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

/**
 * 从牌组中抽多张牌
 * @param deck 当前牌组
 * @param count 抽牌数量
 * @returns 抽到的牌（数组）和剩余的牌组
 * @throws 如果牌组为空或数量不足则抛出错误
 */
export function drawCards<T>(deck: T[], count: number): { cards: T[]; remaining: T[] } {
  if (deck.length === 0) {
    throw new Error('Cannot draw from empty deck — call reshuffleDeck or createDeck first')
  }
  if (count <= 0) {
    return { cards: [], remaining: deck }
  }
  if (count > deck.length) {
    throw new Error(`Cannot draw ${count} cards from deck with only ${deck.length} cards`)
  }
  return { cards: deck.slice(0, count), remaining: deck.slice(count) }
}

/**
 * 重新洗牌一副牌组
 * @param deck 当前牌组
 * @returns 乱序后的新牌组
 */
export function reshuffleDeck<T>(deck: T[], random: RandomSource = defaultRandom): T[] {
  return shuffle(deck, random)
}

// ==================== 机会卡（OpportunityCard）查询 ====================

/**
 * 获取机会卡的类型
 */
export function getOpportunityCardType(
  card: OpportunityCard,
): 'stock' | 'real_estate' | 'business' | 'other' {
  return card.type
}

/**
 * 获取机会卡的实际支付成本（有首付时用首付，否则用全额 cost）
 */
export function getCardCost(card: OpportunityCard): number {
  return card.downPayment ?? card.cost
}

/**
 * 获取机会卡的月现金流
 */
export function getCardCashFlow(card: OpportunityCard): number {
  return card.cashFlow
}

/**
 * 检查玩家现金是否足够购买该机会卡（单份）
 * @param card 机会卡
 * @param cash 玩家当前现金
 * @returns 是否负担得起
 */
export function isCardAffordable(card: OpportunityCard, cash: number): boolean {
  return getCardCost(card) <= cash
}