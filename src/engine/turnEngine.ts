import type { Player } from '@/types/game'
import {
  START_AGE,
  MAX_AGE_MONTHS,
  RETIREMENT_AGE,
} from '@/types/game'

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
export function rollDice(count: number): number[] {
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(Math.floor(Math.random() * 6) + 1)
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