import type { PlaytestAction } from './playtest-action'

/**
 * v2.2 — Opportunity Resolver
 *
 * pendingAction === 'opportunity' 时的合法动作候选。
 * 机会卡有多种子形态，各自渲染不同的按钮：
 *  - 普通卡：opportunity-buy（买入/支付首付）/ opportunity-sell（卖出）/ opportunity-decline（放弃）
 *  - 拆分/合股卡：opportunity-confirm（确认，自动生效）
 *  - 股票交易卡：opportunity-stock-buy / opportunity-stock-sell / opportunity-decline
 *
 * Resolver 返回「全部可能的候选人」，由 DOM 扫描按真实渲染过滤出可点的动作。
 * 现金不足或无可卖持仓时，对应按钮会禁用/不渲染 → 自动只剩「放弃」可用，避免死锁。
 */
export function resolveOpportunity(): PlaytestAction[] {
  return [
    {
      type: 'opportunity-buy',
      label: '买入',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-buy',
      roleName: /买入|支付首付/,
    },
    {
      type: 'opportunity-sell',
      label: '卖出',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-sell',
      roleName: /^卖出$/,
    },
    {
      type: 'opportunity-confirm',
      label: '确认',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-confirm',
      roleName: /确认/,
    },
    {
      type: 'opportunity-stock-buy',
      label: '确认买入',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-stock-buy',
      roleName: /确认买入/,
    },
    {
      type: 'opportunity-stock-sell',
      label: '确认卖出',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-stock-sell',
      roleName: /确认卖出/,
    },
    {
      type: 'opportunity-decline',
      label: '放弃',
      target: 'opportunity',
      enabled: true,
      testid: 'opportunity-decline',
      roleName: /放弃/,
    },
  ]
}