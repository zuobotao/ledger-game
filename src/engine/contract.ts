/**
 * Ledger Game Engine — Domain Contract
 *
 * 核心领域契约：GameAction / GameResult / GameEvent
 * 基于现有 GameState 定义，不直接重写 Store。
 * 为后续 Engine / AI / Replay 提供稳定的类型入口。
 *
 * 原则：
 * - 所有对游戏状态的修改必须通过 GameAction → GameEngine → GameResult 完成。
 * - GameEvent 为不可变的事件记录，用于回放、审计和 UI 反馈。
 * - 本文件只定义契约，不包含实现逻辑。
 */

import type {
  GameConfig,
  GamePhase,
  GameState,
  OpportunityCard,
  MarketEventCard,
  DoodadCard,
  StoryCard,
  Player,
  TransactionRecord,
  CardHistoryRecord,
  TurnStatus,
} from '@/types/game'

// ==================== GameAction ====================

/** 所有游戏操作的判别联合类型 */
export type GameAction =
  | StartGameAction
  | RollDiceAction
  | MovePlayerAction
  | ResolveCellAction
  | HandlePaydayAction
  | HandleCharityAction
  | BuyOpportunityAction
  | SellOpportunityAction
  | DeclineOpportunityAction
  | HandleMarketAction
  | HandleDoodadAction
  | HandleStoryAction
  | TakeBankLoanAction
  | RepayBankLoanAction
  | DepositSavingsAction
  | WithdrawSavingsAction
  | BuyInsuranceAction
  | DeclareBankruptcyAction
  | EndTurnAction
  | ResetGameAction
  | FastTrackEscapeAction
  | FastTrackOpportunityAction
  | FastTrackDreamAction
  | FastTrackStockTradingAction
  | AIThinkAction
  | SendToFastTrackAction

// ---- Action Types ----

export interface StartGameAction {
  type: 'start_game'
  config: GameConfig
  playerSetups: PlayerSetup[]
}

export interface PlayerSetup {
  name: string
  colorId: string
  careerId: string
  dreamId?: string
  isAI?: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

export interface RollDiceAction {
  type: 'roll_dice'
  playerId: string
}

export interface MovePlayerAction {
  type: 'move_player'
  playerId: string
  steps: number
}

export interface ResolveCellAction {
  type: 'resolve_cell'
  playerId: string
  cellIndex: number
  phase: 'rat_race' | 'fast_track'
}

export interface HandlePaydayAction {
  type: 'handle_payday'
  playerId: string
}

export interface HandleCharityAction {
  type: 'handle_charity'
  playerId: string
  accepted: boolean
}

export interface BuyOpportunityAction {
  type: 'buy_opportunity'
  playerId: string
  card: OpportunityCard
  quantity?: number
}

export interface SellOpportunityAction {
  type: 'sell_opportunity'
  playerId: string
  assetId: string
  quantity?: number
  price?: number
}

export interface DeclineOpportunityAction {
  type: 'decline_opportunity'
  playerId: string
  card: OpportunityCard
}

export interface HandleMarketAction {
  type: 'handle_market'
  playerId: string
  card: MarketEventCard
  sellAssetIds?: string[]
}

export interface HandleDoodadAction {
  type: 'handle_doodad'
  playerId: string
  card: DoodadCard
}

export interface HandleStoryAction {
  type: 'handle_story'
  playerId: string
  card: StoryCard
}

export interface TakeBankLoanAction {
  type: 'take_bank_loan'
  playerId: string
  amount: number
}

export interface RepayBankLoanAction {
  type: 'repay_bank_loan'
  playerId: string
  liabilityId: string
  amount: number
}

export interface DepositSavingsAction {
  type: 'deposit_savings'
  playerId: string
  amount: number
}

export interface WithdrawSavingsAction {
  type: 'withdraw_savings'
  playerId: string
  amount: number
}

export interface BuyInsuranceAction {
  type: 'buy_insurance'
  playerId: string
  insuranceType: 'health' | 'unemployment'
}

export interface DeclareBankruptcyAction {
  type: 'declare_bankruptcy'
  playerId: string
}

export interface EndTurnAction {
  type: 'end_turn'
  playerId: string
}

export interface ResetGameAction {
  type: 'reset_game'
}

export interface FastTrackEscapeAction {
  type: 'fast_track_escape'
  playerId: string
}

export interface FastTrackOpportunityAction {
  type: 'fast_track_opportunity'
  playerId: string
  card: OpportunityCard
  accepted: boolean
}

export interface FastTrackDreamAction {
  type: 'fast_track_dream'
  playerId: string
  accepted: boolean
}

export interface FastTrackStockTradingAction {
  type: 'fast_track_stock_trading'
  playerId: string
  symbol: string
  quantity: number
  isBuy: boolean
}

export interface AIThinkAction {
  type: 'ai_think'
  playerId: string
}

export interface SendToFastTrackAction {
  type: 'send_to_fast_track'
  playerId: string
}

// ==================== GameResult ====================

export interface GameResult {
  /** 操作是否成功 */
  success: boolean
  /** 操作后的游戏状态（成功时） */
  state?: GameState
  /** 操作产生的事件列表 */
  events: GameEvent[]
  /** 错误信息（失败时） */
  error?: string
  /** 操作后需要 UI 展示的临时消息 */
  messages: GameMessage[]
}

export interface GameMessage {
  type: 'info' | 'gain' | 'loss' | 'major'
  text: string
  meta?: Record<string, unknown>
}

// ==================== GameEvent ====================

/**
 * 不可变的事件记录。
 * 所有重要游戏状态变化都应以 GameEvent 形式记录。
 */
export type GameEvent =
  | GameStartedEvent
  | DiceRolledEvent
  | PlayerMovedEvent
  | CellResolvedEvent
  | PaydayReceivedEvent
  | CharityAcceptedEvent
  | OpportunityBoughtEvent
  | OpportunitySoldEvent
  | OpportunityDeclinedEvent
  | MarketEventAppliedEvent
  | DoodadPaidEvent
  | StoryResolvedEvent
  | BankLoanTakenEvent
  | BankLoanRepaidEvent
  | SavingsDepositedEvent
  | SavingsWithdrawnEvent
  | InsuranceBoughtEvent
  | ChildBornEvent
  | LaidOffEvent
  | RehiredEvent
  | BankruptcyDeclaredEvent
  | TurnEndedEvent
  | TurnStartedEvent
  | FastTrackEnteredEvent
  | CashFlowChangedEvent
  | AssetChangedEvent
  | LiabilityChangedEvent
  | GameOverEvent
  | GameResetEvent
  | StockSplitEvent
  | AgeRetiredEvent

// ---- Event Types ----

export interface GameStartedEvent {
  type: 'game_started'
  timestamp: number
  config: GameConfig
  playerCount: number
}

export interface DiceRolledEvent {
  type: 'dice_rolled'
  timestamp: number
  playerId: string
  values: number[]
  total: number
}

export interface PlayerMovedEvent {
  type: 'player_moved'
  timestamp: number
  playerId: string
  fromIndex: number
  toIndex: number
  phase: 'rat_race' | 'fast_track'
}

export interface CellResolvedEvent {
  type: 'cell_resolved'
  timestamp: number
  playerId: string
  cellIndex: number
  cellType: string
  phase: 'rat_race' | 'fast_track'
}

export interface PaydayReceivedEvent {
  type: 'payday_received'
  timestamp: number
  playerId: string
  amount: number
  cashBefore: number
  cashAfter: number
}

export interface CharityAcceptedEvent {
  type: 'charity_accepted'
  timestamp: number
  playerId: string
  cost: number
}

export interface OpportunityBoughtEvent {
  type: 'opportunity_bought'
  timestamp: number
  playerId: string
  cardId: string
  cardTitle: string
  cost: number
  quantity: number
  cashFlow: number
}

export interface OpportunitySoldEvent {
  type: 'opportunity_sold'
  timestamp: number
  playerId: string
  assetId: string
  assetName: string
  quantity: number
  price: number
  totalRevenue: number
}

export interface OpportunityDeclinedEvent {
  type: 'opportunity_declined'
  timestamp: number
  playerId: string
  cardId: string
  cardTitle: string
}

export interface MarketEventAppliedEvent {
  type: 'market_event_applied'
  timestamp: number
  playerId: string
  cardId: string
  cardTitle: string
  targetSymbol?: string
  multiplier: number
}

export interface DoodadPaidEvent {
  type: 'doodad_paid'
  timestamp: number
  playerId: string
  cardId: string
  cardTitle: string
  cost: number
}

export interface StoryResolvedEvent {
  type: 'story_resolved'
  timestamp: number
  playerId: string
  cardId: string
  cardTitle: string
  effectType: string
  amount: number
}

export interface BankLoanTakenEvent {
  type: 'bank_loan_taken'
  timestamp: number
  playerId: string
  amount: number
  newTotalLoan: number
}

export interface BankLoanRepaidEvent {
  type: 'bank_loan_repaid'
  timestamp: number
  playerId: string
  amount: number
  remainingLoan: number
}

export interface SavingsDepositedEvent {
  type: 'savings_deposited'
  timestamp: number
  playerId: string
  amount: number
  newBalance: number
}

export interface SavingsWithdrawnEvent {
  type: 'savings_withdrawn'
  timestamp: number
  playerId: string
  amount: number
  newBalance: number
}

export interface InsuranceBoughtEvent {
  type: 'insurance_bought'
  timestamp: number
  playerId: string
  insuranceType: 'health' | 'unemployment'
}

export interface ChildBornEvent {
  type: 'child_born'
  timestamp: number
  playerId: string
  childrenCount: number
  addedExpense: number
}

export interface LaidOffEvent {
  type: 'laid_off'
  timestamp: number
  playerId: string
  turns: number
}

export interface RehiredEvent {
  type: 'rehired'
  timestamp: number
  playerId: string
}

export interface BankruptcyDeclaredEvent {
  type: 'bankruptcy_declared'
  timestamp: number
  playerId: string
}

export interface TurnEndedEvent {
  type: 'turn_ended'
  timestamp: number
  playerId: string
  turnNumber: number
}

export interface TurnStartedEvent {
  type: 'turn_started'
  timestamp: number
  playerId: string
  turnNumber: number
  playerIndex: number
}

export interface FastTrackEnteredEvent {
  type: 'fast_track_entered'
  timestamp: number
  playerId: string
  passiveIncome: number
  totalExpenses: number
}

export interface CashFlowChangedEvent {
  type: 'cash_flow_changed'
  timestamp: number
  playerId: string
  before: number
  after: number
  reason: string
}

export interface AssetChangedEvent {
  type: 'asset_changed'
  timestamp: number
  playerId: string
  action: 'added' | 'removed' | 'updated'
  assetId: string
  assetName: string
  assetType: string
}

export interface LiabilityChangedEvent {
  type: 'liability_changed'
  timestamp: number
  playerId: string
  action: 'added' | 'removed' | 'updated'
  liabilityId: string
  liabilityName: string
  amount: number
}

export interface GameOverEvent {
  type: 'game_over'
  timestamp: number
  reason: 'victory' | 'bankrupt' | 'retirement'
  winnerId?: string
}

export interface GameResetEvent {
  type: 'game_reset'
  timestamp: number
}

export interface StockSplitEvent {
  type: 'stock_split'
  timestamp: number
  playerId: string
  symbol: string
  ratio: number
  oldQuantity: number
  newQuantity: number
}

export interface AgeRetiredEvent {
  type: 'age_retired'
  timestamp: number
  playerId: string
  age: number
}

// ==================== Event Log ====================

/** 完整的事件日志，用于回放 */
export interface GameEventLog {
  gameId: string
  gameStartTime: number
  events: GameEvent[]
}

// ==================== Action Type Constants ====================

export const GAME_ACTION_TYPES = [
  'start_game',
  'roll_dice',
  'move_player',
  'resolve_cell',
  'handle_payday',
  'handle_charity',
  'buy_opportunity',
  'sell_opportunity',
  'decline_opportunity',
  'handle_market',
  'handle_doodad',
  'handle_story',
  'take_bank_loan',
  'repay_bank_loan',
  'deposit_savings',
  'withdraw_savings',
  'buy_insurance',
  'declare_bankruptcy',
  'end_turn',
  'reset_game',
  'fast_track_escape',
  'fast_track_opportunity',
  'fast_track_dream',
  'fast_track_stock_trading',
  'ai_think',
  'send_to_fast_track',
] as const

export type GameActionType = (typeof GAME_ACTION_TYPES)[number]