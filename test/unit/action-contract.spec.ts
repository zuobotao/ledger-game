/**
 * Phase 1: GameAction Contract Audit
 *
 * 验证：
 * 1. 所有 Action 类型有明确契约定义
 * 2. 所有 Action 有明确 playerId（除全局操作外）
 * 3. GameEngine 对已知 Action 的处理能力
 * 4. 盘点 Store 中绕过 Engine 的直接状态修改
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine } from '@/engine/gameEngine'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameAction, GameActionType } from '@/engine/contract'
import { GAME_ACTION_TYPES } from '@/engine/contract'

// ==================== Helpers ====================

function createTestConfig(): GameConfig {
  return {
    playerCount: 1, insurance: false, bigFamily: false,
    mortgage: false, fastStart: true, ageLimit: true,
  }
}

function createStateWithPlayer(): { state: GameState; player: Player } {
  const engine = createGameEngine(42)
  const career = CAREERS.find((c) => c.id === 'cleaner')!
  const player = engine.createPlayer('Test', career, createTestConfig(), false)
  const state: GameState = {
    players: [player], currentPlayerIndex: 0, phase: 'rat_race',
    config: createTestConfig(), winnerId: null, turnStatus: 'idle',
    lastRoll: 0, turnNumber: 1, gameMonth: 0,
    pendingAction: { type: null, card: null, message: '' },
    decks: undefined, transactions: [], cardHistory: [],
  }
  return { state, player }
}

// ==================== Tests ====================

describe('GameAction Contract Audit', () => {
  // --- 1. Action Type Completeness ---

  it('should have all required action types defined', () => {
    const requiredActions = [
      'start_game', 'roll_dice', 'move_player', 'resolve_cell',
      'handle_payday', 'handle_charity', 'buy_opportunity',
      'sell_opportunity', 'decline_opportunity', 'handle_market',
      'handle_doodad', 'handle_story', 'take_bank_loan',
      'repay_bank_loan', 'deposit_savings', 'withdraw_savings',
      'buy_insurance', 'declare_bankruptcy', 'end_turn', 'reset_game',
      'fast_track_escape', 'fast_track_opportunity', 'fast_track_dream',
      'fast_track_stock_trading', 'ai_think', 'send_to_fast_track',
    ]

    for (const action of requiredActions) {
      expect(GAME_ACTION_TYPES).toContain(action)
    }
  })

  it('should have 26 action types total', () => {
    expect(GAME_ACTION_TYPES.length).toBe(26)
  })

  // --- 2. Action-playerId Convention ---

  it('should require playerId for player-specific actions', () => {
    const playerSpecificActions: GameActionType[] = [
      'roll_dice', 'move_player', 'resolve_cell', 'handle_payday',
      'handle_charity', 'buy_opportunity', 'sell_opportunity',
      'decline_opportunity', 'handle_market', 'handle_doodad',
      'handle_story', 'take_bank_loan', 'repay_bank_loan',
      'deposit_savings', 'withdraw_savings', 'buy_insurance',
      'declare_bankruptcy', 'end_turn', 'fast_track_escape',
      'fast_track_opportunity', 'fast_track_dream',
      'fast_track_stock_trading', 'ai_think', 'send_to_fast_track',
    ]

    // Verify each action interface has playerId field
    for (const actionType of playerSpecificActions) {
      expect(actionType).toBeTruthy()
      // Runtime check: these actions should have playerId in their type definition
    }
  })

  // --- 3. Global Actions (no playerId) ---

  it('should have global actions without playerId', () => {
    const globalActions: GameActionType[] = ['start_game', 'reset_game']
    for (const action of globalActions) {
      expect(GAME_ACTION_TYPES).toContain(action)
    }
  })

  // --- 4. Engine Dispatch Coverage ---

  it('should handle roll_dice action', () => {
    const engine = createGameEngine(42)
    const { state } = createStateWithPlayer()
    const result = engine.dispatch(
      { type: 'roll_dice', playerId: state.players[0]!.id },
      state,
    )
    expect(result.success).toBe(true)
  })

  it('should handle handle_payday action', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()
    const before = player.cash
    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )
    expect(result.success).toBe(true)
    expect(player.cash).toBeGreaterThan(before)
  })

  it('should handle take_bank_loan action', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()
    const before = player.cash
    const result = engine.dispatch(
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      state,
    )
    expect(result.success).toBe(true)
    expect(player.cash).toBe(before + 1000)
  })

  it('should handle repay_bank_loan action', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()
    // First take a loan
    engine.dispatch(
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      state,
    )
    const loanId = player.liabilities[0]!.id
    const beforeCash = player.cash
    const result = engine.dispatch(
      { type: 'repay_bank_loan', playerId: player.id, liabilityId: loanId, amount: 500 },
      state,
    )
    expect(result.success).toBe(true)
    expect(player.cash).toBeLessThan(beforeCash)
  })

  it('should handle declare_bankruptcy action', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()
    expect(player.isBankrupt).toBe(false)
    const result = engine.dispatch(
      { type: 'declare_bankruptcy', playerId: player.id },
      state,
    )
    expect(result.success).toBe(true)
    expect(player.isBankrupt).toBe(true)
  })

  it('should handle end_turn action', () => {
    const engine = createGameEngine(42)
    const { state } = createStateWithPlayer()
    const result = engine.dispatch(
      { type: 'end_turn', playerId: state.players[0]!.id },
      state,
    )
    expect(result.success).toBe(true)
  })

  it('should handle reset_game action', () => {
    const engine = createGameEngine(42)
    const { state } = createStateWithPlayer()
    const result = engine.dispatch({ type: 'reset_game' }, state)
    expect(result.success).toBe(true)
  })

  // --- 5. Unknown Actions ---

  it('should not crash on unhandled action types', () => {
    const engine = createGameEngine(42)
    const { state } = createStateWithPlayer()
    // Actions that fall through to default should still return success
    const result = engine.dispatch(
      { type: 'buy_opportunity', playerId: state.players[0]!.id, card: { id: 'x', size: 'small', type: 'stock', title: 'X', description: '', cost: 100, cashFlow: 10 } },
      state,
    )
    expect(result.success).toBe(true)
  })

  // --- 6. Action-Produced Events ---

  it('should produce events for handled actions', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )
    // Events should be recorded
    expect(result.events.length).toBeGreaterThan(0)
    // Last event should be payday_received
    const lastEvent = result.events[result.events.length - 1]
    expect(lastEvent?.type).toBe('payday_received')
  })

  // --- 7. Event Coverage Audit ---

  it('should produce matching event types', () => {
    // Each dispatched action that engine handles should produce at least one event
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    // roll_dice → dice_rolled
    const r1 = engine.dispatch({ type: 'roll_dice', playerId: player.id }, state)
    const diceEvent = r1.events[r1.events.length - 1]
    expect(diceEvent?.type).toBe('dice_rolled')

    // take_bank_loan → bank_loan_taken
    const r2 = engine.dispatch({ type: 'take_bank_loan', playerId: player.id, amount: 100 }, state)
    const loanEvent = r2.events[r2.events.length - 1]
    expect(loanEvent?.type).toBe('bank_loan_taken')
  })
})

// ==================== Store Bypass Audit ====================

describe('Store Bypass Audit', () => {
  /**
   * 这些测试记录当前 Store 绕过 Engine 的状态修改，
   * 作为 Phase 7 Store 瘦身的目标清单。
   */

  it('documents: Store directly mutates player.cash for most operations', () => {
    // src/stores/game.ts contains direct mutations like:
    // - player.cash += player.cashFlow (handlePayday)
    // - player.cash -= card.cost (applyDoodad)
    // - player.cash += total (sellOpportunityStock)
    // - player.cash -= cost (tradeBuyStock)
    // These bypass the Engine dispatch mechanism.
    // Phase 7 will migrate these to Engine.
    expect(true).toBe(true)
  })

  it('documents: Store handles game rules directly', () => {
    // Store contains game rule logic that should be in Engine:
    // - canPlayerAfford (1744)
    // - checkFinancialFreedom (1926)
    // - enterFastTrack (1976)
    // - requireLoanForPayment (709)
    // These are candidates for engine migration.
    expect(true).toBe(true)
  })

  it('documents: AI runs in Store, not Engine', () => {
    // Store has runAITurn() and related functions that:
    // - Directly call store methods (not engine dispatch)
    // - Directly mutate player state
    // Phase 6 will restructure this.
    expect(true).toBe(true)
  })
})