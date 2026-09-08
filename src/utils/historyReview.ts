import type {
  CardHistoryRecord,
  FinancialSnapshot,
  TransactionRecord,
} from '@/types/game'

export interface TurnReviewAction {
  label: string
  amount?: number
  kind: 'transaction' | 'card'
  action?: CardHistoryRecord['action']
}

export interface TurnReviewFinancialChange {
  cashDelta: number
  assetsDelta?: number
  liabilitiesDelta?: number
  netWorthDelta?: number
  cash: number
  netWorth?: number
  monthlyCashFlow?: number
}

export interface TurnReview {
  turn: number
  landings: string[]
  actions: TurnReviewAction[]
  financial: TurnReviewFinancialChange
}

const cardTypeLabels: Record<CardHistoryRecord['type'], string> = {
  opportunity: '机会',
  market: '市场',
  doodad: '消费',
  fast_track_opportunity: '快车道机会',
  story: '故事',
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function snapshotByTurn(snapshots: FinancialSnapshot[]): Map<number, FinancialSnapshot> {
  const result = new Map<number, FinancialSnapshot>()
  for (const snapshot of snapshots) {
    result.set(snapshot.turn, snapshot)
  }
  return result
}

/**
 * 将保存的卡牌、交易和财务快照整理成历史页可直接展示的逐回合回顾。
 * 记录可能来自旧版本，因此没有快照的回合仍会保留，并以交易金额估算现金变化。
 */
export function buildTurnReviews(
  transactions: TransactionRecord[],
  cardHistory: CardHistoryRecord[],
  snapshots: FinancialSnapshot[],
): TurnReview[] {
  const turns = new Set<number>()
  for (const transaction of transactions) turns.add(transaction.turnNumber)
  for (const card of cardHistory) turns.add(card.turnNumber)
  for (const snapshot of snapshots) turns.add(snapshot.turn)

  const snapshotsByTurn = snapshotByTurn(snapshots)
  const sortedSnapshots = [...snapshots].sort((a, b) => a.turn - b.turn)
  const previousSnapshot = new Map<number, FinancialSnapshot | undefined>()
  for (let index = 0; index < sortedSnapshots.length; index += 1) {
    previousSnapshot.set(
      sortedSnapshots[index]!.turn,
      sortedSnapshots[index - 1],
    )
  }

  return [...turns]
    .sort((a, b) => a - b)
    .map((turn): TurnReview => {
      const turnTransactions = transactions.filter((item) => item.turnNumber === turn)
      const turnCards = cardHistory.filter((item) => item.turnNumber === turn)
      const current = snapshotsByTurn.get(turn)
      const previous = previousSnapshot.get(turn)
      const cashDelta = current && previous
        ? current.cash - previous.cash
        : turnTransactions.reduce((sum, item) => sum + item.amount, 0)

      const landings = unique(
        turnCards.map((card) => `${cardTypeLabels[card.type]}：${card.cardTitle}`),
      )
      if (landings.length === 0 && turnTransactions.length > 0) {
        landings.push('财务操作')
      }

      const actions: TurnReviewAction[] = [
        ...turnCards.map((card) => ({
          label: card.cardTitle,
          amount: card.amount,
          kind: 'card' as const,
          action: card.action,
        })),
        ...turnTransactions.map((transaction) => ({
          label: transaction.description,
          amount: transaction.amount,
          kind: 'transaction' as const,
        })),
      ]

      return {
        turn,
        landings,
        actions,
        financial: {
          cashDelta,
          assetsDelta: current && previous ? current.totalAssets - previous.totalAssets : undefined,
          liabilitiesDelta: current && previous ? current.totalLiabilities - previous.totalLiabilities : undefined,
          netWorthDelta: current && previous ? current.netWorth - previous.netWorth : undefined,
          cash: current?.cash ?? (previous?.cash ?? 0) + cashDelta,
          netWorth: current?.netWorth,
          monthlyCashFlow: current?.monthlyCashFlow,
        },
      }
    })
}
