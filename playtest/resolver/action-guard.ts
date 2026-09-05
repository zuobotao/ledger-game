import type { PlaytestAction } from './playtest-action'

/**
 * v2.2 — ActionGuard
 *
 * 防止 Bot 自己产生死循环/无限重复点击。规则：
 *  - 同一 Action 连续失败 ≥ 2 → 立即 stop（action-failure）
 *  - 同一 UI State 连续出现 ≥ 3 → stop（stuck-ui）
 *  - Action 后 State 不变化 → stop（state-transition-failure）
 *  - 单回合 Action 数 > 上限 → stop（stuck-turn）
 *  - 游戏总回合 > 上限 → stop（max-turns）
 */

export type GuardOutcome =
  | 'action-failure'
  | 'stuck-ui'
  | 'state-transition-failure'
  | 'stuck-turn'
  | 'max-turns'
  | 'timeout'

export class GuardError extends Error {
  outcome: GuardOutcome
  turn: number
  constructor(outcome: GuardOutcome, turn: number, message: string) {
    super(message)
    this.outcome = outcome
    this.turn = turn
  }
}

const MAX_ACTIONS_PER_TURN = 20
const MAX_SAME_STATE_CONSECUTIVE = 3
const MAX_ACTION_FAILURES = 2

export class ActionGuard {
  private actionsThisTurn = 0
  private consecutiveSameState = 0
  private lastStateKey = ''
  private actionFailures: Map<string, number> = new Map()

  constructor(private maxTurns: number, private gameTimeoutMs: number, private startTime: number) {}

  beginTurn() {
    this.actionsThisTurn = 0
  }

  recordAction() {
    this.actionsThisTurn++
    if (this.actionsThisTurn > MAX_ACTIONS_PER_TURN) {
      throw new GuardError('stuck-turn', -1, `单回合动作超过上限 ${MAX_ACTIONS_PER_TURN}`)
    }
  }

  observeState(key: string, turn: number) {
    if (key === this.lastStateKey) {
      this.consecutiveSameState++
      if (this.consecutiveSameState >= MAX_SAME_STATE_CONSECUTIVE) {
        throw new GuardError('stuck-ui', turn, `UI 状态连续 ${this.consecutiveSameState} 次无变化`)
      }
    } else {
      this.consecutiveSameState = 0
      this.lastStateKey = key
    }
  }

  actionFailed(action: PlaytestAction, turn: number) {
    const count = (this.actionFailures.get(action.type) ?? 0) + 1
    this.actionFailures.set(action.type, count)
    if (count >= MAX_ACTION_FAILURES) {
      throw new GuardError('action-failure', turn, `动作 ${action.type} 连续失败 ${count} 次`)
    }
  }

  checkTurns(turn: number) {
    if (turn > this.maxTurns) {
      throw new GuardError('max-turns', turn, `超过最大回合 ${this.maxTurns}`)
    }
  }

  checkTimeout() {
    if (Date.now() - this.startTime > this.gameTimeoutMs) {
      throw new GuardError('timeout', -1, `超过游戏超时 ${this.gameTimeoutMs}ms`)
    }
  }
}