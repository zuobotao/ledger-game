/**
 * 动作映射适配层：把协议 GameAction → store 方法调用。
 *
 * 权威原则（计划 §12/§13/§14）：
 * - 客户端只提交"意图"，不得提交最终状态。
 * - 服务端用 allowedActions 校验动作类型，用当前玩家校验 playerId。
 * - 卡牌等敏感载荷以服务端 pendingAction 为准（忽略客户端传入的 card）。
 *
 * 返回成功/失败。一切以服务端 store 结果为准（store 自带 pendingAction / turnStatus 守卫）。
 */

import type { GameAction } from '@/engine/contract'
import { ErrorCodes } from '@/network/protocol'
import type { GameStore } from './headlessStore'
import { deriveAllowedActions } from './allowedActions'

export interface ActionOutcome {
  ok: boolean
  error?: string
}

/**
 * 校验并执行 GameAction。
 * 通过则返回 { ok: true }；由于客户端仅提交意图、store 权威裁决，
 * 具体状态变化由调用方读取最新快照获得。
 */
export function applyGameAction(store: GameStore, action: GameAction): ActionOutcome {
  if (store.phase === 'setup' || store.winnerId) {
    return { ok: false, error: ErrorCodes.INVALID_ACTION }
  }

  // 当前玩家校验（大多数单人动作作用于 currentPlayer）
  if (!requiresNoPlayer(action.type)) {
    const actor = (action as { playerId?: string }).playerId
    if (!actor || actor !== store.currentPlayer?.id) {
      return { ok: false, error: ErrorCodes.NOT_YOUR_TURN }
    }
  }

  // 动作类型校验：是否在允许集合内
  const allowed = deriveAllowedActions(store)
  if (!allowed.includes(action.type)) {
    return { ok: false, error: ErrorCodes.INVALID_ACTION }
  }

  try {
    return execute(store, action)
  } catch (err) {
    console.error('[roomsrv] action error', action.type, err)
    return { ok: false, error: ErrorCodes.INVALID_ACTION }
  }
}

function requiresNoPlayer(type: string): boolean {
  // 以下动作不针对单一行动玩家（目仅 end_turn 这类推进型会带 playerId，保留校验）
  return false
}

type StoreDict = Record<string, (...args: never[]) => unknown>

function execute(store: GameStore, action: GameAction): ActionOutcome {
  switch (action.type) {
    case 'roll_dice': {
      if (store.currentPlayer?.phase === 'fast_track') {
        store.fastTrackRollDice()
      } else {
        store.ratRaceRollDice()
      }
      return { ok: true }
    }

    case 'handle_charity': {
      const a = action as { accepted: boolean }
      if (a.accepted) store.acceptCharity()
      else store.declineCharity()
      return { ok: true }
    }

    case 'buy_opportunity': {
      const a = action as { quantity?: number }
      const ok = (store as unknown as StoreDict).buyOpportunity(a.quantity ?? 1)
      return ok === false ? fail() : { ok: true }
    }

    case 'auction_opportunity': {
      const ok = store.auctionOpportunity()
      return ok === false ? fail() : { ok: true }
    }

    case 'decline_opportunity': {
      store.declineOpportunity()
      return { ok: true }
    }

    case 'handle_market': {
      const a = action as { sellAssetIds?: string[]; sellAssets?: { assetId: string; quantity: number }[] }
      const sells = a.sellAssets && a.sellAssets.length > 0
        ? a.sellAssets
        : (a.sellAssetIds ?? []).map((id) => ({ assetId: id, quantity: 1 }))
      if (sells.length > 0) {
        for (const s of sells) {
          if (store.sellAssetToMarket(s.assetId, s.quantity) === false) return fail()
        }
      } else {
        store.dismissMarketEvent()
      }
      return { ok: true }
    }

    case 'handle_doodad': {
      store.dismissDoodad()
      return { ok: true }
    }

    case 'handle_story': {
      store.dismissStoryCard()
      return { ok: true }
    }

    case 'take_bank_loan': {
      const a = action as { amount?: number }
      const pending = store.pendingAction?.type
      let ok: unknown
      if (pending === 'need_loan') {
        ok = store.confirmLoanForPending()
      } else if (typeof a.amount === 'number' && a.amount > 0) {
        ok = store.takeBankLoan(a.amount)
      } else {
        return fail()
      }
      return ok === false ? fail() : { ok: true }
    }

    case 'repay_bank_loan': {
      const a = action as { liabilityId: string; amount: number }
      if (!a.liabilityId || !(a.amount > 0)) return fail()
      const ok = store.repayBankLoan(a.liabilityId, a.amount)
      return ok === false ? fail() : { ok: true }
    }

    case 'deposit_savings': {
      const a = action as { amount: number }
      const ok = store.depositToSavings(a.amount)
      return ok === false ? fail() : { ok: true }
    }

    case 'withdraw_savings': {
      const a = action as { amount: number }
      const ok = store.withdrawFromSavings(a.amount)
      return ok === false ? fail() : { ok: true }
    }

    case 'sell_opportunity': {
      const a = action as { assetId: string; quantity?: number; price?: number }
      if (store.pendingAction?.type === 'stock_sell_opportunity') {
        const price = a.price ?? 0
        const qty = a.quantity ?? 1
        const ok = store.sellStockFromOpportunity(a.assetId, price, qty)
        return ok === false ? fail() : { ok: true }
      }
      const ok = store.sellAssetToMarket(a.assetId, a.quantity)
      return ok === false ? fail() : { ok: true }
    }

    case 'skip_stock_sell':
      store.dismissStockSellOpportunity()
      return { ok: true }

    case 'end_turn': {
      store.moveToNextPlayer()
      return { ok: true }
    }

    case 'declare_bankruptcy': {
      if (store.pendingAction?.type === 'bankrupt') store.resolveBankruptcy()
      else store.declareBankruptcy()
      return { ok: true }
    }

    case 'send_to_fast_track': {
      store.enterFastTrack()
      return { ok: true }
    }

    case 'fast_track_dream': {
      const a = action as { accepted: boolean }
      if (a.accepted) store.buyDream()
      else store.acknowledgeMessage()
      return { ok: true }
    }

    case 'fast_track_opportunity': {
      const a = action as { accepted: boolean; quantity?: number }
      if (!a.accepted) {
        store.declineOpportunity()
        return { ok: true }
      }
      const ok = (store as unknown as StoreDict).buyOpportunity(a.quantity ?? 1)
      return ok === false ? fail() : { ok: true }
    }

    case 'fast_track_stock_trading': {
      const a = action as { symbol: string; quantity: number; isBuy: boolean }
      const ok = a.isBuy ? store.fastTrackBuyStock(a.symbol, a.quantity) : store.fastTrackSellStock(a.symbol, a.quantity)
      if (ok === false) return fail()
      store.closeStockTrading()
      return { ok: true }
    }

    default:
      return fail()
  }
}

function fail(): ActionOutcome {
  return { ok: false, error: ErrorCodes.INVALID_ACTION }
}
