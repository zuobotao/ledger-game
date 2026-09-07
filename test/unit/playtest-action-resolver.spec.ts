import { describe, expect, it } from 'vitest'
import { computeCandidates, resolveActions } from '../../playtest/resolver/action-resolver'
import type { RawGameState } from '../../playtest/utils/state-reader'

function bridge(overrides: Partial<RawGameState> = {}): RawGameState {
  return {
    turn: 41,
    phase: 'rat_race',
    currentPlayer: '玩家 1',
    currentPlayerIndex: 0,
    turnStatus: 'resolving',
    pendingAction: null,
    players: [{
      name: '玩家 1',
      cash: 1000,
      income: 1000,
      expenses: 500,
      cashFlow: 500,
      assets: 100,
      liabilities: 0,
      netWorth: 1100,
      savings: 0,
      sellableAssetIds: [],
      sellableAssetQuantities: {},
    }],
    marketEventState: {
      phase: 'current_player',
      responderIndex: 0,
      respondedIds: [],
      card: { title: 'GRW 股票大涨', targetType: 'stock', targetSymbol: 'GRW' },
    },
    marketResponderIndex: 0,
    isMarketMyTurn: true,
    showTurnSummary: false,
    hasDecisionFeedback: false,
    ...overrides,
  }
}

describe('playtest action resolver', () => {
  it('uses the visible market state when pendingAction is temporarily empty', () => {
    expect(computeCandidates(bridge()).map((action) => action.type)).toContain('market-dismiss')
  })

  it('does not keep resolving a completed market event', () => {
    const actions = computeCandidates(bridge({
      marketEventState: {
        phase: 'done',
        responderIndex: 0,
        respondedIds: ['player-1'],
        card: { title: 'GRW 股票大涨', targetType: 'stock', targetSymbol: 'GRW' },
      },
    }))
    expect(actions.map((action) => action.type)).toEqual(['end-turn'])
  })

  it('keeps a visible market dismiss action during a transient state bridge gap', async () => {
    const page = {
      getByTestId(testid: string) {
        const locator = {
          count: async () => testid === 'market-dismiss' ? 1 : 0,
          first() { return locator },
          isVisible: async () => true,
          isEnabled: async () => true,
        }
        return locator
      },
    } as any

    const actions = await resolveActions(page, bridge({ marketEventState: null }))
    expect(actions.map((action) => action.type)).toContain('market-dismiss')
  })
})
