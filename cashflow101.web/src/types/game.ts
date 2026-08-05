export interface Expenses {
  taxes: number
  mortgage: number
  schoolLoan: number
  carLoan: number
  creditCard: number
  other: number
  child: number
}

export interface Career {
  id: string
  name: string
  salary: number
  expenses: Expenses
  startingCash: number
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  tags?: string[]
  description?: string
  icon?: string
}

export interface Asset {
  id: string
  name: string
  type: 'stock' | 'real_estate' | 'business' | 'other'
  cost: number
  cashFlow: number
  quantity: number
  symbol?: string
  marketPrice?: number
  /** 贷款金额（房地产/企业类） */
  loanAmount?: number
  /** 每月还款额（房地产/企业类） */
  monthlyLoanPayment?: number
}

export interface Liability {
  id: string
  name: string
  amount: number
  monthlyPayment: number
  category?: 'mortgage' | 'school_loan' | 'car_loan' | 'credit_card' | 'bank_loan'
}

export interface Player {
  id: string
  name: string
  color: string
  career: Career
  salary: number
  passiveIncome: number
  totalIncome: number
  expenses: Expenses
  totalExpenses: number
  cashFlow: number
  cash: number
  savings: number
  assets: Asset[]
  liabilities: Liability[]
  ratRacePosition: number
  fastTrackPosition: number
  isUnemployed: boolean
  unemploymentTurns: number
  hasInsurance: boolean
  hasUnemploymentInsurance: boolean
  childrenCount: number
  doubleDiceNextTurn: boolean
  charityProtection: boolean
  ageMonths: number
  dream?: Dream
  isAI: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
  isBankrupt: boolean
  financialStatement: FinancialStatementState
  financialSnapshots: FinancialSnapshot[]
}

export interface FinancialSnapshot {
  turn: number
  cash: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  totalIncome: number
  totalExpenses: number
  monthlyCashFlow: number
  stockValue: number
  realEstateValue: number
  businessValue: number
}

export interface GameConfig {
  playerCount: number
  insurance: boolean
  bigFamily: boolean
  mortgage: boolean
  fastStart: boolean
  ageLimit: boolean
}

export type GamePhase = 'setup' | 'rat_race' | 'fast_track' | 'finished'

export type RatRaceCellType =
  | 'opportunity'
  | 'small_opportunity'
  | 'big_opportunity'
  | 'doodad'
  | 'payday'
  | 'market'
  | 'child'
  | 'charity'
  | 'layoff'
  | 'story'

export interface RatRaceCell {
  index: number
  type: RatRaceCellType
  name: string
  color: string
}

export type FastTrackCellType =
  | 'cashflow'
  | 'opportunity'
  | 'investment'
  | 'doodad'
  | 'dream'
  | 'market'
  | 'charity'
  | 'deal'
  | 'stock'

export interface FastTrackCell {
  index: number
  type: FastTrackCellType
  name: string
  color: string
}

export type OpportunityCardType = 'stock' | 'real_estate' | 'business' | 'other'
export type OpportunityCardSize = 'small' | 'big'

export interface OpportunityCard {
  id: string
  size: OpportunityCardSize
  type: OpportunityCardType
  title: string
  description: string
  cost: number
  cashFlow: number
  symbol?: string
  maxQuantity?: number
  action?: 'buy' | 'sell'
  splitRatio?: number
  /** 首付金额（房地产/企业类） */
  downPayment?: number
  /** 资产总价值（房地产/企业类），即首付 + 贷款 */
  totalValue?: number
}

export interface MarketEventCard {
  id: string
  title: string
  description: string
  targetType: 'stock' | 'real_estate' | 'business' | 'all'
  targetSymbol?: string
  multiplier: number
  fixedPrice?: number
}

export interface DoodadCard {
  id: string
  title: string
  description: string
  cost: number
}

export interface Dream {
  id: string
  name: string
  description: string
  price: number
  icon: string
  category?: 'lifestyle' | 'charity' | 'investment' | 'career' | 'family' | 'freedom'
  story?: string
}

export type PendingActionType =
  | 'opportunity'
  | 'market'
  | 'doodad'
  | 'charity'
  | 'layoff'
  | 'need_loan'
  | 'fast_track_opportunity'
  | 'fast_track_dream'
  | 'fast_track_stock_trading'
  | 'story'
  | 'stock_sell_opportunity'
  | 'bankrupt'
  | null

/** 消息类型：用于区分 toast 的视觉样式 */
export type MessageType = 'info' | 'gain' | 'loss' | 'major'

export interface PendingAction {
  type: PendingActionType
  card: OpportunityCard | MarketEventCard | DoodadCard | StoryCard | null
  message: string
  messageType?: MessageType
  meta?: Record<string, unknown>
}

export interface CardDeck {
  opportunity: OpportunityCard[]
  smallOpportunity: OpportunityCard[]
  bigOpportunity: OpportunityCard[]
  market: MarketEventCard[]
  doodad: DoodadCard[]
  fastTrackOpportunity: OpportunityCard[]
  story: StoryCard[]
}

export type TransactionType =
  | 'salary'
  | 'passive_income'
  | 'expense'
  | 'stock_buy'
  | 'stock_sell'
  | 'real_estate_buy'
  | 'real_estate_sell'
  | 'business_buy'
  | 'business_sell'
  | 'bank_loan'
  | 'loan_repay'
  | 'savings_deposit'
  | 'savings_withdraw'
  | 'insurance_buy'
  | 'doodad'
  | 'charity'
  | 'charity_protect'
  | 'child'
  | 'layoff'
  | 'story_gain'
  | 'story_loss'
  | 'stock_split'
  | 'bankrupt'
  | 'age_retire'
  | 'unemployment_insurance_premium'
  | 'unemployment_insurance_benefit'
  | 'other'

export interface TransactionRecord {
  id: string
  turnNumber: number
  playerId: string
  type: TransactionType
  amount: number
  description: string
  assetSymbol?: string
  assetQuantity?: number
  unitPrice?: number
  costBasis?: number
  assetName?: string
  assetType?: 'stock' | 'real_estate' | 'business' | 'other'
  timestamp: number
}

export type CardHistoryType = 'opportunity' | 'market' | 'doodad' | 'fast_track_opportunity' | 'story'

export interface CardHistoryRecord {
  id: string
  turnNumber: number
  playerId: string
  type: CardHistoryType
  cardId: string
  cardTitle: string
  cardDescription: string
  action?: 'accepted' | 'declined' | 'sold' | 'ignored'
  amount?: number
  timestamp: number
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  phase: GamePhase
  config: GameConfig
  winnerId: string | null
  gameEndReason?: 'victory' | 'retirement' | 'bankrupt' | null
  turnStatus: TurnStatus
  lastRoll: number
  turnNumber?: number
  gameMonth?: number
  pendingAction: PendingAction
  marketEvent?: MarketEventCard | null
  marketEventState?: MarketEventState | null
  decks?: CardDeck
  transactions?: TransactionRecord[]
  cardHistory?: CardHistoryRecord[]
  gameStartTime?: number
  ratRaceTurns?: number
  fastTrackTurns?: number
}

export interface MarketEventState {
  card: MarketEventCard
  responderIndex: number  // 当前轮到回应的玩家索引
  respondedIds: string[]  // 已回应玩家ID
  phase: 'current_player' | 'other_players' | 'done'
}

export interface StockSellOpportunityState {
  card: OpportunityCard
  responderIndex: number  // 当前轮到回应的玩家索引
  respondedIds: string[]  // 已回应玩家ID
  phase: 'current_player' | 'other_players' | 'done'
  price: number
  symbol: string
}

export type TurnStatus = 'idle' | 'rolling' | 'resolving' | 'finished'

export interface FinancialStatementState {
  // 用户填写的值
  userTotalAssets: number | null
  userTotalLiabilities: number | null
  userNetWorth: number | null
  userPassiveIncome: number | null
  userTotalIncome: number | null
  userTotalExpenses: number | null
  userMonthlyCashFlow: number | null
  // 用户填写的其他资产/负债/支出
  userOtherAssets: number | null
  userOtherLiabilities: number | null
  userOtherExpenses: number | null
  // 校验结果
  verified: Record<string, boolean>
  // 已查看答案的项
  viewedAnswers: string[]
}

// 财务报表中所有数值字段的联合类型
export type FinancialStatementNumberField =
  | 'userTotalAssets'
  | 'userTotalLiabilities'
  | 'userNetWorth'
  | 'userPassiveIncome'
  | 'userTotalIncome'
  | 'userTotalExpenses'
  | 'userMonthlyCashFlow'
  | 'userOtherAssets'
  | 'userOtherLiabilities'
  | 'userOtherExpenses'

// 需要校验的关键字段
export type FinancialStatementKey =
  | 'userTotalAssets'
  | 'userTotalLiabilities'
  | 'userNetWorth'
  | 'userPassiveIncome'
  | 'userTotalIncome'
  | 'userTotalExpenses'
  | 'userMonthlyCashFlow'

export const PLAYER_COLORS = [
  { id: 'blue', name: '蓝色', value: '#007aff' },
  { id: 'green', name: '绿色', value: '#34c759' },
  { id: 'red', name: '红色', value: '#ff3b30' },
  { id: 'orange', name: '橙色', value: '#ff9500' },
  { id: 'purple', name: '紫色', value: '#af52de' },
  { id: 'pink', name: '粉色', value: '#ff2d55' },
  { id: 'black', name: '黑色', value: '#1c1c1e' },
] as const

export type PlayerColorId = (typeof PLAYER_COLORS)[number]['id']

export const BANK_CONFIG = {
  interestRate: 0.1,
  maxLoanMultiple: 10,
  minLoanAmount: 1000,
  loanStep: 1000,
  savingsRate: 0.02,
  minDeposit: 100,
  depositStep: 100,
} as const

export const RAT_RACE_BOARD_SIZE = 24

export const FAST_TRACK_BOARD_SIZE = 20

export const MAX_CHILDREN = {
  normal: 3,
  bigFamily: 6,
} as const

export const START_AGE = 25
export const RETIREMENT_AGE = 65
export const MAX_AGE_MONTHS = (RETIREMENT_AGE - START_AGE) * 12

export const UNEMPLOYMENT_INSURANCE_RATE = 0.03

// ==================== v3 新增类型 ====================

export interface PlayerConfig {
  name: string
  careerId: string | 'random'
  color: string
  isAI: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

// ---- 故事卡 ----

export type StoryCategory = 'jin' | 'hui' | 'nanyang' | 'lvmeng' | 'usa' | 'western'

export type StoryEffectType = 'cash' | 'income' | 'expense' | 'passive_income' | 'opportunity'

export interface StoryEffect {
  type: StoryEffectType
  amount?: number
  description: string
}

export interface StoryCard {
  id: string
  category: StoryCategory
  title: string
  story: string
  effect: StoryEffect
  historicalNote: string
}

// ---- 财商教育提示 ----

export type TipCategory =
  | 'asset'
  | 'cashflow'
  | 'passive_income'
  | 'risk'
  | 'leverage'
  | 'market_cycle'
  | 'life_choice'

export interface FinancialTip {
  id: string
  category: TipCategory
  title: string
  content: string
}

// ==================== 历史对局记录 ====================

export type GameResult = 'victory' | 'bankrupt' | 'retirement'

export interface GameHistoryPlayerSummary {
  id: string
  name: string
  color: string
  careerName: string
  isAI: boolean
  isWinner: boolean
  isBankrupt: boolean
  finalCash: number
  finalNetWorth: number
  passiveIncome: number
  totalExpenses: number
  assetCount: number
}

export interface GameHistoryRecord {
  id: string
  startTime: number
  endTime: number
  totalTurns: number
  ratRaceTurns: number
  fastTrackTurns: number
  result: GameResult
  config: GameConfig
  playerCount: number
  aiCount: number
  mainPlayerId: string
  players: GameHistoryPlayerSummary[]
  dreamName?: string
  grade?: 'S' | 'A' | 'B' | 'C' | 'D'
  note?: string
}

export interface GameHistoryDetail extends GameHistoryRecord {
  mainPlayerTransactions: TransactionRecord[]
  mainPlayerCardHistory: CardHistoryRecord[]
  mainPlayerSnapshots: FinancialSnapshot[]
}
