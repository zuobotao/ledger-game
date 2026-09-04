import type { Page } from '@playwright/test'
import type { GameStateSnapshot, PlayerState } from '../types'

/**
 * Reads game state from the browser's exposed Pinia store (window.gameStore).
 * This is READ-ONLY — we never modify state directly from playtest.
 */

export async function readGameState(page: Page): Promise<GameStateSnapshot | null> {
  try {
    const state = await page.evaluate(() => {
      const store = (window as any).gameStore
      if (!store) return null

      const currentPlayer = store.players[store.currentPlayerIndex]
      const players = store.players.map((p: any) => {
        const assets =
          (p.financial?.realEstate?.reduce((s: number, a: any) => s + (a.marketValue || 0), 0) || 0) +
          (p.financial?.stocks?.reduce((s: number, st: any) => s + st.totalCost, 0) || 0) +
          (p.financial?.businesses?.reduce((s: number, b: any) => s + (b.marketValue || 0), 0) || 0) +
          (p.financial?.savings || 0) +
          (p.financial?.gold?.totalCost || 0) +
          (p.financial?.collectibles?.totalCost || 0)

        const liabilities =
          (p.financial?.liabilities?.bankLoan || 0) +
          (p.financial?.liabilities?.mortgage || 0) +
          (p.financial?.liabilities?.carLoans?.reduce((s: number, l: any) => s + l.balance, 0) || 0) +
          (p.financial?.liabilities?.creditCards?.reduce((s: number, c: any) => s + c.balance, 0) || 0) +
          (p.financial?.liabilities?.studentLoans?.reduce((s: number, l: any) => s + l.balance, 0) || 0) +
          (p.financial?.liabilities?.retailDebt || 0) +
          (p.financial?.liabilities?.otherDebt || 0)

        const cashFlow = (p.financial?.totalIncome || 0) - (p.financial?.totalExpenses || 0)

        return {
          name: p.name,
          cash: p.financial?.cash ?? 0,
          income: p.financial?.totalIncome ?? 0,
          expenses: p.financial?.totalExpenses ?? 0,
          cashFlow,
          assets,
          liabilities,
          netWorth: assets - liabilities + (p.financial?.cash ?? 0),
          savings: p.financial?.savings ?? 0,
        } as PlayerState
      })

      return {
        turn: store.turnNumber ?? 0,
        phase: store.phase ?? 'unknown',
        currentPlayer: currentPlayer?.name ?? 'unknown',
        turnStatus: store.turnStatus ?? 'unknown',
        pendingAction: store.pendingAction?.type || null,
        players,
      }
    })

    if (!state) return null

    return {
      ...state,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function getCurrentTurn(page: Page): Promise<number> {
  const state = await readGameState(page)
  return state?.turn ?? 0
}

export async function getTurnStatus(page: Page): Promise<string> {
  const state = await readGameState(page)
  return state?.turnStatus ?? 'unknown'
}

export async function getPendingAction(page: Page): Promise<string | null> {
  const state = await readGameState(page)
  return state?.pendingAction
}

export async function getCurrentPlayerCash(page: Page): Promise<number> {
  const state = await readGameState(page)
  if (!state || state.players.length === 0) return 0
  const currentPlayer = state.players.find((p) => p.name === state.currentPlayer)
  return currentPlayer?.cash ?? 0
}
