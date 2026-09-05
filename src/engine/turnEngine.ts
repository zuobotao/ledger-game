import type { Player } from '@/types/game'
import {
  START_AGE,
  MAX_AGE_MONTHS,
  RETIREMENT_AGE,
} from '@/types/game'
import { RandomSource, defaultRandom } from './randomSource'

/**
 * 计算下一个玩家索引（纯模运算，不跳过破产玩家）
 */
export function calcNextPlayerIndex(currentIndex: number, playerCount: number): number {
  return (currentIndex + 1) % playerCount
}

/**
 * 计算玩家年龄（周岁）
 */
export function calcPlayerAge(ageMonths: number): number {
  return START_AGE + Math.floor(ageMonths / 12)
}

/**
 * 掷骰子，返回每个骰子的点数
 */
export function rollDice(count: number, random: RandomSource = defaultRandom): number[] {
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(random.nextInt(1, 7))
  }
  return values
}

/**
 * 计算移动后的新位置（模运算，支持循环棋盘）
 */
export function calcNewPosition(currentPos: number, steps: number, boardSize: number): number {
  return (currentPos + steps) % boardSize
}

/**
 * 检查玩家是否可以进入资本游戏（快车道）
 */
export function canEnterFastTrack(player: Player): boolean {
  return player.phase === 'rat_race' && player.passiveIncome >= player.totalExpenses
}

export interface FastTrackCriterion {
  label: string
  met: boolean
  detail: string
}

export interface FastTrackEligibilityResult {
  /** 当前是否具备进入资本游戏的资格 */
  eligible: boolean
  passiveIncome: number
  totalExpenses: number
  /** 仍需补齐的被动收入缺口（已具备时为 0） */
  gap: number
  /** 触发资格的客观原因标识，便于事件/回放/模拟复用 */
  reason: 'PASSIVE_INCOME_COVERS_EXPENSES' | 'NOT_ELIGIBLE'
  /** 判定项明细（满足/不满足 + 说明） */
  criteria: FastTrackCriterion[]
}

/**
 * 计算资本游戏资格明细。
 *
 * 与 canEnterFastTrack 共享同一判定规则（被动收入 >= 总支出），但额外输出
 * 满足/不满足项与缺口，供 UI、事件、Replay、Simulation 复用。
 * 该结果是纯派生值，可由持久化的 passiveIncome/totalExpenses 随时重算。
 */
export function getFastTrackEligibility(player: Player): FastTrackEligibilityResult {
  const passiveIncome = player.passiveIncome
  const totalExpenses = player.totalExpenses
  const eligible = player.phase === 'rat_race' && passiveIncome >= totalExpenses
  const gap = Math.max(0, totalExpenses - passiveIncome)

  const criteria: FastTrackCriterion[] = [
    {
      label: '被动收入覆盖总支出',
      met: passiveIncome >= totalExpenses,
      detail:
        passiveIncome >= totalExpenses
          ? `被动收入 $${Math.round(passiveIncome).toLocaleString()} ≥ 支出 $${Math.round(totalExpenses).toLocaleString()}`
          : `被动收入 $${Math.round(passiveIncome).toLocaleString()} < 支出 $${Math.round(totalExpenses).toLocaleString()}，还需 $${Math.round(gap).toLocaleString()}/月`,
    },
  ]

  return {
    eligible,
    passiveIncome,
    totalExpenses,
    gap,
    reason: eligible ? 'PASSIVE_INCOME_COVERS_EXPENSES' : 'NOT_ELIGIBLE',
    criteria,
  }
}

/**
 * 检查是否达到退休年龄
 */
export function isRetirementAge(ageMonths: number, ageLimit: boolean): boolean {
  return ageLimit && ageMonths >= MAX_AGE_MONTHS
}

/**
 * 计算游戏月份
 */
export function calcGameMonth(
  _currentPlayerIndex: number,
  _playerCount: number,
  turnNumber: number,
): number {
  return turnNumber
}

/**
 * 推进一个月，返回新的年龄月份和是否退休
 */
export function advanceMonth(
  ageMonths: number,
  isAgeLimit: boolean,
): { ageMonths: number; retired: boolean } {
  const newAgeMonths = ageMonths + 1
  return {
    ageMonths: newAgeMonths,
    retired: isAgeLimit && newAgeMonths >= MAX_AGE_MONTHS,
  }
}