/**
 * Phase 3: Replay Determinism Integration Test
 *
 * 验证：
 * 1. 相同 seed + actions → 相同 events + finalState
 * 2. Replay 重建最终状态与原始游戏一致
 * 3. Event 序列一致
 * 4. State Hash 一致
 * 5. GameReplay 序列化/反序列化循环
 * 6. Replay Hash 完整性校验
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { createEventLogManager, EventLogManager } from '@/engine/eventLog'
import { createReplayEngine, createReplayFromGameReplay } from '@/engine/replay'
import { calculateStateHash, calculateReplayHash, calculateEventSequenceHash } from '@/engine/stateHash'
import { recalcPlayerFinancials } from '@/engine/financialEngine'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameAction, GameReplay } from '@/engine/contract'

// ==================== Helpers ====================

function createTestConfig(): GameConfig {
  return {
    playerCount: 1,
    insurance: false,
    bigFamily: false,
    mortgage: false,
    fastStart: true,
    ageLimit: true,
  }
}

function createEmptyState(): GameState {
  return {
    players: [],
    currentPlayerIndex: 0,
    phase: 'rat_race',
    config: createTestConfig(),
    winnerId: null,
    turnStatus: 'idle',
    lastRoll: 0,
    turnNumber: 1,
    gameMonth: 0,
    pendingAction: { type: null, card: null, message: '' },
    decks: undefined,
    transactions: [],
    cardHistory: [],
  }
}

function createTestPlayer(
  engine: GameEngine,
  name: string = 'Test Player',
  careerId: string = 'cleaner',
): Player {
  const career = CAREERS.find((c) => c.id === careerId)!
  return engine.createPlayer(name, career, createTestConfig(), false)
}

/**
 * Dispatch wrapper that records only new events.
 *
 * Engine.dispatch returns the CUMULATIVE event log, not just the delta.
 * This wrapper tracks the event count and records only new events.
 */
class GameRecorder {
  private eventCount = 0
  readonly logger: EventLogManager
  readonly engine: GameEngine

  constructor(engine: GameEngine, logger: EventLogManager) {
    this.engine = engine
    this.logger = logger
  }

  dispatch(action: GameAction, state: GameState): void {
    this.engine.dispatch(action, state)
    const allEvents = this.engine.events
    const newEvents = allEvents.slice(this.eventCount)
    this.logger.recordBatch(newEvents)
    this.eventCount = allEvents.length
  }
}

/** Helper to deep clone state for recording initialState */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}

// ==================== State Hash Tests ====================

describe('calculateStateHash', () => {
  it('should produce same hash for identical states', () => {
    const engine = createGameEngine(42)
    const state1 = createEmptyState()
    const player = createTestPlayer(engine)
    state1.players = [player]

    const state2 = createEmptyState()
    const player2 = createTestPlayer(createGameEngine(42))
    state2.players = [player2]

    expect(calculateStateHash(state1)).toBe(calculateStateHash(state2))
  })

  it('should produce different hash for different states', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const hash1 = calculateStateHash(state)

    // Modify cash
    player.cash += 1000
    const hash2 = calculateStateHash(state)

    expect(hash1).not.toBe(hash2)
  })

  it('should produce same hash for different player creation order', () => {
    const state1 = createEmptyState()
    const p1 = createTestPlayer(createGameEngine(42))
    state1.players = [p1]

    const state2 = createEmptyState()
    const p2 = createTestPlayer(createGameEngine(42))
    state2.players = [p2]

    expect(calculateStateHash(state1)).toBe(calculateStateHash(state2))
  })

  it('should produce different hash when financials change', () => {
    const engine = createGameEngine(42)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const hash1 = calculateStateHash(state)

    // Change cash which affects net worth
    player.cash += 500
    recalcPlayerFinancials(player)
    const hash2 = calculateStateHash(state)

    expect(hash1).not.toBe(hash2)
  })
})

// ==================== Replay Determinism Tests ====================

describe('Replay Determinism', () => {
  it('should produce identical state hash from replay', () => {
    const seed = 100
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('det-test', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const finalHash = calculateStateHash(state)

    // Replay from the same initial state and events
    const replay = createReplayEngine(logger, initialState)
    const verification = replay.verifyReplay(finalHash)

    expect(verification.passed).toBe(true)
    expect(verification.expectedHash).toBe(finalHash)
    expect(verification.actualHash).toBe(finalHash)
  })

  it('should produce identical event sequence in replay', () => {
    const seed = 200
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('det-test-2', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const originalEvents = logger.getAll()
    const originalEventHash = calculateEventSequenceHash(originalEvents)

    // Replay and compare events
    const replay = createReplayEngine(logger, initialState)
    replay.skipToEnd()

    const replayedEvents = logger.getAll()
    const replayedEventHash = calculateEventSequenceHash(replayedEvents)

    // Event sequence should be identical
    expect(originalEvents.length).toBe(replayedEvents.length)
    expect(originalEventHash).toBe(replayedEventHash)
  })

  it('should produce same result with same seed and same actions', () => {
    const seed = 300

    // Run 1
    const engine1 = createGameEngine(seed)
    const logger1 = createEventLogManager('run1', 1000)
    const recorder1 = new GameRecorder(engine1, logger1)
    const state1 = createEmptyState()
    const player1 = createTestPlayer(engine1, 'P1')
    state1.players = [player1]
    const init1 = cloneState(state1)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player1.id },
      { type: 'handle_payday', playerId: player1.id },
      { type: 'take_bank_loan', playerId: player1.id, amount: 500 },
      { type: 'handle_payday', playerId: player1.id },
      { type: 'end_turn', playerId: player1.id },
    ]

    for (const action of actions) {
      recorder1.dispatch(action, state1)
    }
    const hash1 = calculateStateHash(state1)

    // Run 2 (same seed)
    const engine2 = createGameEngine(seed)
    const logger2 = createEventLogManager('run2', 1000)
    const recorder2 = new GameRecorder(engine2, logger2)
    const state2 = createEmptyState()
    const player2 = createTestPlayer(engine2, 'P1')
    state2.players = [player2]
    const init2 = cloneState(state2)

    for (const action of actions) {
      recorder2.dispatch(action, state2)
    }
    const hash2 = calculateStateHash(state2)

    // Both runs should produce identical state hashes
    expect(hash1).toBe(hash2)

    // Both replays should verify correctly
    const replay1 = createReplayEngine(logger1, init1)
    const replay2 = createReplayEngine(logger2, init2)

    expect(replay1.verifyReplay(hash1).passed).toBe(true)
    expect(replay2.verifyReplay(hash2).passed).toBe(true)
  })
})

// ==================== GameReplay Serialization Tests ====================

describe('GameReplay Serialization', () => {
  it('should export and import GameReplay correctly', () => {
    const seed = 400
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('serialize-test', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const finalHash = calculateStateHash(state)

    // Export as GameReplay
    const replay = createReplayEngine(logger, initialState)
    const gameReplay = replay.toGameReplay(seed, actions)

    expect(gameReplay.version).toBe('2.0.1')
    expect(gameReplay.seed).toBe(seed)
    expect(gameReplay.actions.length).toBe(actions.length)
    expect(gameReplay.events.length).toBeGreaterThan(0)
    expect(gameReplay.finalStateHash).toBe(finalHash)

    // Import from GameReplay
    const replayedEngine = createReplayFromGameReplay(gameReplay)
    const verification = replayedEngine.verifyReplay(finalHash)

    expect(verification.passed).toBe(true)
    expect(verification.actualHash).toBe(finalHash)
  })

  it('should produce same replay hash for identical replays', () => {
    const seed = 500
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('replay-hash-test', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const replay = createReplayEngine(logger, initialState)
    const gameReplay = replay.toGameReplay(seed, actions)
    const hash1 = calculateReplayHash(gameReplay)

    // Re-create same replay
    const replay2 = createReplayEngine(logger, initialState)
    const gameReplay2 = replay2.toGameReplay(seed, actions)
    const hash2 = calculateReplayHash(gameReplay2)

    expect(hash1).toBe(hash2)
  })

  it('should detect replay tampering (different final state)', () => {
    const seed = 600
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('tamper-test', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const replay = createReplayEngine(logger, initialState)
    const gameReplay = replay.toGameReplay(seed, actions)

    // Tamper with finalStateHash
    const tampered = { ...gameReplay, finalStateHash: 'deadbeef' }
    expect(calculateReplayHash(gameReplay)).not.toBe(calculateReplayHash(tampered))
  })

  it('should fail verification with wrong expected hash', () => {
    const seed = 700
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('wrong-hash-test', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const replay = createReplayEngine(logger, initialState)
    const verification = replay.verifyReplay('deadbeef')

    expect(verification.passed).toBe(false)
    expect(verification.expectedHash).toBe('deadbeef')
    expect(verification.actualHash).not.toBe('deadbeef')
  })
})

// ==================== 50+ Actions Replay Test ====================

describe('50+ Actions Replay', () => {
  it('should replay 50+ actions and produce identical final state', () => {
    const seed = 999
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('50-actions', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = []

    // Generate 50+ actions mixing the supported action types
    for (let i = 0; i < 55; i++) {
      let action: GameAction
      const actionType = i % 4

      switch (actionType) {
        case 0:
          action = { type: 'roll_dice', playerId: player.id }
          break
        case 1:
          action = { type: 'handle_payday', playerId: player.id }
          break
        case 2:
          action = { type: 'take_bank_loan', playerId: player.id, amount: 100 + (i * 10) }
          break
        case 3:
        default:
          action = { type: 'end_turn', playerId: player.id }
          break
      }

      actions.push(action)
      recorder.dispatch(action, state)
    }

    const finalHash = calculateStateHash(state)

    // Replay and verify
    const replay = createReplayEngine(logger, initialState)
    const verification = replay.verifyReplay(finalHash)

    expect(verification.passed).toBe(true)
    expect(actions.length).toBe(55)
    expect(logger.count).toBeGreaterThan(0)

    // Export as GameReplay and re-import
    const gameReplay = replay.toGameReplay(seed, actions)
    const replayedEngine = createReplayFromGameReplay(gameReplay)
    const reVerification = replayedEngine.verifyReplay(finalHash)

    expect(reVerification.passed).toBe(true)
  })
})

// ==================== Event Sequence Consistency ====================

describe('Event Sequence Consistency', () => {
  it('should produce identical event types in same order', () => {
    const seed = 800
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('event-seq', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const player = createTestPlayer(engine)
    state.players = [player]
    const initialState = cloneState(state)

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      { type: 'handle_payday', playerId: player.id },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const originalEventTypes = logger.getAll().map((e) => e.type)

    // Replay
    const replay = createReplayEngine(logger, initialState)
    replay.skipToEnd()

    const replayedEventTypes = logger.getAll().map((e) => e.type)

    // Event types should be identical in order
    expect(originalEventTypes).toEqual(replayedEventTypes)
    expect(originalEventTypes.length).toBeGreaterThan(0)
  })
})