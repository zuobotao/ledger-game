/**
 * StateHash — 确定性游戏状态哈希
 *
 * 职责：
 * - 计算 GameState 的确定性哈希值
 * - 计算 GameReplay 的完整性哈希值
 *
 * 原则：
 * - 只包含影响游戏结果的字段（排除 UI 状态、时间戳）
 * - 确定性：相同状态 → 相同哈希
 * - 用于测试、回放校验、AI 比赛验证
 */

import type { GameState, Player, Asset, Liability } from '@/types/game'
import type { GameReplay } from './contract'

// ==================== Deterministic Serialization ====================

/**
 * 确定性 JSON 序列化：按 key 排序，确保相同对象产生相同字符串。
 */
function deterministicStringify(obj: unknown): string {
  return JSON.stringify(obj, sortKeysReplacer)
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (value as Record<string, unknown>)[k]
        return acc
      }, {})
  }
  return value
}

// ==================== Simple Hash (FNV-1a) ====================

/**
 * FNV-1a 哈希，将字符串转为 32 位整数哈希。
 * 用于将确定性 JSON 转为短哈希值。
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

/**
 * 将数字哈希转为十六进制字符串。
 */
function hashToHex(hash: number): string {
  return hash.toString(16).padStart(8, '0')
}

// ==================== Player Canonicalization ====================

/**
 * 提取玩家中影响游戏结果的核心字段，排除 UI 和引用对象。
 */
function canonicalizePlayer(player: Player): Record<string, unknown> {
  return {
    id: player.id,
    name: player.name,
    salary: player.salary,
    passiveIncome: player.passiveIncome,
    totalIncome: player.totalIncome,
    totalExpenses: player.totalExpenses,
    cashFlow: player.cashFlow,
    cash: player.cash,
    savings: player.savings,
    // 资产：只提取 ID、数量、成本、现金流
    assets: player.assets.map(canonicalizeAsset),
    // 负债：只提取 ID、金额、月供
    liabilities: player.liabilities.map(canonicalizeLiability),
    ratRacePosition: player.ratRacePosition,
    fastTrackPosition: player.fastTrackPosition,
    isUnemployed: player.isUnemployed,
    unemploymentTurns: player.unemploymentTurns,
    hasInsurance: player.hasInsurance,
    hasUnemploymentInsurance: player.hasUnemploymentInsurance,
    childrenCount: player.childrenCount,
    doubleDiceNextTurn: player.doubleDiceNextTurn,
    charityProtection: player.charityProtection,
    ageMonths: player.ageMonths,
    isBankrupt: player.isBankrupt,
    phase: player.phase,
    // 财务报表关键字段：从资产列表统计
    fsStockCount: player.assets.filter(a => a.type === 'stock').length,
    fsRealEstateCount: player.assets.filter(a => a.type === 'real_estate').length,
    fsBusinessCount: player.assets.filter(a => a.type === 'business').length,
  }
}

function canonicalizeAsset(asset: Asset): Record<string, unknown> {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    cost: asset.cost,
    cashFlow: asset.cashFlow,
    quantity: asset.quantity,
    symbol: asset.symbol,
    marketPrice: asset.marketPrice,
    loanAmount: asset.loanAmount,
    monthlyLoanPayment: asset.monthlyLoanPayment,
  }
}

function canonicalizeLiability(liability: Liability): Record<string, unknown> {
  return {
    id: liability.id,
    name: liability.name,
    amount: liability.amount,
    monthlyPayment: liability.monthlyPayment,
    category: liability.category,
  }
}

// ==================== State Hash ====================

/**
 * 计算 GameState 的确定性哈希值。
 *
 * 只包含影响游戏结果的核心字段，排除：
 * - UI 状态（turnStatus, pendingAction, marketEventState）
 * - 时间戳（gameStartTime）
 * - 引用对象（config, decks, transactions, cardHistory）
 * - 非确定性字段（Date.now() 等）
 *
 * @returns 8 位十六进制哈希字符串
 */
export function calculateStateHash(state: GameState): string {
  const canonical = {
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    winnerId: state.winnerId,
    gameEndReason: state.gameEndReason,
    turnNumber: state.turnNumber,
    gameMonth: state.gameMonth,
    lastRoll: state.lastRoll,
    ratRaceTurns: state.ratRaceTurns,
    fastTrackTurns: state.fastTrackTurns,
    players: state.players.map(canonicalizePlayer),
  }
  const json = deterministicStringify(canonical)
  return hashToHex(fnv1aHash(json))
}

/**
 * 计算两个 GameState 是否相同（通过哈希比较）。
 */
export function statesAreEqual(a: GameState, b: GameState): boolean {
  return calculateStateHash(a) === calculateStateHash(b)
}

// ==================== Replay Hash ====================

/**
 * 计算 GameReplay 的完整性哈希值。
 *
 * 包含：
 * - version（版本号）
 * - seed（随机种子）
 * - initialState（初始状态哈希）
 * - actions（所有 action 序列）
 * - events（所有 event 序列）
 * - finalState（最终状态哈希）
 *
 * 用于验证回放完整性：
 * - 同一个 Replay → 同一个 Hash
 * - 任何数据篡改 → Hash 不同
 */
export function calculateReplayHash(replay: GameReplay): string {
  // 直接对序列化后的 actions 和 events 序列进行哈希
  // 不依赖 state 哈希的内部实现
  const actionsJson = deterministicStringify(replay.actions)
  const eventsJson = deterministicStringify(replay.events)

  const composite = [
    replay.version,
    String(replay.seed),
    calculateStateHash(replay.initialState),
    hashToHex(fnv1aHash(actionsJson)),
    hashToHex(fnv1aHash(eventsJson)),
    replay.finalStateHash ?? '',
  ].join('|')

  return hashToHex(fnv1aHash(composite))
}

/**
 * 验证两个 replay 是否一致。
 */
export function replayHashesMatch(a: GameReplay, b: GameReplay): boolean {
  return calculateReplayHash(a) === calculateReplayHash(b)
}

// ==================== Event Sequence Hash ====================

/**
 * 计算事件序列的确定性哈希。
 * 用于验证回放产生的事件序列是否与原始游戏一致。
 */
export function calculateEventSequenceHash(events: Array<{ type: string; timestamp: number }>): string {
  const summary = events.map((e) => ({ type: e.type }))
  const json = deterministicStringify(summary)
  return hashToHex(fnv1aHash(json))
}