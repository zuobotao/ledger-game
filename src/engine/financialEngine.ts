/**
 * financialEngine — Pure Financial Calculation Functions
 *
 * All functions in this module are pure: same input always produces the same output,
 * with no side effects on external state.
 */

import type { FinancialSnapshot, Player } from '@/types/game'
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