import type { PlaytestAction } from './playtest-action'
import type { RawGameState } from '../utils/state-reader'

/**
 * v2.2 — Market Resolver
 *
 * pendingAction === 'market' 时，判断玩家是否能卖出资产：
 * - 无符合条件资产 → 只能 market-dismiss（关闭事件）
 * - 有符合条件资产 → market-dismiss + 每个资产的 market-sell-<id>
 *
 * 完全依赖 gameStore 的 marketEventState（responderIndex）+ 各玩家 sellableAssetIds，
 * 不靠按钮文字猜测。
 */
export function resolveMarket(bridge: RawGameState): PlaytestAction[] {
  const actions: PlaytestAction[] = [
    {
      type: 'market-dismiss',
      label: '结束',
      target: 'market-event',
      enabled: true,
      testid: 'market-dismiss',
      roleName: /结束|下一位玩家/,
    },
  ]

  const responderIndex = bridge.marketEventState?.responderIndex ?? null
  const responder = responderIndex !== null ? bridge.players[responderIndex] : null

  if (responder?.sellableAssetIds && responder.sellableAssetIds.length > 0) {
    for (const id of responder.sellableAssetIds) {
      actions.push({
        type: 'market-sell',
        label: '卖出',
        target: id,
        enabled: true,
        testid: `market-sell-${id}`,
      })
    }
  }

  return actions
}