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

// ==================== FinancialDelta ====================

/**
 * 统一的财务变化增量结构。
 *
 * 所有改变玩家财务状态的动作都应该产出 FinancialDelta，
 * 描述本次操作对各项财务指标的影响。
 *
 * 正值表示增加，负值表示减少。
 * UI 不需要自己比较前后状态，直接使用 Delta 展示变化。
 */
export interface FinancialDelta {
  /** 现金变化 */
  cash: number
  /** 工资收入变化（一般为 0，失业/复职会变） */
  salary: number
  /** 被动收入变化 */
  passiveIncome: number
  /** 总收入变化 */
  totalIncome: number
  /** 总支出变化 */
  totalExpenses: number
  /** 月现金流变化（= 总收入 - 总支出） */
  cashFlow: number
  /** 总资产变化 */
  assets: number
  /** 总负债变化 */
  liabilities: number
  /** 净资产变化（= 资产 - 负债 + 现金变化） */
  netWorth: number
  /** 储蓄变化 */
  savings: number
  /** 孩子数量变化（影响支出） */
  childrenCount: number
}

/** 创建一个全零的 FinancialDelta */
export function createEmptyDelta(): FinancialDelta {
  return {
    cash: 0,
    salary: 0,
    passiveIncome: 0,
    totalIncome: 0,
    totalExpenses: 0,
    cashFlow: 0,
    assets: 0,
    liabilities: 0,
    netWorth: 0,
    savings: 0,
    childrenCount: 0,
  }
}

/** 合并多个 FinancialDelta（逐项相加） */
export function mergeDeltas(...deltas: FinancialDelta[]): FinancialDelta {
  const result = createEmptyDelta()
  for (const d of deltas) {
    for (const k of Object.keys(result) as (keyof FinancialDelta)[]) {
      result[k] += d[k]
    }
  }
  return result
}

/** 判断 Delta 是否全为 0（无变化） */
export function isDeltaEmpty(delta: FinancialDelta): boolean {
  return Object.values(delta).every((v) => v === 0)
}

// ==================== GameResult ====================

export interface GameResult {
  /** 操作是否成功 */
  success: boolean
  /** 动作类型（用于 UI 定位展示模板） */
  action?: string
  /** 操作后的游戏状态（成功时） */
  state?: GameState
  /** 操作产生的事件列表 */
  events: GameEvent[]
  /** 受影响玩家的财务变化（key 为 playerId） */
  financialDeltas: Record<string, FinancialDelta>
  /** 警告信息（非错误，但玩家应该注意） */
  warnings: GameWarning[]
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

/** 游戏警告：不是错误，但玩家应该意识到的风险或提示 */
export interface GameWarning {
  /** 警告类型 */
  type: 'risk' | 'info' | 'education'
  /** 警告级别 */
  level: 'low' | 'medium' | 'high'
  /** 警告标题 */
  title: string
  /** 警告详情 */
  description: string
  /** 关联的财务指标 */
  relatedMetric?: keyof FinancialDelta
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
  /** 贷款 ID，用于回放重建 */
  loanId: string
  /** 月还款额，用于回放重建 */
  monthlyPayment: number
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

// ==================== Game Replay ====================

/**
 * 完整的游戏回放数据。
 *
 * 包含重建游戏所需的所有信息：
 * - version：回放格式版本号
 * - seed：随机种子
 * - initialState：初始游戏状态
 * - actions：所有执行的 GameAction 序列
 * - events：所有产生的 GameEvent 序列
 * - finalStateHash：最终状态哈希（用于校验）
 *
 * 原则：
 * - 可序列化（JSON），用于持久化和传输
 * - 自我校验：通过 finalStateHash 验证完整性
 * - 相同 initialState + seed + actions → 相同 events + finalStateHash
 */
export interface GameReplay {
  /** 回放格式版本号 */
  version: string
  /** 随机种子 */
  seed: number
  /** 初始游戏状态 */
  initialState: GameState
  /** 所有执行的 GameAction 序列 */
  actions: GameAction[]
  /** 所有产生的 GameEvent 序列 */
  events: GameEvent[]
  /** 最终状态哈希（用于校验） */
  finalStateHash?: string
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