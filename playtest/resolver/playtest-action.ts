/**
 * v2.2 — Playtest Action Model
 *
 * 分离「机器人决定做什么」与「UI 现在能做什么」。
 * Bot 只负责决定，Resolver 负责判断合法性，Browser Driver 负责点击。
 */

export interface PlaytestAction {
  /** 动作类型（如 market-dismiss / opportunity-buy / roll-dice） */
  type: string
  /** 人类可读标签（对应按钮文字，仅用于报告） */
  label: string
  /** 动作目标（如资产 id / 'dice'） */
  target: string
  /** 当前是否可点击 */
  enabled: boolean
  /** 首选 data-testid；缺失时 fallback 到 roleName+label */
  testid?: string
  /** 文本兜底：getByRole('button', { name }) 的正则/字符串 */
  roleName?: string
}

export interface ResolveContext {
  turn: number
  phase: string
  currentPlayer: string
  currentPlayerIndex: number
  turnStatus: string
  pendingAction: string | null
}