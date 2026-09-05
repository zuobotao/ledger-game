import type { PlaytestAction } from './playtest-action'

/** v2.2 — Turn Resolver：掷骰 / 结束回合 */
export function rollDiceAction(): PlaytestAction {
  return { type: 'roll-dice', label: '掷骰', target: 'dice', enabled: true, testid: 'roll-dice', roleName: /掷骰/ }
}

export function endTurnAction(): PlaytestAction {
  return { type: 'end-turn', label: '结束回合', target: 'end-turn', enabled: true, testid: 'end-turn', roleName: /结束回合/ }
}

/** v2.2 — 回合总结弹层「下一回合」，关闭后进入下一回合 */
export function turnSummaryContinueAction(): PlaytestAction {
  return { type: 'turn-summary-continue', label: '下一回合', target: 'turn-summary', enabled: true, testid: 'turn-summary-continue' }
}

/** v2.2 — 决策反馈弹层「知道了」，关闭决策影响提示 */
export function decisionFeedbackDismissAction(): PlaytestAction {
  return { type: 'decision-feedback-dismiss', label: '知道了', target: 'decision-feedback', enabled: true, testid: 'decision-feedback-dismiss' }
}