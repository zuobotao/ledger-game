/**
 * Playtest type definitions
 */

export interface PlayerState {
  name: string
  cash: number
  income: number
  expenses: number
  cashFlow: number
  assets: number
  liabilities: number
  netWorth: number
  savings: number
}

export interface GameStateSnapshot {
  turn: number
  phase: string
  currentPlayer: string
  turnStatus: string
  players: PlayerState[]
  pendingAction: string | null
  timestamp: string
}

export interface ActionLog {
  turn: number
  player: string
  action: string
  target: string
  timestamp: string
  result: 'success' | 'failed' | 'skipped'
  detail?: string
}

/** 一次决策操作前后财务变化（v2.2 决策分析基础） */
export interface DecisionResult {
  turn: number
  player: string
  action: string
  target: string
  before: Record<string, number>
  after: Record<string, number>
  delta: Record<string, number>
  timestamp: string
}

/** 两个 GameStateSnapshot 之间的财务变化 */
export interface StateDiff {
  turn: number
  timestamp: string
  cash: number
  income: number
  expenses: number
  cashFlow: number
  assets: number
  liabilities: number
  netWorth: number
}

export interface UXIssue {
  turn: number
  type:
    | 'no-actionable-element'
    | 'no-state-change'
    | 'button-unclickable'
    | 'empty-button-text'
    | 'js-exception'
    | 'console-error'
    | 'state-stopped'
    | 'stuck-turn'
    | 'cannot-end-game'
    | 'element-not-found'
    | 'timeout'
  message: string
  timestamp: string
  screenshot?: string
}

export interface GameResult {
  gameId: string
  botType: 'random' | 'conservative' | 'aggressive'
  status: 'completed' | 'victory' | 'game-over' | 'failed' | 'timeout'
  totalTurns: number
  totalTimeMs: number
  totalActions: number
  startTime: string
  endTime: string
  finalState?: GameStateSnapshot
  actions: ActionLog[]
  issues: UXIssue[]
  events: string[]
  videoPath?: string
  screenshotDir?: string
  errorMessage?: string
}

export interface PlaytestReport {
  runId: string
  timestamp: string
  totalGames: number
  completedGames: number
  failedGames: number
  averageTurns: number
  averageTimeMs: number
  games: GameResult[]
  // Gameplay stats
  totalRolls: number
  totalBuys: number
  totalSells: number
  totalLoans: number
  totalRepays: number
  averageActionsPerTurn: number
  // Errors
  uiErrors: number
  consoleErrors: number
  unhandledExceptions: number
  illegalStates: number
  timeouts: number
  elementNotFoundErrors: number
  // Decisions
  mostCommonDecisions: { action: string; count: number }[]
  leastUsedFeatures: { action: string; count: number }[]
  longestWaitNodes: { turn: number; waitMs: number; description: string }[]
  // UX issues
  allIssues: UXIssue[]
}

export interface BotConfig {
  type: 'random' | 'conservative' | 'aggressive'
  maxTurns: number
  thinkDelayMs: number
  gameTimeoutMs: number
  /** 确定性试玩种子：相同 seed 复现相同 Bot 决策序列 */
  seed?: number
}
