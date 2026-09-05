import type { Page } from '@playwright/test'
import type { GameStateSnapshot, PlayerState } from '../types'

/**
 * Reads game state from the browser's exposed Pinia store (window.gameStore).
 * This is READ-ONLY — we never modify state directly from playtest.
 *
 * IMPORTANT: Player financial fields live DIRECTLY on the player object
 * (p.cash, p.totalIncome, p.totalExpenses, p.cashFlow, p.assets, p.liabilities),
 * NOT under a nested `p.financial` object.
 */

export interface RawPlayerSnapshot {
  name: string
  cash: number
  income: number
  expenses: number
  cashFlow: number
  assets: number
  liabilities: number
  netWorth: number
  savings: number
  /** 该玩家可在此市场事件中卖出的资产 id 列表 */
  sellableAssetIds?: string[]
}

export interface StateReaderBridge {
  turn: number
  phase: string
  currentPlayer: string
  currentPlayerIndex: number
  turnStatus: string
  /** pending 动作的类型字符串；无待办时为空字符串或 null（永远为「type」而非对象） */
  pendingAction: string | null
  players: RawPlayerSnapshot[]
  marketEventState: {
    phase: string
    responderIndex: number
    respondedIds: string[]
    card: { title: string; targetType: string; targetSymbol?: string | null } | null
  } | null
  marketResponderIndex: number | null
  isMarketMyTurn: boolean
  /** 回合总结弹层是否正在展示；若为 true，应先点「下一回合」关闭它 */
  showTurnSummary: boolean
  /** 决策反馈弹层（卖出/买入/贷款后的「知道了」）是否正在展示 */
  hasDecisionFeedback: boolean
}

export async function readStateBridge(page: Page): Promise<StateReaderBridge | null> {
  try {
    return await page.evaluate(() => {
      const store = (window as any).gameStore
      if (!store) return null

      // NOTE: 不能在此 callback 内定义「具名函数/命名箭头」（如 const f = () => ...）。
      // tsx 的 esbuild keepNames 会注入 __name(...)，经 page.evaluate 序列化后无法解析 → ReferenceError。
      const marketCard = store.marketEvent ?? null

      const players = store.players.map((p: any) => {
        const assets = (p.assets || []).reduce((sum: number, x: any) => sum + (x.marketPrice ?? x.cost ?? 0) * (x.quantity ?? 1), 0)
        const liabilities = (p.liabilities || []).reduce((sum: number, x: any) => sum + (x.amount ?? 0), 0)
        let sellableAssetIds: string[] | undefined
        if (marketCard) {
          sellableAssetIds = (p.assets || [])
            .filter((a: any) =>
              marketCard.targetType === 'all'
                ? true
                : marketCard.targetType === 'stock' && marketCard.targetSymbol
                  ? a.type === 'stock' && a.symbol === marketCard.targetSymbol
                  : a.type === marketCard.targetType,
            )
            .map((a: any) => a.id)
        }

        return {
          name: p.name,
          cash: p.cash ?? 0,
          income: p.totalIncome ?? 0,
          expenses: p.totalExpenses ?? 0,
          cashFlow: p.cashFlow ?? 0,
          assets,
          liabilities,
          netWorth: assets - liabilities + (p.cash ?? 0),
          savings: p.savings ?? 0,
          sellableAssetIds,
        } as RawPlayerSnapshot
      })

      const pa = store.pendingAction
      const mes = store.marketEventState
      let responderIndex: number | null = null
      if (mes) responderIndex = mes.responderIndex ?? null

      return {
        turn: store.turnNumber ?? 0,
        phase: store.phase ?? 'unknown',
        currentPlayer: store.players[store.currentPlayerIndex]?.name ?? 'unknown',
        currentPlayerIndex: store.currentPlayerIndex ?? 0,
        turnStatus: store.turnStatus ?? 'unknown',
        pendingAction: pa && pa.type ? String(pa.type) : null,
        players,
        marketEventState: mes
          ? {
              phase: mes.phase ?? 'unknown',
              responderIndex: mes.responderIndex ?? 0,
              respondedIds: (mes.respondedIds || []) as string[],
              card: marketCard ? { title: marketCard.title, targetType: marketCard.targetType, targetSymbol: marketCard.targetSymbol ?? null } : null,
            }
          : null,
        marketResponderIndex: responderIndex,
        isMarketMyTurn: (mes && store.marketResponder) ? true : false,
        showTurnSummary: store.showTurnSummary ?? false,
        hasDecisionFeedback: store.lastActionResult ? true : false,
      }
    })
  } catch {
    return null
  }
}

export async function readGameState(page: Page): Promise<GameStateSnapshot | null> {
  const bridge = await readStateBridge(page)
  if (!bridge) return null

  const players: PlayerState[] = bridge.players.map((p) => ({
    name: p.name,
    cash: p.cash,
    income: p.income,
    expenses: p.expenses,
    cashFlow: p.cashFlow,
    assets: p.assets,
    liabilities: p.liabilities,
    netWorth: p.netWorth,
    savings: p.savings,
  }))

  return {
    turn: bridge.turn,
    phase: bridge.phase,
    currentPlayer: bridge.currentPlayer,
    turnStatus: bridge.turnStatus,
    pendingAction: bridge.pendingAction ?? null,
    players,
    timestamp: new Date().toISOString(),
  }
}

export async function readRawGameState(page: Page): Promise<RawGameState | null> {
  const bridge = await readStateBridge(page)
  if (!bridge) return null
  return {
    ...bridge,
    timestamp: new Date().toISOString(),
  }
}

export interface RawGameState extends StateReaderBridge {
  timestamp: string
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
  const bridge = await readStateBridge(page)
  const p = bridge?.players[bridge.currentPlayerIndex]
  return p?.cash ?? 0
}