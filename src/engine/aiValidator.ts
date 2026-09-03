/**
 * AI Action Validator — 验证 AI 产生的 GameAction 是否合法
 *
 * 确保 AI 不会产生无效操作（如操作不存在的玩家、金额超出范围等）。
 * 用于 Engine 层的安全检查和测试断言。
 */

import type { GameAction } from '@/engine/contract'
import type { GameState } from '@/types/game'

/**
 * 从 GameAction 中安全提取 playerId。
 * GameAction 是判别联合类型，大部分子类型都有 playerId 字段。
 */
function getActionPlayerId(action: GameAction): string | undefined {
  if ('playerId' in action) {
    return (action as unknown as { playerId: string }).playerId
  }
  return undefined
}

/**
 * 验证 AI 产生的 GameAction 在当前游戏状态下是否合法。
 *
 * @param action - 待验证的动作
 * @param state - 当前游戏状态
 * @returns { valid: boolean, error?: string }
 */
export function validateAIAction(
  action: GameAction,
  state: GameState,
): { valid: boolean; error?: string } {
  // 不需要 playerId 的动作
  const noPlayerActions = new Set(['start_game', 'reset_game'])
  const actionType = action.type

  if (!noPlayerActions.has(actionType)) {
    const playerId = getActionPlayerId(action)
    if (!playerId) {
      return { valid: false, error: `${actionType}: playerId is required` }
    }

    const player = state.players.find((p) => p.id === playerId)
    if (!player) {
      return { valid: false, error: `${actionType}: player "${playerId}" not found` }
    }
  }

  // 根据动作类型进行特定验证
  switch (actionType) {
    case 'take_bank_loan': {
      if (action.amount <= 0) {
        return { valid: false, error: 'take_bank_loan: amount must be positive' }
      }
      break
    }

    case 'repay_bank_loan': {
      if (action.amount <= 0) {
        return { valid: false, error: 'repay_bank_loan: amount must be positive' }
      }
      const player = state.players.find((p) => p.id === action.playerId)
      if (player) {
        const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
        if (!bankLoan || bankLoan.amount <= 0) {
          return { valid: false, error: 'repay_bank_loan: no bank loan to repay' }
        }
        if (action.amount > bankLoan.amount) {
          return {
            valid: false,
            error: `repay_bank_loan: amount ${action.amount} exceeds loan balance ${bankLoan.amount}`,
          }
        }
        if (action.amount > player.cash) {
          return {
            valid: false,
            error: `repay_bank_loan: amount ${action.amount} exceeds cash ${player.cash}`,
          }
        }
      }
      break
    }

    case 'buy_opportunity': {
      if (action.quantity !== undefined && action.quantity <= 0) {
        return { valid: false, error: 'buy_opportunity: quantity must be positive' }
      }
      if (action.card.cost <= 0) {
        return { valid: false, error: 'buy_opportunity: card cost must be positive' }
      }
      break
    }

    case 'sell_opportunity': {
      if (action.quantity !== undefined && action.quantity <= 0) {
        return { valid: false, error: 'sell_opportunity: quantity must be positive' }
      }
      const player = state.players.find((p) => p.id === action.playerId)
      if (player) {
        const asset = player.assets.find((a) => a.id === action.assetId)
        if (!asset) {
          return {
            valid: false,
            error: `sell_opportunity: asset "${action.assetId}" not found`,
          }
        }
        if (action.quantity !== undefined && action.quantity > asset.quantity) {
          return {
            valid: false,
            error: `sell_opportunity: quantity ${action.quantity} exceeds owned ${asset.quantity}`,
          }
        }
      }
      break
    }

    case 'deposit_savings': {
      if (action.amount <= 0) {
        return { valid: false, error: 'deposit_savings: amount must be positive' }
      }
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && action.amount > player.cash) {
        return {
          valid: false,
          error: `deposit_savings: amount ${action.amount} exceeds cash ${player.cash}`,
        }
      }
      break
    }

    case 'withdraw_savings': {
      if (action.amount <= 0) {
        return { valid: false, error: 'withdraw_savings: amount must be positive' }
      }
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && action.amount > player.savings) {
        return {
          valid: false,
          error: `withdraw_savings: amount ${action.amount} exceeds savings ${player.savings}`,
        }
      }
      break
    }

    case 'fast_track_stock_trading': {
      if (action.quantity <= 0) {
        return {
          valid: false,
          error: 'fast_track_stock_trading: quantity must be positive',
        }
      }
      break
    }

    case 'ai_think': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && !player.isAI) {
        return {
          valid: false,
          error: `ai_think: player "${action.playerId}" is not an AI`,
        }
      }
      break
    }

    case 'handle_charity': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && action.accepted) {
        const donationAmount = Math.floor(player.totalIncome * 0.1)
        if (player.cash < donationAmount) {
          return {
            valid: false,
            error: `handle_charity: insufficient cash ${player.cash} for donation ${donationAmount}`,
          }
        }
      }
      break
    }

    case 'send_to_fast_track': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && player.phase !== 'rat_race') {
        return {
          valid: false,
          error: `send_to_fast_track: player "${action.playerId}" is not in rat_race`,
        }
      }
      break
    }

    case 'fast_track_escape': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && player.phase !== 'fast_track') {
        return {
          valid: false,
          error: `fast_track_escape: player "${action.playerId}" is not in fast_track`,
        }
      }
      break
    }

    case 'declare_bankruptcy': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (player && player.isBankrupt) {
        return {
          valid: false,
          error: `declare_bankruptcy: player "${action.playerId}" is already bankrupt`,
        }
      }
      break
    }

    default:
      break
  }

  return { valid: true }
}