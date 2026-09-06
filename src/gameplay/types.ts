/**
 * Gameplay Contract — 单机 / 多人共享的统一玩法契约（v2.4.3 §4 / §9 / §32）
 *
 * Shared UI 只依赖本模块导出的类型与 GameplayAdapter 接口，
 * 不直接 import useGameStore() / useMultiplayerStore()。
 *
 * 原则：
 * - ViewModel 是只读投影；一切状态变化只通过 Commands 发生。
 * - Commands 返回 CommandResult，UI 不再 console.warn。
 * - 单机 Adapter 把本地 store 映射成本契约；多人 Adapter 把服务器快照映射成本契约。
 */

import type { ComputedRef } from 'vue'
import type {
  GameEvent,
} from '@/engine/contract'
import type {
  GamePhase,
  GameState,
  PendingAction,
  PendingActionType,
  Player,
} from '@/types/game'

// ==================== CommandResult（§32） ====================

export type GameErrorCode =
  | 'INSUFFICIENT_CASH'
  | 'INVALID_QUANTITY'
  | 'INSUFFICIENT_HOLDING'
  | 'INVALID_PRICE'
  | 'NOT_YOUR_TURN'
  | 'ACTION_NOT_ALLOWED'
  | 'NETWORK_TIMEOUT'
  | 'STATE_OUT_OF_SYNC'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN'

export type CommandResult =
  | { ok: true }
  | { ok: false; code: GameErrorCode; message: string }

// ==================== ViewModel（§4） ====================

export interface GameplayFinance {
  cash: number
  savings: number
  monthlyCashFlow: number
  netWorth: number
  passiveIncome: number
  totalExpenses: number
}

export interface FastTrackStatus {
  /** 当前查看玩家是否具备进入资本阶段资格 */
  eligible: boolean
  /** 进度（0-1）；无明确进度时按被动收入/总支出比例 */
  progress: number
  /** 差额：距财务自由还差多少被动收入 */
  gap: number
}

export interface GameplayNetworkInfo {
  mode: 'single' | 'multiplayer'
  /** 多人：连接状态（idle/connecting/joined/failed 等） */
  status?: string
  roomName?: string
  roomCode?: string
  /** 多人：当前轮到谁行动（展示用） */
  currentPlayerName?: string
  /** 多人：是否房间暂停（等待重连） */
  roomPaused?: boolean
}

export interface GameplayViewModel {
  gameState: GameState
  currentPlayer: Player
  viewingPlayer: Player
  turnNumber: number
  /** 全体玩家完成一轮的轮次号；单机默认等于 turnNumber */
  roundNumber: number
  phase: GamePhase
  /** 当前玩家是否可操作（非 AI / 网络正常 / 未暂停） */
  canAct: boolean
  /** 是否轮到我行动 */
  isMyTurn: boolean
  pendingAction: PendingAction | null
  finance: GameplayFinance
  fastTrack: FastTrackStatus
  finished: boolean
  winnerId: string | null
  gameEndReason?: 'victory' | 'retirement' | 'bankrupt' | null
  lastEvents: GameEvent[]
  network: GameplayNetworkInfo
}

// ==================== 统一事件信息模型（§9） ====================

/**
 * PendingAction 的统一展示模型。
 * 所有事件（Opportunity/Market/Doodad/Baby/Charity/Unemployment/Story/
 * Capital Trade/Bond/Real Estate/Accident/Financing/Dream）都投影成此结构，
 * 供 Shared PendingActionPanel / DecisionModal 渲染。
 */
export interface PendingActionPresentation {
  name: string
  type: PendingActionType
  description: string
  price: number | null
  quantity: number | null
  cost: number | null
  income: number | null
  cashflowImpact: number | null
  netWorthImpact: number | null
  risk: string | null
  beforeCash: number
  afterCash: number | null
  /** 原始卡牌载荷（有则透传给专门的交易面板） */
  card: unknown
}

// ==================== Command 输入（§4） ====================

export interface BuyOpportunityInput {
  quantity?: number
}

export interface SellAssetInput {
  assetId: string
  quantity: number
  /** 市场/机会卖出单价；缺失时由 Adapter 取权威价格 */
  price?: number
}

export interface LoanInput {
  /** 缺失时使用默认（最大可贷或 pending 需求） */
  amount?: number
}

export interface RepayInput {
  liabilityId: string
  amount: number
}

export interface InsuranceInput {
  type?: 'health' | 'unemployment'
  cost?: number
}

export type ResolveActionInput =
  | { kind: 'charity'; accepted: boolean }
  | { kind: 'market'; sells: { assetId: string; quantity: number }[] }
  | { kind: 'doodad' }
  | { kind: 'story' }
  | { kind: 'bankrupt' }
  | { kind: 'loan_decision'; accept: boolean }
  | {
      kind: 'stock_sell'
      assetId: string
      quantity: number
      price: number
      /** true 时表示跳过本次卖出机会 */
      skip?: boolean
    }
  | { kind: 'fast_track_opportunity'; accepted: boolean; quantity?: number }
  | { kind: 'fast_track_dream'; accepted: boolean }
  | { kind: 'fast_track_trade'; symbol: string; quantity: number; isBuy: boolean }
  | { kind: 'enter_fast_track' }

// ==================== Commands（§4） ====================

export interface GameplayCommands {
  rollDice(): Promise<CommandResult>
  endTurn(): Promise<CommandResult>
  buyOpportunity(input?: BuyOpportunityInput): Promise<CommandResult>
  sellAsset(input: SellAssetInput): Promise<CommandResult>
  takeLoan(input?: LoanInput): Promise<CommandResult>
  repayLoan(input: RepayInput): Promise<CommandResult>
  repayLiability(input: { liabilityId: string }): Promise<CommandResult>
  depositSavings(input: { amount: number }): Promise<CommandResult>
  withdrawSavings(input: { amount: number }): Promise<CommandResult>
  buyInsurance(input?: InsuranceInput): Promise<CommandResult>
  resolvePendingAction(input: ResolveActionInput): Promise<CommandResult>
}

// ==================== 工具函数 ====================

export function commandOk(): CommandResult {
  return { ok: true }
}

export function commandFail(code: GameErrorCode, message: string): CommandResult {
  return { ok: false, code, message }
}

export function isCommandOk(r: CommandResult): r is { ok: true } {
  return r.ok
}
