import { describe, expect, it, beforeEach } from 'vitest'
import {
  createEventLogManager,
  EventLogManager,
} from '@/engine/eventLog'
import {
  createReplayEngine,
  ReplayEngine,
} from '@/engine/replay'
import {
  createSimulationEngine,
  SimulationEngine,
} from '@/engine/simulation'
import { createGameEngine, GameEngine } from '@/engine/gameEngine'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig, Player } from '@/types/game'
import type { GameEvent, GameAction } from '@/engine/contract'

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

function makeEvent(
  type: string,
  timestamp: number,
  playerId: string,
  overrides: Record<string, unknown> = {},
): GameEvent {
  const base: Record<string, unknown> = { type, timestamp, playerId, ...overrides }
  return base as unknown as GameEvent
}

// ==================== EventLogManager Tests ====================

describe('EventLogManager', () => {
  let logger: EventLogManager

  beforeEach(() => {
    logger = createEventLogManager('test-game-001', 1000)
  })

  it('should create with gameId and startTime', () => {
    expect(logger.gameId).toBe('test-game-001')
    expect(logger.gameStartTime).toBe(1000)
    expect(logger.count).toBe(0)
  })

  it('should record events', () => {
    const event = makeEvent('dice_rolled', 1100, 'p1', { values: [3, 4], total: 7 })
    logger.record(event)
    expect(logger.count).toBe(1)
    expect(logger.at(0)).toEqual(event)
  })

  it('should record batch events', () => {
    const events = [
      makeEvent('dice_rolled', 1100, 'p1', { values: [3], total: 3 }),
      makeEvent('player_moved', 1200, 'p1', { fromIndex: 0, toIndex: 3 }),
      makeEvent('payday_received', 1300, 'p1', { amount: 500 }),
    ]
    logger.recordBatch(events)
    expect(logger.count).toBe(3)
  })

  it('should get first and last events', () => {
    logger.record(makeEvent('game_started', 1000, '', { playerCount: 2 }))
    logger.record(makeEvent('dice_rolled', 1100, 'p1', { total: 5 }))
    logger.record(makeEvent('game_over', 2000, '', { reason: 'victory' }))

    expect(logger.first()?.type).toBe('game_started')
    expect(logger.last()?.type).toBe('game_over')
  })

  describe('query', () => {
    beforeEach(() => {
      logger.record(makeEvent('dice_rolled', 1100, 'p1', { values: [3], total: 3 }))
      logger.record(makeEvent('player_moved', 1200, 'p1', { fromIndex: 0, toIndex: 3 }))
      logger.record(makeEvent('payday_received', 1300, 'p1', { amount: 500 }))
      logger.record(makeEvent('dice_rolled', 1400, 'p2', { values: [5], total: 5 }))
      logger.record(makeEvent('player_moved', 1500, 'p2', { fromIndex: 0, toIndex: 5 }))
      logger.record(makeEvent('bankruptcy_declared', 1600, 'p2', {}))
    })

    it('should filter by playerId', () => {
      const results = logger.query({ playerId: 'p1' })
      expect(results.length).toBe(3)
      results.forEach((e) => {
        expect('playerId' in e).toBe(true)
      })
    })

    it('should filter by event type', () => {
      const results = logger.query({ eventTypes: ['dice_rolled'] })
      expect(results.length).toBe(2)
      results.forEach((e) => expect(e.type).toBe('dice_rolled'))
    })

    it('should filter by multiple event types', () => {
      const results = logger.query({
        eventTypes: ['dice_rolled', 'player_moved'],
      })
      expect(results.length).toBe(4)
    })

    it('should filter by time range', () => {
      const results = logger.query({ fromTimestamp: 1200, toTimestamp: 1400 })
      expect(results.length).toBe(3)
    })

    it('should filter by index range', () => {
      const results = logger.query({ fromIndex: 1, toIndex: 3 })
      expect(results.length).toBe(3)
    })

    it('should combine filters', () => {
      const results = logger.query({
        playerId: 'p1',
        eventTypes: ['dice_rolled', 'player_moved'],
      })
      expect(results.length).toBe(2)
    })
  })

  describe('serialization', () => {
    beforeEach(() => {
      logger.record(makeEvent('dice_rolled', 1100, 'p1', { values: [3], total: 3 }))
      logger.record(makeEvent('player_moved', 1200, 'p1', { fromIndex: 0, toIndex: 3 }))
    })

    it('should export to EventLog', () => {
      const log = logger.toEventLog()
      expect(log.gameId).toBe('test-game-001')
      expect(log.events.length).toBe(2)
    })

    it('should export to JSON and restore', () => {
      const json = logger.toJSON()
      const restored = EventLogManager.fromJSON(json)
      expect(restored.gameId).toBe('test-game-001')
      expect(restored.count).toBe(2)
      expect(restored.at(0)?.type).toBe('dice_rolled')
    })

    it('should restore from EventLog', () => {
      const log = logger.toEventLog()
      const restored = EventLogManager.fromEventLog(log)
      expect(restored.gameId).toBe(log.gameId)
      expect(restored.count).toBe(log.events.length)
    })
  })

  describe('statistics', () => {
    beforeEach(() => {
      logger.record(makeEvent('dice_rolled', 1100, 'p1', { values: [3], total: 3 }))
      logger.record(makeEvent('player_moved', 1200, 'p1', { fromIndex: 0, toIndex: 3 }))
      logger.record(makeEvent('payday_received', 1300, 'p1', { amount: 500 }))
      logger.record(makeEvent('dice_rolled', 1400, 'p1', { values: [5], total: 5 }))
      logger.record(makeEvent('player_moved', 1500, 'p1', { fromIndex: 3, toIndex: 8 }))
      logger.record(makeEvent('bankruptcy_declared', 1600, 'p1', {}))
    })

    it('should compute stats', () => {
      const stats = logger.getStats()
      expect(stats.totalEvents).toBe(6)
      expect(stats.byType['dice_rolled']).toBe(2)
      expect(stats.byType['player_moved']).toBe(2)
      expect(stats.byType['payday_received']).toBe(1)
      expect(stats.byType['bankruptcy_declared']).toBe(1)
      expect(stats.byPlayer['p1']).toBe(6)
      expect(stats.duration).toBe(500)
    })

    it('should compute player activity summary', () => {
      const summary = logger.getPlayerActivitySummary('p1')
      expect(summary.playerId).toBe('p1')
      expect(summary.totalEvents).toBe(6)
      expect(summary.totalMoves).toBe(2)
      expect(summary.declaredBankrupt).toBe(true)
    })
  })
})

// ==================== ReplayEngine Tests ====================

describe('ReplayEngine', () => {
  let engine: GameEngine
  let logger: EventLogManager
  let state: GameState
  let player: Player

  beforeEach(() => {
    engine = createGameEngine(42)
    logger = createEventLogManager('replay-test', 1000)
    state = createEmptyState()
    player = createTestPlayer(engine)
    state.players = [player]
  })

  it('should create replay engine', () => {
    const replay = createReplayEngine(logger, state)
    const rs = replay.getState()
    expect(rs.totalEvents).toBe(0)
    expect(rs.isAtStart).toBe(true)
  })

  it('should reset to initial state', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    const replay = createReplayEngine(logger, state)
    replay.stepForward()
    replay.reset()

    const rs = replay.getState()
    expect(rs.currentIndex).toBe(-1)
    expect(rs.isAtStart).toBe(true)
  })

  it('should step forward through events', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    let rs = replay.getState()
    expect(rs.currentIndex).toBe(0)

    replay.stepForward()
    rs = replay.getState()
    expect(rs.currentIndex).toBe(1)
    expect(rs.isFinished).toBe(true)
  })

  it('should not step past end', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    const replay = createReplayEngine(logger, state)
    replay.stepForward()
    replay.stepForward() // already at end

    const rs = replay.getState()
    expect(rs.currentIndex).toBe(0)
  })

  it('should step backward', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()
    replay.stepForward()
    expect(replay.getState().currentIndex).toBe(1)

    replay.stepBackward()
    expect(replay.getState().currentIndex).toBe(0)
  })

  it('should jump to specific index', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))
    logger.record(makeEvent('payday_received', 1300, player.id, { amount: 500 }))

    const replay = createReplayEngine(logger, state)
    replay.jumpTo(2)
    expect(replay.getState().currentIndex).toBe(2)
  })

  it('should skip to end', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))
    logger.record(makeEvent('payday_received', 1300, player.id, { amount: 500 }))

    const replay = createReplayEngine(logger, state)
    replay.skipToEnd()
    expect(replay.getState().currentIndex).toBe(2)
    expect(replay.getState().isFinished).toBe(true)
  })

  it('should skip to event type', () => {
    logger.record(makeEvent('dice_rolled', 1100, player.id, { values: [3], total: 3 }))
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))
    logger.record(makeEvent('payday_received', 1300, player.id, { amount: 500 }))

    const replay = createReplayEngine(logger, state)
    replay.skipToEventType('payday_received')
    expect(replay.getState().currentIndex).toBe(2)
  })

  it('should get current event detail', () => {
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 3, phase: 'rat_race',
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    const detail = replay.getCurrentEventDetail()
    expect(detail).not.toBeNull()
    expect(detail?.event.type).toBe('player_moved')
    expect(detail?.index).toBe(0)
  })

  it('should return null detail when at start', () => {
    const replay = createReplayEngine(logger, state)
    expect(replay.getCurrentEventDetail()).toBeNull()
  })

  it('should apply player_moved event to state', () => {
    logger.record(makeEvent('player_moved', 1200, player.id, {
      fromIndex: 0, toIndex: 5, phase: 'rat_race',
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    const currentState = replay.getCurrentState()
    const p = currentState?.players[0]
    expect(p?.ratRacePosition).toBe(5)
  })

  it('should apply payday_received event to state', () => {
    const beforeCash = player.cash
    logger.record(makeEvent('payday_received', 1300, player.id, {
      amount: player.cashFlow,
      cashBefore: beforeCash,
      cashAfter: beforeCash + player.cashFlow,
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    const currentState = replay.getCurrentState()
    expect(currentState?.players[0].cash).toBe(beforeCash + player.cashFlow)
  })

  it('should apply bankruptcy event to state', () => {
    logger.record(makeEvent('bankruptcy_declared', 1600, player.id, {}))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    const currentState = replay.getCurrentState()
    expect(currentState?.players[0].isBankrupt).toBe(true)
  })

  it('should apply game_over event', () => {
    logger.record(makeEvent('game_over', 2000, '', {
      reason: 'victory',
      winnerId: player.id,
    }))

    const replay = createReplayEngine(logger, state)
    replay.stepForward()

    const currentState = replay.getCurrentState()
    expect(currentState?.phase).toBe('finished')
    expect(currentState?.winnerId).toBe(player.id)
  })
})

// ==================== SimulationEngine Tests ====================

describe('SimulationEngine', () => {
  let engine: GameEngine
  let sim: SimulationEngine
  let state: GameState
  let player: Player

  beforeEach(() => {
    engine = createGameEngine(42)
    sim = createSimulationEngine(engine, 42)
    state = createEmptyState()
    player = createTestPlayer(engine)
    state.players = [player]
  })

  it('should create simulation engine', () => {
    expect(sim).toBeDefined()
    expect(sim.engine).toBeDefined()
  })

  it('should simulate a single action', () => {
    const beforeCash = player.cash
    const result = sim.simulate(state, [
      { type: 'handle_payday', playerId: player.id },
    ])

    expect(result.success).toBe(true)
    expect(result.actionsExecuted).toBe(1)
    expect(result.playerResults.length).toBe(1)
    expect(result.playerResults[0]!.cashAfter).toBe(beforeCash + player.cashFlow)
  })

  it('should not mutate original state', () => {
    const beforeCash = player.cash
    sim.simulate(state, [
      { type: 'handle_payday', playerId: player.id },
    ])

    // Original state should be unchanged
    expect(state.players[0]!.cash).toBe(beforeCash)
  })

  it('should simulate multiple actions', () => {
    sim.simulate(state, [
      { type: 'handle_payday', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
    ])

    // Should not crash with 3 actions
  })

  it('should handle failed action gracefully', () => {
    const result = sim.simulate(state, [
      { type: 'take_bank_loan', playerId: player.id, amount: 0 },
    ])

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.actionsExecuted).toBe(0)
  })

  it('should simulate multiple branches', () => {
    const branches = [
      {
        id: 'b1',
        label: 'Do nothing',
        actions: [] as GameAction[],
      },
      {
        id: 'b2',
        label: 'Take loan',
        actions: [
          { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
        ] as GameAction[],
      },
      {
        id: 'b3',
        label: 'Take loan and repay',
        actions: [
          { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
        ] as GameAction[],
      },
    ]

    const results = sim.simulateBranches(state, branches)
    expect(results.length).toBe(3)

    // b2 should have loan taken
    const b2Result = results[1]?.result
    expect(b2Result?.success).toBe(true)
  })

  it('should compare branches and rank them', () => {
    const branches = [
      {
        id: 'b1',
        label: 'Do nothing',
        actions: [] as GameAction[],
      },
      {
        id: 'b2',
        label: 'Receive payday',
        actions: [
          { type: 'handle_payday', playerId: player.id },
        ] as GameAction[],
      },
    ]

    const simulated = sim.simulateBranches(state, branches)
    const comparison = sim.compareBranches(simulated)

    expect(comparison.length).toBe(2)
    // b2 (payday) should have higher net worth due to cash increase
    expect(comparison[0]!.branchId).toBe('b2')
    expect(comparison[0]!.rank).toBe(1)
    expect(comparison[1]!.rank).toBe(2)
  })

  it('should get best branch', () => {
    const branches = [
      {
        id: 'b1',
        label: 'Do nothing',
        actions: [] as GameAction[],
      },
      {
        id: 'b2',
        label: 'Receive payday',
        actions: [
          { type: 'handle_payday', playerId: player.id },
        ] as GameAction[],
      },
    ]

    const simulated = sim.simulateBranches(state, branches)
    const best = sim.getBestBranch(simulated)
    expect(best).not.toBeNull()
    expect(best?.id).toBe('b2')
  })

  it('should evaluate player actions', () => {
    const options = [
      { label: 'Do nothing', action: { type: 'end_turn', playerId: player.id } as GameAction },
      {
        label: 'Take loan',
        action: { type: 'take_bank_loan', playerId: player.id, amount: 1000 } as GameAction,
      },
    ]

    const evaluated = sim.evaluatePlayerActions(state, player.id, options)
    expect(evaluated.length).toBe(2)

    const comparison = sim.compareBranches(evaluated)
    expect(comparison[0]!.rank).toBe(1)
  })

  it('should include detailed player results', () => {
    const result = sim.simulate(state, [
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
    ])

    const pr = result.playerResults[0]!
    expect(pr.playerId).toBe(player.id)
    expect(pr.playerName).toBe(player.name)
    expect(pr.cashChange).toBe(1000)
    expect(pr.netWorthBefore).toBeDefined()
    expect(pr.netWorthAfter).toBeDefined()
    expect(pr.assetCountBefore).toBe(0)
    expect(pr.liabilityCountAfter).toBeGreaterThanOrEqual(0)
  })
})