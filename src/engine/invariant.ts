/**
 * GameState Invariant — 游戏状态合法性验证
 *
 * 职责：
 * - 检测非法 GameState（NaN、负数、不一致等）
 * - 提供 validateGameState 用于开发/测试
 * - 提供 assertGameState 用于 debug 模式
 *
 * 原则：
 * - 纯函数，不修改状态
 * - 性能敏感的检查可通过 level 控制
 * - 生产环境避免高成本检查
 */

import type { GameState, Player, Asset, Liability } from '@/types/game'

// ==================== InvariantError ====================

/** 单个不变式违规 */
export interface InvariantViolation {
  /** 违规路径（如 "players[0].cash"） */
  path: string
  /** 违规描述 */
  message: string
  /** 违规值（用于调试） */
  value?: unknown
}

/** 验证结果 */
export interface InvariantResult {
  /** 是否通过 */
  valid: boolean
  /** 违规列表 */
  violations: InvariantViolation[]
}

// ==================== Validation Level ====================

/**
 * 验证级别：
 * - basic: 仅检查 NaN 和基本范围（快速）
 * - full: 检查所有一致性约束（用于测试）
 */
export type ValidationLevel = 'basic' | 'full'

// ==================== Core Validation ====================

/**
 * 验证 GameState 是否满足所有不变式。
 *
 * @param state - 游戏状态
 * @param level - 验证级别（默认 full）
 * @returns 验证结果
 */
export function validateGameState(
  state: GameState,
  level: ValidationLevel = 'full',
): InvariantResult {
  const violations: InvariantViolation[] = []

  // 游戏级验证
  validateGame(state, violations, level)

  // 玩家级验证
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i]!
    validatePlayer(player, i, violations, level)
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}

/**
 * Debug 模式下断言游戏状态合法性。
 * 违规时抛出详细错误。
 *
 * @param state - 游戏状态
 * @param level - 验证级别
 */
export function assertGameState(
  state: GameState,
  level: ValidationLevel = 'full',
): void {
  const result = validateGameState(state, level)
  if (!result.valid) {
    const details = result.violations
      .map((v) => `  ${v.path}: ${v.message} (value: ${JSON.stringify(v.value)})`)
      .join('\n')
    throw new Error(
      `GameState invariant violation (${result.violations.length} issues):\n${details}`,
    )
  }
}

// ==================== Game-Level Validation ====================

function validateGame(
  state: GameState,
  violations: InvariantViolation[],
  level: ValidationLevel,
): void {
  // Phase 合法性: 'setup' | 'rat_race' | 'fast_track' | 'finished'
  if (!['setup', 'rat_race', 'fast_track', 'finished'].includes(state.phase)) {
    violations.push({
      path: 'phase',
      message: `Invalid phase: "${state.phase}"`,
      value: state.phase,
    })
  }

  // currentPlayerIndex 合法性
  if (state.players.length > 0) {
    if (
      state.currentPlayerIndex < 0 ||
      state.currentPlayerIndex >= state.players.length
    ) {
      violations.push({
        path: 'currentPlayerIndex',
        message: `currentPlayerIndex ${state.currentPlayerIndex} out of range [0, ${state.players.length - 1}]`,
        value: state.currentPlayerIndex,
      })
    }
  }

  // winnerId 一致性
  if (state.winnerId) {
    const winner = state.players.find((p) => p.id === state.winnerId)
    if (!winner) {
      violations.push({
        path: 'winnerId',
        message: `winnerId "${state.winnerId}" not found in players`,
        value: state.winnerId,
      })
    }
  }

  // gameOver 一致性: 'finished' 等价于游戏结束
  if (state.phase === 'finished' && !state.gameEndReason) {
    violations.push({
      path: 'gameEndReason',
      message: 'phase is finished but gameEndReason is not set',
    })
  }

  // lastRoll 合法性
  if (state.lastRoll < 0 || state.lastRoll > 12) {
    violations.push({
      path: 'lastRoll',
      message: `lastRoll ${state.lastRoll} out of range [0, 12]`,
      value: state.lastRoll,
    })
  }

  if (level === 'full') {
    // turnNumber
    if (state.turnNumber === undefined || state.turnNumber === null || state.turnNumber < 1) {
      violations.push({
        path: 'turnNumber',
        message: `turnNumber must be >= 1, got ${state.turnNumber}`,
        value: state.turnNumber,
      })
    }
  }
}

// ==================== Player-Level Validation ====================

function validatePlayer(
  player: Player,
  index: number,
  violations: InvariantViolation[],
  level: ValidationLevel,
): void {
  const prefix = `players[${index}]`
  const id = player.id || '(no id)'

  // === NaN Checks ===
  checkNotNaN(player.cash, `${prefix}.cash`, id, violations)
  checkNotNaN(player.savings, `${prefix}.savings`, id, violations)
  checkNotNaN(player.salary, `${prefix}.salary`, id, violations)
  checkNotNaN(player.passiveIncome, `${prefix}.passiveIncome`, id, violations)
  checkNotNaN(player.totalIncome, `${prefix}.totalIncome`, id, violations)
  checkNotNaN(player.totalExpenses, `${prefix}.totalExpenses`, id, violations)
  checkNotNaN(player.cashFlow, `${prefix}.cashFlow`, id, violations)
  checkNotNaN(player.childrenCount, `${prefix}.childrenCount`, id, violations)
  checkNotNaN(player.ageMonths, `${prefix}.ageMonths`, id, violations)
  checkNotNaN(player.ratRacePosition, `${prefix}.ratRacePosition`, id, violations)
  checkNotNaN(player.fastTrackPosition, `${prefix}.fastTrackPosition`, id, violations)

  // === Range Checks ===
  // cash: 允许负值（破产场景），但 NaN 已拦截
  if (player.savings < 0) {
    violations.push({
      path: `${prefix}.savings`,
      message: `Savings cannot be negative: ${player.savings}`,
      value: player.savings,
    })
  }

  if (player.childrenCount < 0) {
    violations.push({
      path: `${prefix}.childrenCount`,
      message: `childrenCount cannot be negative: ${player.childrenCount}`,
      value: player.childrenCount,
    })
  }

  if (player.ageMonths < 0) {
    violations.push({
      path: `${prefix}.ageMonths`,
      message: `ageMonths cannot be negative: ${player.ageMonths}`,
      value: player.ageMonths,
    })
  }

  if (player.ratRacePosition < 0) {
    violations.push({
      path: `${prefix}.ratRacePosition`,
      message: `ratRacePosition cannot be negative: ${player.ratRacePosition}`,
      value: player.ratRacePosition,
    })
  }

  if (player.fastTrackPosition < 0) {
    violations.push({
      path: `${prefix}.fastTrackPosition`,
      message: `fastTrackPosition cannot be negative: ${player.fastTrackPosition}`,
      value: player.fastTrackPosition,
    })
  }

  // Phase 合法性
  if (!['rat_race', 'fast_track', 'game_over'].includes(player.phase)) {
    violations.push({
      path: `${prefix}.phase`,
      message: `Invalid player phase: "${player.phase}"`,
      value: player.phase,
    })
  }

  if (level === 'full') {
    // === Financial Consistency ===
    // totalIncome = salary + passiveIncome (当非失业时)
    if (!player.isUnemployed) {
      const expectedIncome = player.salary + player.passiveIncome
      if (Math.abs(player.totalIncome - expectedIncome) > 0.01) {
        violations.push({
          path: `${prefix}.totalIncome`,
          message: `totalIncome ${player.totalIncome} != salary ${player.salary} + passiveIncome ${player.passiveIncome} = ${expectedIncome}`,
        })
      }
    }

    // cashFlow = totalIncome - totalExpenses
    const expectedCashFlow = player.totalIncome - player.totalExpenses
    if (Math.abs(player.cashFlow - expectedCashFlow) > 0.01) {
      violations.push({
        path: `${prefix}.cashFlow`,
        message: `cashFlow ${player.cashFlow} != totalIncome ${player.totalIncome} - totalExpenses ${player.totalExpenses} = ${expectedCashFlow}`,
      })
    }

    // 验证资产
    for (let ai = 0; ai < player.assets.length; ai++) {
      validateAsset(player.assets[ai]!, `${prefix}.assets[${ai}]`, id, violations)
    }

    // 验证负债
    for (let li = 0; li < player.liabilities.length; li++) {
      validateLiability(
        player.liabilities[li]!,
        `${prefix}.liabilities[${li}]`,
        id,
        violations,
      )
    }
  }
}

// ==================== Asset Validation ====================

function validateAsset(
  asset: Asset,
  path: string,
  playerId: string,
  violations: InvariantViolation[],
): void {
  checkNotNaN(asset.cost, `${path}.cost`, playerId, violations)
  checkNotNaN(asset.cashFlow, `${path}.cashFlow`, playerId, violations)
  checkNotNaN(asset.quantity, `${path}.quantity`, playerId, violations)

  if (asset.quantity < 0) {
    violations.push({
      path: `${path}.quantity`,
      message: `Asset quantity cannot be negative: ${asset.quantity}`,
      value: asset.quantity,
    })
  }

  if (asset.marketPrice !== undefined) {
    checkNotNaN(asset.marketPrice, `${path}.marketPrice`, playerId, violations)
  }

  if (asset.loanAmount !== undefined) {
    checkNotNaN(asset.loanAmount, `${path}.loanAmount`, playerId, violations)
    if (asset.loanAmount < 0) {
      violations.push({
        path: `${path}.loanAmount`,
        message: `loanAmount cannot be negative: ${asset.loanAmount}`,
        value: asset.loanAmount,
      })
    }
  }
}

// ==================== Liability Validation ====================

function validateLiability(
  liability: Liability,
  path: string,
  playerId: string,
  violations: InvariantViolation[],
): void {
  checkNotNaN(liability.amount, `${path}.amount`, playerId, violations)
  checkNotNaN(liability.monthlyPayment, `${path}.monthlyPayment`, playerId, violations)

  if (liability.amount < 0) {
    violations.push({
      path: `${path}.amount`,
      message: `Liability amount cannot be negative: ${liability.amount}`,
      value: liability.amount,
    })
  }
}

// ==================== Helpers ====================

function checkNotNaN(
  value: number | undefined,
  path: string,
  playerId: string,
  violations: InvariantViolation[],
): void {
  if (value === undefined || value === null) return
  if (Number.isNaN(value)) {
    violations.push({
      path,
      message: `NaN detected for player ${playerId}`,
      value,
    })
  }
  if (!Number.isFinite(value)) {
    violations.push({
      path,
      message: `Non-finite value (${value}) detected for player ${playerId}`,
      value,
    })
  }
}

// ==================== Quick Check ====================

/**
 * 快速检查：仅检查 NaN 和基本范围。
 * 适合在 dispatch 循环中调用。
 */
export function quickValidateState(state: GameState): boolean {
  return validateGameState(state, 'basic').valid
}