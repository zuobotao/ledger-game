/**
 * 允许动作推导：根据当前回合上下文（phase / pendingAction / turnStatus）返回
 * 当前合法可提交的 GameAction type 列表。
 *
 * 客户端据此渲染操作集；服务端用同一函数校验（计划 §15/§14，UI 隐藏按钮不是权限）。
 */

import type { GameStore } from './headlessStore'

/**
 * 由 store 当前状态推导允许动作。
 * 以 pendingAction.type 为主；无待定动作时回到回合起点（roll_dice）。
 */
export function deriveAllowedActions(store: GameStore): string[] {
  if (store.phase === 'setup') return []
  if (store.winnerId) return []

  const pending = store.pendingAction?.type ?? null

  switch (pending) {
    case 'opportunity':
      return ['buy_opportunity', 'auction_opportunity', 'decline_opportunity']
    case 'market':
      return ['handle_market']
    case 'doodad':
      return ['handle_doodad']
    case 'story':
      return ['handle_story']
    case 'charity':
      return ['handle_charity']
    case 'need_loan':
      return ['take_bank_loan', 'decline_opportunity']
    case 'fast_track_opportunity':
      return ['fast_track_opportunity']
    case 'fast_track_dream':
      return ['fast_track_dream']
    case 'fast_track_stock_trading':
      return ['fast_track_stock_trading']
    case 'stock_sell_opportunity':
      return ['sell_opportunity', 'skip_stock_sell']
    case 'bankrupt':
      return ['declare_bankruptcy']
    default:
      break
  }

  // 无待定动作：当前回合玩家的回合起点或推进
  const actions = ['roll_dice', 'end_turn']
  // v2.4.3 P0-C：财务自由玩家可在回合起点提交进入资本阶段意图（资格由领域状态驱动，不再依赖 View）
  if (store.currentPlayer?.phase === 'rat_race' && store.canCurrentPlayerEnterFastTrack) {
    actions.push('send_to_fast_track')
  }
  return actions
}
