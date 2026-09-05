/**
 * Phase 3: State Hash Unit Tests
 */

import { describe, expect, it } from 'vitest'
import { createGameEngine } from '@/engine/gameEngine'
import { createEventLogManager } from '@/engine/eventLog'
import { createReplayEngine } from '@/engine/replay'
import { calculateStateHash } from '@/engine/stateHash'
import { CAREERS } from '@/data/careers'
import type { GameState, GameConfig } from '@/types/game'
import type { GameAction } from '@/engine/contract'

function createTestConfig(): GameConfig {
  return {
    playerCount: 1, insurance: false, bigFamily: false,
    mortgage: false, fastStart: true, ageLimit: true,
  }
}

function createEmptyState(): GameState {
  return {
    players: [], currentPlayerIndex: 0, phase: 'rat_race',
    config: createTestConfig(), winnerId: null, turnStatus: 'idle',
    lastRoll: 0, turnNumber: 1, gameMonth: 0,
    pendingAction: { type: null, card: null, message: '' },
    decks: undefined, transactions: [], cardHistory: [],
  }
}

class GameRecorder {
  private eventCount = 0
  readonly logger: ReturnType<typeof createEventLogManager>
  readonly engine: ReturnType<typeof createGameEngine>

  constructor(engine: ReturnType<typeof createGameEngine>, logger: ReturnType<typeof createEventLogManager>) {
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

describe('Replay Step-by-Step Debug', () => {
  it('should have deterministic player creation', () => {
    const seed = 300
    const engine1 = createGameEngine(seed)
    const career1 = CAREERS.find((c) => c.id === 'cleaner')!
    const player1 = engine1.createPlayer('P1', career1, createTestConfig(), false)

    const engine2 = createGameEngine(seed)
    const career2 = CAREERS.find((c) => c.id === 'cleaner')!
    const player2 = engine2.createPlayer('P1', career2, createTestConfig(), false)

    console.log('Player1 ID:', player1.id, 'Player2 ID:', player2.id)
    console.log('Player1 cash:', player1.cash, 'Player2 cash:', player2.cash)
    console.log('Player1 liabs:', player1.liabilities.length, 'Player2 liabs:', player2.liabilities.length)
    if (player1.liabilities.length > 0) {
      console.log('  P1 liab:', JSON.stringify(player1.liabilities))
      console.log('  P2 liab:', JSON.stringify(player2.liabilities))
    }

    const state1 = createEmptyState()
    state1.players = [player1]
    const state2 = createEmptyState()
    state2.players = [player2]

    const hash1 = calculateStateHash(state1)
    const hash2 = calculateStateHash(state2)
    console.log('Hash1:', hash1, 'Hash2:', hash2)

    expect(hash1).toBe(hash2)
  })

  it('should replay deterministically to the same state hash', () => {
    const seed = 100
    const engine = createGameEngine(seed)
    const logger = createEventLogManager('debug', 1000)
    const recorder = new GameRecorder(engine, logger)
    const state = createEmptyState()
    const career = CAREERS.find((c) => c.id === 'cleaner')!
    const player = engine.createPlayer('Test', career, createTestConfig(), false)
    state.players = [player]
    const initialState = JSON.parse(JSON.stringify(state)) as GameState

    const actions: GameAction[] = [
      { type: 'roll_dice', playerId: player.id },
      { type: 'handle_payday', playerId: player.id },
      { type: 'take_bank_loan', playerId: player.id, amount: 1000 },
      { type: 'end_turn', playerId: player.id },
    ]

    for (const action of actions) {
      recorder.dispatch(action, state)
    }

    const engineFinalHash = calculateStateHash(state)

    // Now replay step by step and compare
    const replay = createReplayEngine(logger, initialState)
    const events = logger.getAll()

    for (let i = 0; i < events.length; i++) {
      replay.stepForward()
      const replayState = replay.getCurrentState()!
      const replayHash = calculateStateHash(replayState)

      // We can't compare intermediate hashes because engine doesn't provide snapshots
      // But we can verify the final hash matches
    }

    replay.skipToEnd()
    const replayFinalHash = replay.getCurrentStateHash()!

    // Debug: print state details
    const ep = state.players[0]!
    const rp = replay.getCurrentState()!.players[0]!
    
    if (engineFinalHash !== replayFinalHash) {
      console.log('=== MISMATCH ===')
      console.log('state level:')
      console.log('  currentPlayerIndex:', state.currentPlayerIndex, 'vs', replay.getCurrentState()!.currentPlayerIndex)
      console.log('  winnerId:', state.winnerId, 'vs', replay.getCurrentState()!.winnerId)
      console.log('  gameEndReason:', state.gameEndReason, 'vs', replay.getCurrentState()!.gameEndReason)
      console.log('  turnNumber:', state.turnNumber, 'vs', replay.getCurrentState()!.turnNumber)
      console.log('  gameMonth:', state.gameMonth, 'vs', replay.getCurrentState()!.gameMonth)
      console.log('  lastRoll:', state.lastRoll, 'vs', replay.getCurrentState()!.lastRoll)
      console.log('  ratRaceTurns:', state.ratRaceTurns, 'vs', replay.getCurrentState()!.ratRaceTurns)
      console.log('  fastTrackTurns:', state.fastTrackTurns, 'vs', replay.getCurrentState()!.fastTrackTurns)
      console.log('')
      console.log('player level:')
      console.log('  ratRacePosition:', ep.ratRacePosition, 'vs', rp.ratRacePosition)
      console.log('  fastTrackPosition:', ep.fastTrackPosition, 'vs', rp.fastTrackPosition)
      console.log('  unemploymentTurns:', ep.unemploymentTurns, 'vs', rp.unemploymentTurns)
      console.log('  hasInsurance:', ep.hasInsurance, 'vs', rp.hasInsurance)
      console.log('  hasUnemploymentInsurance:', ep.hasUnemploymentInsurance, 'vs', rp.hasUnemploymentInsurance)
      console.log('  doubleDiceNextTurn:', ep.doubleDiceNextTurn, 'vs', rp.doubleDiceNextTurn)
      console.log('  charityProtection:', ep.charityProtection, 'vs', rp.charityProtection)
      console.log('  financialStatement:', JSON.stringify(ep.financialStatement), 'vs', JSON.stringify(rp.financialStatement))
      console.log('')
      console.log('Engine cash:', ep.cash, 'Replay cash:', rp.cash)
      console.log('Engine ageMonths:', ep.ageMonths, 'Replay ageMonths:', rp.ageMonths)
      console.log('Engine savings:', ep.savings, 'Replay savings:', rp.savings)
      console.log('Engine cashFlow:', ep.cashFlow, 'Replay cashFlow:', rp.cashFlow)
      console.log('Engine passiveIncome:', ep.passiveIncome, 'Replay passiveIncome:', rp.passiveIncome)
      console.log('Engine totalIncome:', ep.totalIncome, 'Replay totalIncome:', rp.totalIncome)
      console.log('Engine totalExpenses:', ep.totalExpenses, 'Replay totalExpenses:', rp.totalExpenses)
      console.log('Engine liabilities:', ep.liabilities.length, 'Replay liabilities:', rp.liabilities.length)
      if (ep.liabilities.length > 0) {
        console.log('  Engine loan:', JSON.stringify(ep.liabilities[0]))
        console.log('  Replay loan:', JSON.stringify(rp.liabilities[0]))
      }
      console.log('Engine assets:', ep.assets.length, 'Replay assets:', rp.assets.length)
      console.log('Engine salary:', ep.salary, 'Replay salary:', rp.salary)
      console.log('Engine bankrupt:', ep.isBankrupt, 'Replay bankrupt:', rp.isBankrupt)
      console.log('Engine phase:', ep.phase, 'Replay phase:', rp.phase)
      console.log('Engine unemployed:', ep.isUnemployed, 'Replay unemployed:', rp.isUnemployed)
      console.log('Engine children:', ep.childrenCount, 'Replay children:', rp.childrenCount)
      
      console.log('\nEvents:')
      events.forEach((e, j) => console.log(`  ${j}: ${e.type}`))
    }

    expect(engineFinalHash).toBe(replayFinalHash)
  })
})