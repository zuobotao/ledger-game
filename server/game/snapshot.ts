/**
 * 权威快照组合：从 store 暴露的 refs 组合 GameState，并派生 TurnContext。
 *
 * 快照字段与客户端 store.saveState() 完全一致，确保三端状态同构；
 * 不写 localStorage，按会话隔离，符合计划 §18/§20/§30。
 */

import type { GameState } from '@/types/game'
import type { TurnContext } from '@/network/protocol'
import type { GameStore } from './headlessStore'
import { deriveAllowedActions } from './allowedActions'

/** 组合 GameState 快照（复用 store 暴露字段，与 saveState 的结构对齐） */
export function buildGameState(store: GameStore): GameState {
  return {
    players: store.players,
    currentPlayerIndex: store.currentPlayerIndex,
    phase: store.phase,
    config: store.config,
    winnerId: store.winnerId,
    gameEndReason: store.gameEndReason,
    turnStatus: store.turnStatus,
    lastRoll: store.lastRoll,
    turnNumber: store.turnNumber,
    gameMonth: store.gameMonth,
    pendingAction: store.pendingAction,
    marketEvent: store.marketEvent,
    marketEventState: store.marketEventState,
    decks: store.decks,
    transactions: store.transactions,
    cardHistory: store.cardHistory,
    gameStartTime: store.gameStartTime,
    ratRaceTurns: store.ratRaceTurns,
    fastTrackTurns: store.fastTrackTurns,
    stockPrices: store.stockPrices,
  }
}

/** 由 store 当前状态派生回合上下文 */
export function buildTurnContext(store: GameStore): TurnContext {
  return {
    currentPlayerId: store.currentPlayer?.id ?? '',
    pendingAction: store.pendingAction?.type ?? null,
    allowedActions: deriveAllowedActions(store),
  }
}