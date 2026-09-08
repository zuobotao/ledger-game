import type { CardHistoryRecord, Player, TransactionRecord } from '@/types/game'

export type FinancialProfileKey =
  | 'cashflowPlanning'
  | 'riskPreference'
  | 'liquidityDiscipline'
  | 'opportunitySelection'

export interface FinancialProfileEvidence {
  label: string
  value: string
}

export interface FinancialProfileDimension {
  key: FinancialProfileKey
  title: string
  level: string
  score: number
  summary: string
  evidence: FinancialProfileEvidence[]
}

export interface FinancialProfile {
  dimensions: FinancialProfileDimension[]
  disclaimer: string
}

interface ProfileInput {
  player: Player
  transactions: TransactionRecord[]
  cardHistory: CardHistoryRecord[]
}

const money = (value: number) => `$${Math.round(Math.abs(value)).toLocaleString()}`
const countLabel = (count: number, singular: string, plural = `${singular}次`) =>
  `${count}${count === 1 ? singular : plural}`

function level(score: number, labels: [string, string, string]): string {
  return score < 36 ? labels[0] : score < 66 ? labels[1] : labels[2]
}

function evidence(label: string, value: string): FinancialProfileEvidence {
  return { label, value }
}

export function buildFinancialProfile({ player, transactions, cardHistory }: ProfileInput): FinancialProfile {
  const txs = transactions.filter((item) => item.playerId === player.id)
  const cards = cardHistory.filter((item) => item.playerId === player.id)
  const buys = txs.filter((item) => ['stock_buy', 'real_estate_buy', 'business_buy'].includes(item.type))
  const sells = txs.filter((item) => ['stock_sell', 'real_estate_sell', 'business_sell'].includes(item.type))
  const deposits = txs.filter((item) => item.type === 'savings_deposit')
  const withdrawals = txs.filter((item) => item.type === 'savings_withdraw')
  const loans = txs.filter((item) => item.type === 'bank_loan')
  const repayments = txs.filter((item) => item.type === 'loan_repay')
  const charity = txs.filter((item) => item.type === 'charity')
  const opportunities = cards.filter((item) => item.type === 'opportunity' || item.type === 'fast_track_opportunity')
  const accepted = opportunities.filter((item) => item.action === 'accepted')
  const declined = opportunities.filter((item) => item.action === 'declined' || item.action === 'ignored')
  const bigOpportunities = accepted.filter((item) => item.cardId.toLowerCase().includes('big'))
  const totalExpenses = Math.max(player.totalExpenses, 0)
  const passiveCoverage = totalExpenses > 0 ? player.passiveIncome / totalExpenses : player.passiveIncome > 0 ? 1 : 0
  const savingsNet = deposits.reduce((sum, item) => sum + Math.abs(item.amount), 0) - withdrawals.reduce((sum, item) => sum + Math.abs(item.amount), 0)
  const totalInvested = buys.reduce((sum, item) => sum + Math.abs(item.amount), 0)

  const cashflowScore = Math.round(Math.min(100, 35 + passiveCoverage * 45 + Math.min(20, deposits.length * 5)))
  const riskScore = Math.max(0, Math.min(100, Math.round(45 + bigOpportunities.length * 12 + buys.length * 4 + sells.length * 2 - loans.length * 10)))
  const liquidityScore = Math.max(0, Math.min(100, Math.round(50 + (savingsNet > 0 ? 20 : savingsNet < 0 ? -15 : 0) + (player.cash >= Math.max(player.totalExpenses, 1) ? 20 : -10) - Math.max(0, loans.length - repayments.length) * 8)))
  const selectionScore = Math.max(0, Math.min(100, Math.round(50 + accepted.length * 6 + bigOpportunities.length * 8 - declined.length * 3 + (sells.length > 0 ? 5 : 0))))

  return {
    dimensions: [
      {
        key: 'cashflowPlanning',
        title: '现金流规划',
        level: level(cashflowScore, ['起步型', '平衡型', '规划型']),
        score: cashflowScore,
        summary: passiveCoverage >= 1 ? '被动收入已经覆盖支出，现金流结构较有余量。' : '收入结构仍以主动收入为主，可继续建立稳定的被动现金流。',
        evidence: [
          evidence('被动收入覆盖支出', `${Math.round(passiveCoverage * 100)}%`),
          evidence('存款操作', countLabel(deposits.length, '次', '次')),
          evidence('最终月被动收入', money(player.passiveIncome)),
        ],
      },
      {
        key: 'riskPreference',
        title: '风险偏好',
        level: level(riskScore, ['稳健', '平衡', '进取']),
        score: riskScore,
        summary: riskScore >= 66 ? '愿意承担波动换取更高成长，投资动作较积极。' : riskScore < 36 ? '更重视确定性，较少使用杠杆或高波动机会。' : '在增长机会与负债压力之间保持了相对平衡。',
        evidence: [
          evidence('资产买入', countLabel(buys.length, '笔', '笔')),
          evidence('大机会接受', countLabel(bigOpportunities.length, '次', '次')),
          evidence('贷款 / 偿还', `${loans.length} / ${repayments.length}`),
        ],
      },
      {
        key: 'liquidityDiscipline',
        title: '流动性纪律',
        level: level(liquidityScore, ['需留缓冲', '基本稳健', '缓冲充足']),
        score: liquidityScore,
        summary: liquidityScore >= 66 ? '保留了较好的现金缓冲，面对突发支出更从容。' : '可以优先留出应急现金，再安排长期投资或大额支出。',
        evidence: [
          evidence('最终现金', money(player.cash)),
          evidence('储蓄净流入', `${savingsNet >= 0 ? '+' : '-'}${money(savingsNet)}`),
          evidence('未偿负债', money(player.liabilities.reduce((sum, item) => sum + item.amount, 0))),
        ],
      },
      {
        key: 'opportunitySelection',
        title: '机会选择',
        level: level(selectionScore, ['谨慎观察', '择机参与', '主动出击']),
        score: selectionScore,
        summary: accepted.length > 0 ? '会从机会牌中筛选行动，并用交易把选择落地。' : '本局较少把机会牌转化为实际行动，可继续观察适合自己的机会。',
          evidence: [
          evidence('机会接受 / 放弃', `${accepted.length} / ${declined.length}`),
          evidence('投资金额', money(totalInvested)),
          evidence('卖出操作', countLabel(sells.length, '笔', '笔')),
          evidence('慈善行动', countLabel(charity.length, '次', '次')),
        ],
      },
    ],
    disclaimer: '这是基于本局可见财务行为的游戏化回顾，用于帮助复盘，不代表心理诊断或人格结论。',
  }
}
