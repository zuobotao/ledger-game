/**
 * SingleGameplayAdapter — 单机玩法适配器（v2.4.3 §5）
 *
 * 职责（仅数据适配 / 命令适配 / 错误标准化，禁止新增规则）：
 * - 把本地 gameStore 投影为 GameplayViewModel
 * - 把 GameplayCommands 映射为 store 方法调用
 *
 * 本地 Engine 权威不变；Shared UI 不直接 import useGameStore。
 */

import { computed } from 'vue'
import type { GameState } from '@/types/game'
import { getFastTrackEligibility } from '@/engine/turnEngine'
import { calcPlayerNetWorth } from '@/engine/financialEngine'
import { useGameStore } from '@/stores/game'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import {
  commandFail,
  commandOk,
  type CommandResult,
  type GameplayCommands,
  type GameplayViewModel,
  type LastActionFeedback,
  type ResolveActionInput,
} from '@/gameplay/types'

export type SingleGameStore = ReturnType<typeof useGameStore>

function feedbackOf(store: SingleGameStore): LastActionFeedback | null {
  const r = store.lastActionResult
  if (!r) return null
  return { success: r.success, title: r.title, delta: r.delta, warnings: r.warnings, timestamp: r.timestamp }
}

export function createSingleGameplayAdapter(store: SingleGameStore): GameplayAdapter {
  const gameState = computed<GameState>(() => ({
    players: store.players,
    currentPlayerIndex: store.currentPlayerIndex,
    phase: store.phase,
    config: store.config,
    winnerId: store.winnerId,
    gameEndReason: store.gameEndReason,
    turnStatus: store.turnStatus,
    lastRoll: store.lastRoll,
    lastDiceValues: store.lastDiceValues,
    turnNumber: store.turnNumber,
    gameMonth: store.gameMonth,
    pendingAction: store.pendingAction,
    marketEvent: store.marketEvent ?? null,
    marketEventState: store.marketEventState ?? null,
    transactions: store.transactions,
    cardHistory: store.cardHistory,
    stockPrices: store.stockPrices,
  }))

  const viewModel = computed<GameplayViewModel>(() => {
    const cur = store.currentPlayer
    const viewing = store.viewingPlayer
    if (!cur || !viewing) throw new Error('game not started')
    const elig = getFastTrackEligibility(viewing)
    const finished = Boolean(store.winnerId) || store.turnStatus === 'finished'
    const canAct =
      !cur.isAI &&
      !store.isAIThinking &&
      !finished &&
      !(store.marketEventState && store.marketEventState.responderIndex !== 0)
    return {
      gameState: gameState.value,
      currentPlayer: cur,
      viewingPlayer: viewing,
      turnNumber: store.turnNumber,
      roundNumber: store.turnNumber,
      phase: store.phase === 'setup' ? 'setup' : store.winnerId ? 'finished' : cur.phase,
      canAct,
      isMyTurn: !cur.isAI && !finished,
      // 纯消息型落点（type=null）也必须透传给共享棋盘的 toast。
      pendingAction: store.pendingAction?.type || store.pendingAction?.message ? store.pendingAction : null,
      finance: {
        cash: viewing.cash,
        savings: viewing.savings,
        monthlyCashFlow: viewing.cashFlow,
        netWorth: calcPlayerNetWorth(viewing),
        passiveIncome: viewing.passiveIncome,
        totalExpenses: viewing.totalExpenses,
      },
      fastTrack: {
        eligible: elig.eligible,
        progress: elig.eligible ? 1 : elig.totalExpenses > 0 ? Math.min(1, elig.passiveIncome / elig.totalExpenses) : 0,
        gap: elig.gap,
      },
      finished,
      winnerId: store.winnerId,
      gameEndReason: store.gameEndReason,
      lastAction: feedbackOf(store),
      network: { mode: 'single', status: 'local' },
    }
  })

  function toResult(ok: unknown, code: CommandResult extends never ? never : 'ACTION_NOT_ALLOWED', message: string): CommandResult {
    return ok === false ? commandFail(code, message) : commandOk()
  }

  function pendingType(): string | null {
    return store.pendingAction?.type ?? null
  }

  const commands: GameplayCommands = {
    async rollDice() {
      try {
        if (store.currentPlayer?.phase === 'fast_track') store.fastTrackRollDice()
        else store.ratRaceRollDice()
        return commandOk()
      } catch {
        return commandFail('UNKNOWN', '掷骰失败')
      }
    },
    async endTurn() {
      try {
        if (store.currentPlayer?.phase === 'fast_track') store.moveToNextPlayer()
        else store.endTurnWithSummary()
        return commandOk()
      } catch {
        return commandFail('UNKNOWN', '结束回合失败')
      }
    },
    async buyOpportunity(input) {
      return toResult(store.buyOpportunity(input?.quantity ?? 1), 'ACTION_NOT_ALLOWED', '当前无法购入机会')
    },
    async sellAsset(input) {
      if (pendingType() === 'stock_sell_opportunity') {
        return toResult(
          store.sellStockFromOpportunity(input.assetId, input.price ?? 0, input.quantity),
          'ACTION_NOT_ALLOWED',
          '无法卖出该资产',
        )
      }
      return toResult(store.sellAssetToMarket(input.assetId, input.quantity), 'ACTION_NOT_ALLOWED', '无法卖出该资产')
    },
    async takeLoan(input) {
      if (pendingType() === 'need_loan') {
        const ok = store.confirmLoanForPending()
        return ok
          ? commandOk()
          : commandFail('ACTION_NOT_ALLOWED', store.lastLoanError || '无法办理贷款')
      }
      if (!input?.amount) return commandFail('INVALID_QUANTITY', '请指定贷款金额')
      const ok = store.takeBankLoan(input.amount)
      return ok
        ? commandOk()
        : commandFail('ACTION_NOT_ALLOWED', store.lastLoanError || '贷款申请被拒绝')
    },
    async repayLoan(input) {
      return toResult(store.repayBankLoan(input.liabilityId, input.amount), 'ACTION_NOT_ALLOWED', '还款失败')
    },
    async repayLiability(input) {
      return toResult(store.payoffLiability(input.liabilityId), 'ACTION_NOT_ALLOWED', '清偿失败')
    },
    async depositSavings(input) {
      return toResult(store.depositToSavings(input.amount), 'ACTION_NOT_ALLOWED', '存款失败')
    },
    async withdrawSavings(input) {
      return toResult(store.withdrawFromSavings(input.amount), 'ACTION_NOT_ALLOWED', '取款失败')
    },
    async buyInsurance(input) {
      if (input?.type === 'unemployment') {
        return toResult(store.toggleUnemploymentInsurance(), 'ACTION_NOT_ALLOWED', '失业保险操作失败')
      }
      return toResult(store.buyInsurance(), 'ACTION_NOT_ALLOWED', '购买保险失败')
    },
    async resolvePendingAction(input: ResolveActionInput) {
      switch (input.kind) {
        case 'charity':
          return input.accepted
            ? toResult(store.acceptCharity(), 'ACTION_NOT_ALLOWED', '捐赠失败')
            : toResult(store.declineCharity(), 'ACTION_NOT_ALLOWED', '操作失败')
        case 'child_gift': {
          const pending = store.pendingAction
          const recipientId = String(pending?.meta?.recipientId ?? '')
          const playerId = store.viewingPlayer?.id ?? store.currentPlayer?.id ?? ''
          return toResult(store.handleChildGift(playerId, recipientId, input.accepted), 'ACTION_NOT_ALLOWED', '随礼失败')
        }
        case 'market':
          if (input.sells.length === 0) return toResult(store.dismissMarketEvent(), 'ACTION_NOT_ALLOWED', '结束市场事件失败')
          return toResult(store.sellAssetToMarket(input.sells[0]!.assetId, input.sells[0]!.quantity), 'ACTION_NOT_ALLOWED', '卖出失败')
        case 'doodad':
          return toResult(store.dismissDoodad(), 'ACTION_NOT_ALLOWED', '处理失败')
        case 'story':
          return toResult(store.dismissStoryCard(), 'ACTION_NOT_ALLOWED', '处理失败')
        case 'bankrupt':
          return toResult(store.resolveBankruptcy(), 'ACTION_NOT_ALLOWED', '破产处理失败')
        case 'loan_decision':
          return input.accept
            ? toResult(store.confirmLoanForPending(), 'ACTION_NOT_ALLOWED', '贷款失败')
            : toResult(store.declineLoanForPending(), 'ACTION_NOT_ALLOWED', '操作失败')
        case 'decline_opportunity':
          return toResult(store.declineOpportunity(), 'ACTION_NOT_ALLOWED', '放弃失败')
        case 'auction_opportunity':
          return toResult(store.auctionOpportunity(), 'ACTION_NOT_ALLOWED', '暂时无法发起竞价')
        case 'acknowledge':
          if (store.pendingAction?.type === 'fast_track_stock_trading') {
            store.closeStockTrading()
            return commandOk()
          }
          return toResult(store.acknowledgeMessage(), 'ACTION_NOT_ALLOWED', '操作失败')
        case 'stock_sell':
          return input.skip
            ? toResult(store.dismissStockSellOpportunity(), 'ACTION_NOT_ALLOWED', '操作失败')
            : toResult(
                store.sellStockFromOpportunity(input.assetId, input.price, input.quantity),
                'ACTION_NOT_ALLOWED',
                '卖出失败',
              )
        case 'fast_track_opportunity':
          return input.accepted
            ? toResult(store.buyOpportunity(input.quantity ?? 1), 'ACTION_NOT_ALLOWED', '买入失败')
            : toResult(store.declineOpportunity(), 'ACTION_NOT_ALLOWED', '放弃失败')
        case 'fast_track_dream':
          return input.accepted
            ? toResult(store.buyDream(), 'ACTION_NOT_ALLOWED', '购买梦想失败')
            : toResult(store.acknowledgeMessage(), 'ACTION_NOT_ALLOWED', '操作失败')
        case 'fast_track_trade': {
          const ok = input.isBuy
            ? store.fastTrackBuyStock(input.symbol, input.quantity)
            : store.fastTrackSellStock(input.symbol, input.quantity)
          if (ok === false) return commandFail('ACTION_NOT_ALLOWED', '交易失败')
          store.closeStockTrading()
          return commandOk()
        }
        case 'trade': {
          const ok = input.isBuy
            ? store.tradeBuyStock(input.quantity)
            : store.tradeSellStock(input.quantity)
          if (ok === false) return commandFail('ACTION_NOT_ALLOWED', '交易失败')
          return commandOk()
        }
        case 'enter_fast_track':
          return toResult(store.enterFastTrack(), 'ACTION_NOT_ALLOWED', '当前不具备进入资本阶段资格')
        default:
          return commandFail('ACTION_NOT_ALLOWED', '未知操作')
      }
    },
  }

  return {
    viewModel,
    commands,
    meta: { mode: 'single', networkStatus: 'local' },
    setViewingPlayer(playerId: string) {
      store.setViewingPlayer(playerId)
    },
    dispose() {
      // 单机 store 为全局单例，无需释放
    },
  }
}
