import type { RawGameState } from './state-reader'
import type { DecisionResult, StateDiff } from '../types'

/**
 * v2.2 — State Diff & Decision Result
 *
 * 计算玩家财务指标在决策前后的变化，作为未来 AI 决策分析的基础数据。
 */

const FINANCIAL_KEYS = ['cash', 'income', 'expenses', 'cashFlow', 'assets', 'liabilities', 'netWorth', 'savings'] as const

function playerFinancial(state: RawGameState, playerName: string): Record<string, number> {
  const p = state.players.find((pl) => pl.name === playerName)
  if (!p) {
    const empty: Record<string, number> = {}
    for (const k of FINANCIAL_KEYS) empty[k] = 0
    return empty
  }
  const out: Record<string, number> = {}
  for (const k of FINANCIAL_KEYS) out[k] = p[k]
  return out
}

export function computeDelta(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
  const delta: Record<string, number> = {}
  for (const k of FINANCIAL_KEYS) delta[k] = (after[k] ?? 0) - (before[k] ?? 0)
  return delta
}

export function buildDecisionResult(
  turn: number,
  player: string,
  action: string,
  target: string,
  before: RawGameState,
  after: RawGameState,
): DecisionResult {
  const b = playerFinancial(before, player)
  const a = playerFinancial(after, player)
  return {
    turn,
    player,
    action,
    target,
    before: b,
    after: a,
    delta: computeDelta(b, a),
    timestamp: new Date().toISOString(),
  }
}

export function buildStateDiff(prev: RawGameState, next: RawGameState): StateDiff {
  const p = next.players[next.currentPlayerIndex]
  const o = prev.players[prev.currentPlayerIndex] ?? next.players[next.currentPlayerIndex]
  return {
    turn: next.turn,
    timestamp: new Date().toISOString(),
    cash: p?.cash ?? 0,
    income: p?.income ?? 0,
    expenses: p?.expenses ?? 0,
    cashFlow: p?.cashFlow ?? 0,
    assets: p?.assets ?? 0,
    liabilities: p?.liabilities ?? 0,
    netWorth: p?.netWorth ?? 0,
  }
}