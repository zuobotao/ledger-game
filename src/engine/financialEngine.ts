/**
 * financialEngine — Pure Financial Calculation Functions
 *
 * All functions in this module are pure: same input always produces the same output,
 * with no side effects on external state.
 */

import type { FinancialSnapshot, Player } from '@/types/game'
import type { FinancialDelta } from './contract'
import {
  calcAssetValue,
  calcTotalAssetValue,
  calcStockValue,
  calcRealEstateValue,
  calcBusinessValue,
} from './assetEngine'

/**
 * Sum all expense categories for a player's expenses object.
 */
export function totalExpenses(expenses: Player['expenses']): number {
  return (
    expenses.taxes +
    expenses.mortgage +
    expenses.schoolLoan +
    expenses.carLoan +
    expenses.creditCard +
    expenses.other +
    expenses.child
  )
}

/**
 * Recalculate a player's financial derived fields:
 * passive income, total income, total expenses, and cash flow.
 *
 * NOTE: This function mutates the player object (side effect on player fields).
 * Even though it mutates, it is deterministic given the same player state.
 */
export function recalcPlayerFinancials(player: Player): void {
  player.passiveIncome = player.assets.reduce((sum, asset) => sum + asset.cashFlow * asset.quantity, 0)
  player.expenses.child = player.childrenCount * player.career.expenses.child

  const salary = player.isUnemployed ? 0 : player.salary
  player.totalIncome = salary + player.passiveIncome
  player.totalExpenses = totalExpenses(player.expenses)
  player.cashFlow = player.totalIncome - player.totalExpenses
}

/**
 * Calculate a player's net worth (assets minus liabilities).
 * This is a pure function — it does not modify the player.
 */
export function calcPlayerNetWorth(player: Player): number {
  const assetsValue = calcTotalAssetValue(player.assets)
  const totalAssets = player.cash + player.savings + assetsValue
  const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return totalAssets - totalLiabilities
}

/**
 * Create a financial snapshot record for the given player at a specific turn.
 * This is a pure function — it reads from the player but does not modify it.
 */
export function createFinancialSnapshot(player: Player, turn: number): FinancialSnapshot {
  const stockValue = calcStockValue(player.assets)
  const realEstateValue = calcRealEstateValue(player.assets)
  const businessValue = calcBusinessValue(player.assets)
  const otherAssetsValue = player.assets
    .filter((a) => a.type === 'other')
    .reduce((sum, a) => sum + calcAssetValue(a), 0)

  const totalAssets = player.cash + player.savings + stockValue + realEstateValue + businessValue + otherAssetsValue
  const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)

  return {
    turn,
    cash: player.cash + player.savings,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalIncome: player.totalIncome,
    totalExpenses: player.totalExpenses,
    monthlyCashFlow: player.cashFlow,
    stockValue,
    realEstateValue,
    businessValue,
  }
}

/**
 * 计算两个玩家状态之间的财务变化增量 (after - before)。
 *
 * 这是计算 FinancialDelta 的标准方式：
 * 捕获操作前状态，执行操作，然后调用此函数得到 Delta。
 *
 * 注意：调用前确保两个 player 的财务字段都已经过 recalcPlayerFinancials 计算。
 */
export function computeFinancialDelta(before: Player, after: Player): FinancialDelta {
  const assetsBefore = calcTotalAssetValue(before.assets)
  const assetsAfter = calcTotalAssetValue(after.assets)
  const liabilitiesBefore = before.liabilities.reduce((s, l) => s + l.amount, 0)
  const liabilitiesAfter = after.liabilities.reduce((s, l) => s + l.amount, 0)

  const netWorthBefore = before.cash + before.savings + assetsBefore - liabilitiesBefore
  const netWorthAfter = after.cash + after.savings + assetsAfter - liabilitiesAfter

  return {
    cash: after.cash - before.cash,
    salary: (after.isUnemployed ? 0 : after.salary) - (before.isUnemployed ? 0 : before.salary),
    passiveIncome: after.passiveIncome - before.passiveIncome,
    totalIncome: after.totalIncome - before.totalIncome,
    totalExpenses: after.totalExpenses - before.totalExpenses,
    cashFlow: after.cashFlow - before.cashFlow,
    assets: assetsAfter - assetsBefore,
    liabilities: liabilitiesAfter - liabilitiesBefore,
    netWorth: netWorthAfter - netWorthBefore,
    savings: after.savings - before.savings,
    childrenCount: after.childrenCount - before.childrenCount,
  }
}

/**
 * 计算财务自由度（被动收入 / 总支出）。
 *
 * - 0: 完全没有被动收入
 * - 0.5: 被动收入覆盖一半支出
 * - 1.0: 财务自由（被动收入 >= 总支出）
 */
export function calcFinancialFreedomRatio(player: Player): number {
  if (player.totalExpenses <= 0) return 1.0
  return player.passiveIncome / player.totalExpenses
}