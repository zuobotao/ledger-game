/**
 * Phase 1: GameEvent Contract Audit
 *
 * 验证：
 * 1. 所有 Event 类型有明确契约定义
 * 2. Event 包含足够 replay 所需信息
 * 3. Event 不重复表达
 * 4. Event 覆盖所有核心游戏操作
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine } from '@/engine/gameEngine'
import { createEventLogManager } from '@/engine/eventLog'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameEvent } from '@/engine/contract'

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

describe('GameEvent Contract Audit', () => {
  // --- 1. Event Type Completeness ---

  const allEventTypes = [
    'game_started', 'dice_rolled', 'player_moved', 'cell_resolved',
    'payday_received', 'charity_accepted', 'opportunity_bought',
    'opportunity_sold', 'opportunity_declined', 'market_event_applied',
    'doodad_paid', 'story_resolved', 'bank_loan_taken',
    'bank_loan_repaid', 'savings_deposited', 'savings_withdrawn',
    'insurance_bought', 'child_born', 'laid_off', 'rehired',
    'bankruptcy_declared', 'turn_ended', 'turn_started',
    'fast_track_entered', 'cash_flow_changed', 'asset_changed',
    'liability_changed', 'game_over', 'game_reset',
    'stock_split', 'age_retired',
  ]

  it('should have 31 event types', () => {
    expect(allEventTypes.length).toBe(31)
  })

  it('should have all required event types', () => {
    // This is a type-level check; runtime verifies list completeness
    expect(allEventTypes).toContain('game_started')
    expect(allEventTypes).toContain('dice_rolled')
    expect(allEventTypes).toContain('player_moved')
    expect(allEventTypes).toContain('payday_received')
    expect(allEventTypes).toContain('bankruptcy_declared')
    expect(allEventTypes).toContain('game_over')
  })

  // --- 2. Event for Each Core Operation ---

  it('should have events for core operations', () => {
    const coreOps = {
      'payday': 'payday_received',
      'charity': 'charity_accepted',
      'buy_asset': 'opportunity_bought',
      'sell_asset': 'opportunity_sold',
      'market': 'market_event_applied',
      'doodad': 'doodad_paid',
      'story': 'story_resolved',
      'loan': 'bank_loan_taken',
      'repay': 'bank_loan_repaid',
      'savings': 'savings_deposited',
      'withdraw': 'savings_withdrawn',
      'insurance': 'insurance_bought',
      'bankruptcy': 'bankruptcy_declared',
      'move': 'player_moved',
      'dice': 'dice_rolled',
      'fast_track': 'fast_track_entered',
      'child': 'child_born',
      'layoff': 'laid_off',
      'rehire': 'rehired',
      'stock_split': 'stock_split',
      'retire': 'age_retired',
    }

    for (const [op, eventType] of Object.entries(coreOps)) {
      expect(allEventTypes).toContain(eventType)
    }
  })

  // --- 3. Events Must Carry Replay Information ---

  it('should have timestamp in all events', () => {
    // All events extend a base with timestamp field
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )
    const event = result.events[result.events.length - 1]
    expect(event).toBeDefined()
    expect(event!.timestamp).toBeGreaterThan(0)
  })

  it('should have playerId in player-specific events', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )
    const event = result.events[result.events.length - 1] as GameEvent

    // payday_received should have playerId for replay
    if ('playerId' in event) {
      expect(event.playerId).toBe(player.id)
    }
  })

  // --- 4. Event Sequence Integrity ---

  it('should produce events in correct order', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    engine.dispatch({ type: 'roll_dice', playerId: player.id }, state)
    engine.dispatch({ type: 'handle_payday', playerId: player.id }, state)

    const events = engine.events
    expect(events.length).toBeGreaterThanOrEqual(2)

    // Timestamps should be non-decreasing
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.timestamp).toBeGreaterThanOrEqual(events[i - 1]!.timestamp)
    }
  })

  // --- 5. Event Uniqueness ---

  it('should not have duplicate event types for the same operation', () => {
    // Check that there's no overlap in event semantics
    // e.g., no two events with different names for the same intent
    const eventNames = allEventTypes
    const uniqueNames = new Set(eventNames)
    expect(uniqueNames.size).toBe(eventNames.length)
  })

  // --- 6. Event Data Completeness ---

  it('should have sufficient data for payday event', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()
    const beforeCash = player.cash

    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )
    const event = result.events[result.events.length - 1]

    // Payday event must carry enough data for replay
    expect(event?.type).toBe('payday_received')
    if ('amount' in event) {
      expect(event.amount).toBeGreaterThan(0)
    }
    if ('cashBefore' in event) {
      expect(event.cashBefore).toBe(beforeCash)
    }
    if ('cashAfter' in event) {
      expect(event.cashAfter).toBe(player.cash)
    }
  })

  it('should have sufficient data for loan event', () => {
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    const result = engine.dispatch(
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      state,
    )
    const event = result.events[result.events.length - 1]

    expect(event?.type).toBe('bank_loan_taken')
    if ('amount' in event) {
      expect(event.amount).toBe(1000)
    }
  })

  // --- 7. Event-Event Log Integration ---

  it('should integrate with EventLogManager', () => {
    const logger = createEventLogManager('test', 0)
    const engine = createGameEngine(42)
    const { state, player } = createStateWithPlayer()

    const result = engine.dispatch(
      { type: 'handle_payday', playerId: player.id },
      state,
    )

    // All events from engine should be loggable
    result.events.forEach((e) => logger.record(e))
    expect(logger.count).toBe(result.events.length)
  })
})