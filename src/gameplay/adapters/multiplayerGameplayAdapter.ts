/**
 * MultiplayerGameplayAdapter — 多人玩法适配器（v2.4.3 §6）
 *
 * 职责：
 * - 把 server-authoritative 房间状态投影为 GameplayViewModel
 * - 把 UI command 转为 multiplayerStore.dispatch(...)（GameAction 意图）
 *
 * 约束：
 * - 客户端不自行执行规则，不直接修改权威 GameState
 * - 命令通过 requestId 等待服务器 action_result 裁决后返回 CommandResult
 */

import { computed } from 'vue'
import type { FinancialDelta, GameAction } from '@/engine/contract'
import type {
  DoodadCard,
  GameState,
  MarketEventCard,
  OpportunityCard,
  Player,
  StoryCard,
} from '@/types/game'
import { getFastTrackEligibility } from '@/engine/turnEngine'
import { calcPlayerNetWorth } from '@/engine/financialEngine'
import { useMultiplayerStore } from '@/stores/multiplayer'
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

export type MultiplayerStore = ReturnType<typeof useMultiplayerStore>

const ACTION_TIMEOUT_MS = 12000

function mapServerError(error?: string): CommandResult {
  if (!error) return commandFail('UNKNOWN', '服务器未返回错误原因')
  if (error.includes('NOT_YOUR_TURN')) return commandFail('NOT_YOUR_TURN', error)
  if (error.includes('ROOM_NOT_FOUND')) return commandFail('SESSION_EXPIRED', error)
  if (error.includes('SESSION_EXPIRED')) return commandFail('SESSION_EXPIRED', error)
  if (error.includes('INVALID_ACTION')) return commandFail('ACTION_NOT_ALLOWED', error)
  return commandFail('UNKNOWN', error)
}

export function createMultiplayerGameplayAdapter(store: MultiplayerStore): GameplayAdapter {
  const gameState = computed<GameState | null>(() => store.gameState)

  const viewModel = computed<GameplayViewModel>(() => {
    const state = store.gameState
    if (!state) throw new Error('game not started')
    const cur = state.players[state.currentPlayerIndex] ?? state.players[0]!
    const myId = store.myGamePlayerId
    const viewing = state.players.find((p) => p.id === myId) ?? cur
    const elig = getFastTrackEligibility(viewing)
    const finished = store.finished
    const isMyTurn = store.isMyTurn
    return {
      gameState: state,
      currentPlayer: cur,
      viewingPlayer: viewing,
      turnNumber: store.sessionInfo?.turnNumber ?? 0,
      roundNumber: store.sessionInfo?.turnNumber ?? 0,
      phase: state.phase,
      canAct: isMyTurn && !store.roomPaused && !finished && cur.id === myId,
      isMyTurn,
      pendingAction: state.pendingAction?.type ? state.pendingAction : null,
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
      winnerId: state.winnerId ?? null,
      gameEndReason: state.gameEndReason ?? null,
      lastAction: feedbackOf(store),
      network: {
        mode: 'multiplayer',
        status: store.status,
        roomName: store.room?.name,
        roomCode: store.room?.code,
        currentPlayerName: cur.name,
        roomPaused: store.roomPaused,
      },
    }
  })

  const EVENT_TITLES: Record<string, string> = {
    dice_rolled: '掷骰完成',
    payday_received: '发薪日到账',
    opportunity_bought: '购入机会',
    opportunity_sold: '资产卖出',
    opportunity_declined: '放弃机会',
    market_applied: '市场风云生效',
    doodad_paid: '生活意外支出',
    charity_accepted: '慈善捐赠完成',
    bank_loan_taken: '银行贷款已发放',
    bank_loan_repaid: '贷款已偿还',
    savings_deposited: '存款成功',
    savings_withdrawn: '取款成功',
    insurance_bought: '保险已购买',
    child_born: '新生命降临',
    laid_off: '遭遇失业',
    rehired: '重新就业',
    bankruptcy_declared: '破产重整',
    turn_ended: '回合结束',
    fast_track_entered: '进入资本阶段',
    stock_split: '股票拆分',
    game_over: '对局结束',
  }

  function feedbackOf(s: MultiplayerStore): LastActionFeedback | null {
    const r = s.lastResult
    if (!r) return null
    const first = r.events[0]
    const pid = s.myGamePlayerId
    return {
      success: r.success,
      title: first ? EVENT_TITLES[first.type] ?? `事件 ${first.type}` : r.success ? '操作成功' : (r.error ?? '操作失败'),
      delta: pid ? ((r.financialDeltas[pid] ?? null) as FinancialDelta | null) : null,
      warnings: [],
      timestamp: r.sequence,
    }
  }

  /** 提交意图并等待服务器 action_result 裁决（action 惰性构造：断线时先返回 NETWORK_TIMEOUT，不抛错） */
  function send(build: () => GameAction): Promise<CommandResult> {
    if (store.status !== 'open' || !store.gameState) {
      return Promise.resolve(commandFail('NETWORK_TIMEOUT', '未连接到服务器'))
    }
    const action = build()
    store.dispatch(action)
    return new Promise<CommandResult>((resolve) => {
      const start = Date.now()
      const timer = setInterval(() => {
        if (store.pendingMyRequest === null) {
          clearInterval(timer)
          const res = store.lastResult
          if (!res) {
            resolve(commandFail('UNKNOWN', '服务器无响应'))
            return
          }
          resolve(res.success ? commandOk() : mapServerError(res.error))
          return
        }
        if (Date.now() - start > ACTION_TIMEOUT_MS) {
          clearInterval(timer)
          resolve(commandFail('NETWORK_TIMEOUT', '等待服务器响应超时'))
        }
      }, 60)
    })
  }

  function myPid(): string {
    const id = store.myGamePlayerId
    if (!id) throw new Error('unknown game player')
    return id
  }

  /** 从当前服务器 pendingAction 取卡牌载荷（服务器裁决需要的原始卡） */
  function pendingCard<T>(): T {
    const c = store.gameState?.pendingAction?.card
    if (c === undefined) throw new Error('missing pending card')
    return c as T
  }

  function actionInput(input: ResolveActionInput): GameAction {
    switch (input.kind) {
      case 'charity':
        return { type: 'handle_charity', playerId: myPid(), accepted: input.accepted }
      case 'market': {
        if (input.sells.length === 0) {
          return { type: 'handle_market', playerId: myPid(), card: pendingCard<MarketEventCard>(), sellAssets: [] }
        }
        return { type: 'handle_market', playerId: myPid(), card: pendingCard<MarketEventCard>(), sellAssets: input.sells }
      }
      case 'doodad':
        return { type: 'handle_doodad', playerId: myPid(), card: pendingCard<DoodadCard>() }
      case 'story':
        return { type: 'handle_story', playerId: myPid(), card: pendingCard<StoryCard>() }
      case 'bankrupt':
        return { type: 'declare_bankruptcy', playerId: myPid() }
      case 'loan_decision':
        return input.accept
          ? { type: 'take_bank_loan', playerId: myPid(), amount: 0 }
          : { type: 'decline_opportunity', playerId: myPid(), card: pendingCard<OpportunityCard>() }
      case 'decline_opportunity':
        return { type: 'decline_opportunity', playerId: myPid(), card: pendingCard<OpportunityCard>() }
      case 'auction_opportunity':
        return { type: 'auction_opportunity', playerId: myPid() }
      case 'acknowledge': {
        // 通用「知道了」：按当前服务器 pending 类型映射到对应意图
        const t = store.gameState?.pendingAction?.type
        switch (t) {
          case 'doodad':
            return { type: 'handle_doodad', playerId: myPid(), card: pendingCard<DoodadCard>() }
          case 'bankrupt':
            return { type: 'declare_bankruptcy', playerId: myPid() }
          case 'market':
            return { type: 'handle_market', playerId: myPid(), card: pendingCard<MarketEventCard>(), sellAssets: [] }
          case 'fast_track_dream':
            return { type: 'fast_track_dream', playerId: myPid(), accepted: false }
          case 'story':
          default:
            return { type: 'handle_story', playerId: myPid(), card: pendingCard<StoryCard>() }
        }
      }
      case 'trade':
        // 老鼠圈股票交易卡：买卖均由 buy_opportunity(quantity) 表达（服务端按卡面 sell/buy 分支裁决）
        return { type: 'buy_opportunity', playerId: myPid(), card: pendingCard<OpportunityCard>(), quantity: input.quantity }
      case 'stock_sell':
        return input.skip
          ? { type: 'skip_stock_sell', playerId: myPid() }
          : {
              type: 'sell_opportunity',
              playerId: myPid(),
              assetId: input.assetId,
              quantity: input.quantity,
              price: input.price,
            }
      case 'fast_track_opportunity':
        return {
          type: 'fast_track_opportunity',
          playerId: myPid(),
          card: pendingCard<OpportunityCard>(),
          accepted: input.accepted,
          quantity: input.quantity,
        }
      case 'fast_track_dream':
        return { type: 'fast_track_dream', playerId: myPid(), accepted: input.accepted }
      case 'fast_track_trade':
        return {
          type: 'fast_track_stock_trading',
          playerId: myPid(),
          symbol: input.symbol,
          quantity: input.quantity,
          isBuy: input.isBuy,
        }
      case 'enter_fast_track':
        return { type: 'send_to_fast_track', playerId: myPid() }
      default:
        throw new Error(`unsupported resolve kind`)
    }
  }

  const commands: GameplayCommands = {
    rollDice: () => send(() => ({ type: 'roll_dice', playerId: myPid() })),
    endTurn: () => send(() => ({ type: 'end_turn', playerId: myPid() })),
    buyOpportunity: (input) =>
      send(() => ({
        type: 'buy_opportunity',
        playerId: myPid(),
        card: pendingCard<OpportunityCard>(),
        quantity: input?.quantity ?? 1,
      })),
    sellAsset: (input) =>
      send(() => ({
        type: 'sell_opportunity',
        playerId: myPid(),
        assetId: input.assetId,
        quantity: input.quantity,
        price: input.price,
      })),
    takeLoan: (input) =>
      send(() => ({ type: 'take_bank_loan', playerId: myPid(), amount: input?.amount ?? 0 })),
    repayLoan: (input) =>
      send(() => ({
        type: 'repay_bank_loan',
        playerId: myPid(),
        liabilityId: input.liabilityId,
        amount: input.amount,
      })),
    repayLiability: () => Promise.resolve(commandFail('ACTION_NOT_ALLOWED', '多人模式暂不支持一次性清偿负债')),
    depositSavings: (input) =>
      send(() => ({ type: 'deposit_savings', playerId: myPid(), amount: input.amount })),
    withdrawSavings: (input) =>
      send(() => ({ type: 'withdraw_savings', playerId: myPid(), amount: input.amount })),
    buyInsurance: () => Promise.resolve(commandFail('ACTION_NOT_ALLOWED', '多人模式暂不支持购买保险')),
    resolvePendingAction: (input) => send(() => actionInput(input)),
  }

  return {
    viewModel,
    commands,
    meta: { mode: 'multiplayer', networkStatus: store.status },
    setViewingPlayer(_playerId: string) {
      // 多人按服务器权威座位渲染，不支持本地切换查看玩家
    },
    dispose() {
      // 连接生命周期由 RoomLobby / MultiplayerHome 管理
    },
  }
}
