import type { PlaytestAction } from './playtest-action'

/** v2.2 — Loan Resolver：需要贷款才能继续时的动作 */
export function resolveLoan(): PlaytestAction[] {
  return [
    {
      type: 'loan-take',
      label: '申请贷款',
      target: 'loan',
      enabled: true,
      testid: 'loan-take',
      roleName: /申请贷款/,
    },
    {
      type: 'loan-decline',
      label: '取消',
      target: 'loan',
      enabled: true,
      testid: 'loan-decline',
      roleName: /取消/,
    },
  ]
}

/** v2.2 — Charity Resolver：慈善卡捐赠与否 */
export function resolveCharity(): PlaytestAction[] {
  return [
    {
      type: 'charity-accept',
      label: '捐赠',
      target: 'charity',
      enabled: true,
      testid: 'charity-accept',
      roleName: /捐赠/,
    },
    {
      type: 'charity-decline',
      label: '放弃',
      target: 'charity',
      enabled: true,
      testid: 'charity-decline',
      roleName: /放弃/,
    },
  ]
}

/** v2.2 — Story/Doodad/Layoff/Bankrupt：统一「知道了」类关闭按钮 */
export function resolveKnownDismiss(actionType: string, label: string): PlaytestAction[] {
  return [
    {
      type: `${actionType}-dismiss`,
      label,
      target: actionType,
      enabled: true,
      testid: 'known-dismiss',
      roleName: /知道了|继续游戏/,
    },
  ]
}