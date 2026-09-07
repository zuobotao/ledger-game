import type { Page } from '@playwright/test'
import type { PlaytestAction } from './playtest-action'
import type { RawGameState } from '../utils/state-reader'
import { scanDomActions } from './ui-state-reader'
import { marketDismissAction, resolveMarket } from './market-resolver'
import { resolveOpportunity } from './opportunity-resolver'
import { resolveLoan, resolveCharity, resolveKnownDismiss } from './loan-resolver'
import { rollDiceAction, endTurnAction, turnSummaryContinueAction, decisionFeedbackDismissAction } from './turn-resolver'

/**
 * v2.2 — Action Resolver（编排器）
 *
 * 流程：
 * 1. 根据 gameStore 状态算出「理论合法动作」候选
 * 2. 用 DOM 扫描（data-testid 优先）过滤出真实存在的可点动作
 * 3. 返回最终合法动作列表（可能为空）
 *
 * 这个列表是 Bot 决策的唯一输入 —— Bot 不允许随机点击列表外的按钮。
 */
export async function resolveActions(page: Page, bridge: RawGameState): Promise<PlaytestAction[]> {
  const candidates = computeCandidates(bridge)
  // 市场面板由共享 UI 的 gameState 投影渲染，状态桥在一次响应中可能短暂缺少
  // marketEventState。若按钮已经真实出现在 DOM，仍应允许机器人完成该动作。
  const marketFallback = marketDismissAction()

  // 收集所有 data-testid 并一次性扫描
  const testids = [...new Set(
    [...candidates, marketFallback].filter((a) => a.testid).map((a) => a.testid!),
  )]
  const statuses = await scanDomActions(page, testids)
  const statusByTestid = new Map(statuses.map((s) => [s.testid, s]))

  const resolved = candidates
    .map((a) => {
      if (!a.testid) return a
      const status = statusByTestid.get(a.testid)
      if (!status || !status.present) return { ...a, enabled: false }
      return { ...a, enabled: status.enabled }
    })
    .filter((a) => a.enabled)

  const marketStatus = statusByTestid.get(marketFallback.testid!)
  if (!resolved.some((a) => a.testid === marketFallback.testid) && marketStatus?.enabled) {
    resolved.push(marketFallback)
  }

  return resolved
}

export function computeCandidates(bridge: RawGameState): PlaytestAction[] {
  // 决策反馈弹层优先：卖出/买入后弹出的「知道了」，不关闭会阻挡一切后续交互
  if (bridge.hasDecisionFeedback) {
    return [decisionFeedbackDismissAction()]
  }

  // 回合总结弹层优先：必须先关闭它，否则下层 end-turn 按钮被遮挡无法点击
  if (bridge.showTurnSummary) {
    return [turnSummaryContinueAction()]
  }

  const pending = bridge.pendingAction
  const turnStatus = bridge.turnStatus

  // 市场弹层的视觉状态由 marketEventState 驱动。价格变动后，pendingAction
  // 可能先被清空再写回；只看 pendingAction 会让真实可见的“结束”按钮被漏掉。
  const marketActive = Boolean(
    bridge.marketEventState?.card && bridge.marketEventState.phase !== 'done',
  )

  if (pending === 'market' || marketActive) {
    return resolveMarket(bridge)
  }

  if (pending) {
    switch (pending) {
      case 'opportunity':
      case 'fast_track_opportunity':
        return resolveOpportunity()
      case 'charity':
        return resolveCharity()
      case 'need_loan':
        return resolveLoan()
      case 'story':
        return resolveKnownDismiss('story', '知道了')
      case 'doodad':
        return resolveKnownDismiss('doodad', '知道了')
      case 'layoff':
        return resolveKnownDismiss('layoff', '知道了')
      case 'bankrupt':
        return resolveKnownDismiss('bankrupt', '继续游戏')
      case 'fast_track_dream':
        return [
          { type: 'fast-track-dream-accept', label: '接受梦想', target: 'dream', enabled: true, testid: 'known-dismiss', roleName: /确认|继续/ },
          { type: 'fast-track-dream-decline', label: '拒绝', target: 'dream', enabled: true, testid: 'known-dismiss', roleName: /放弃/ },
        ]
      default:
        // 未知/其它 pending（如 stock_sell_opportunity）：交给通用 known-dismiss 关闭
        return resolveKnownDismiss('generic', '知道了')
    }
  }

  if (turnStatus === 'idle' || turnStatus === 'waiting_roll') {
    return [rollDiceAction()]
  }

  if (turnStatus === 'resolving' || turnStatus === 'waiting_end_turn') {
    return [endTurnAction()]
  }

  return []
}
