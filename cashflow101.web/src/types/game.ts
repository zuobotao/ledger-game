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
  quantity?: number
  symbol?: string
}

export interface Liability {
  id: string
  name: string
  amount: number
  monthlyPayment: number
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
  assets: Asset[]
  liabilities: Liability[]
  ratRacePosition: number
  fastTrackPosition: number
  isUnemployed: boolean
  hasInsurance: boolean
  childrenCount: number
}

export interface GameConfig {
  playerCount: number
  insurance: boolean
  bigFamily: boolean
  mortgage: boolean
  fastStart: boolean
}

export type GamePhase = 'setup' | 'rat_race' | 'fast_track' | 'finished'

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  phase: GamePhase
  config: GameConfig
  winnerId: string | null
}

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
