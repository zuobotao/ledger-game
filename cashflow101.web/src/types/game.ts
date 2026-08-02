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
  childrenCount: number
  doubleDiceNextTurn: boolean
  dream?: Dream
}

export interface GameConfig {
  playerCount: number
  insurance: boolean
  bigFamily: boolean
  mortgage: boolean
  fastStart: boolean
}

export type GamePhase = 'setup' | 'rat_race' | 'fast_track' | 'finished'

export type RatRaceCellType =
  | 'opportunity'
  | 'doodad'
  | 'payday'
  | 'market'
  | 'child'
  | 'charity'
  | 'layoff'

export interface RatRaceCell {
  index: number
  type: RatRaceCellType
  name: string
  color: string
}

export type FastTrackCellType = 'cashflow' | 'opportunity' | 'investment' | 'doodad' | 'dream'

export interface FastTrackCell {
  index: number
  type: FastTrackCellType
  name: string
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
  | null

export interface PendingAction {
  type: PendingActionType
  card: OpportunityCard | MarketEventCard | DoodadCard | null
  message: string
  meta?: Record<string, unknown>
}

export interface CardDeck {
  opportunity: OpportunityCard[]
  market: MarketEventCard[]
  doodad: DoodadCard[]
  fastTrackOpportunity: OpportunityCard[]
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  phase: GamePhase
  config: GameConfig
  winnerId: string | null
  turnStatus: TurnStatus
  lastRoll: number
  turnNumber?: number
  pendingAction: PendingAction
  marketEvent?: MarketEventCard | null
  marketEventState?: MarketEventState | null
  decks?: CardDeck
}

export interface MarketEventState {
  card: MarketEventCard
  responderIndex: number  // 当前轮到回应的玩家索引
  respondedIds: string[]  // 已回应玩家ID
  phase: 'current_player' | 'other_players' | 'done'
}

export type TurnStatus = 'idle' | 'rolling' | 'resolving' | 'finished'

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

export const FAST_TRACK_BOARD_SIZE = 12

export const MAX_CHILDREN = {
  normal: 3,
  bigFamily: 6,
} as const
