import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'

vi.mock('@/engine/turnEngine', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/engine/turnEngine')>(),
  rollDice: (count: number) => Array(count).fill(1),
}))

function start() {
  setActivePinia(createPinia())
  const store = useGameStore()
  store.setAutoAITrigger(false)
  store.startGame({ playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: false }, [
    { name: 'Test', colorId: 'red', careerId: 'doctor', dreamId: '' },
  ])
  store.currentPlayer!.cash = 0
  return store
}

function reload() {
  setActivePinia(createPinia())
  const store = useGameStore()
  store.setAutoAITrigger(false)
  return store
}

describe('pending payment survives reload', () => {
  beforeEach(() => localStorage.clear())

  for (const kind of ['doodad', 'story', 'charity', 'fast_track'] as const) {
    it(`settles ${kind} once after reload`, () => {
      const store = start()
      const player = store.currentPlayer!
      if (kind === 'doodad') {
        player.ratRacePosition = 8
        store.ratRaceRollDice()
      } else if (kind === 'story') {
        player.ratRacePosition = 0
        store.decks.story = [{ id: 'loss', title: 'Loss', category: 'jin', story: 'Loss', historicalNote: '', effect: { type: 'cash', amount: -500, description: 'Loss' } }]
        store.ratRaceRollDice()
      } else if (kind === 'charity') {
        player.ratRacePosition = 2
        store.ratRaceRollDice()
        store.acceptCharity()
      } else {
        player.phase = 'fast_track'
        store.phase = 'fast_track'
        player.fastTrackPosition = 5
        store.fastTrackRollDice()
      }
      expect(store.pendingAction.type).toBe('need_loan')
      const amount = Number(store.pendingAction.meta?.amount)
      const needed = Number(store.pendingAction.meta?.needed)
      const restored = reload()
      expect(restored.pendingAction.type).toBe('need_loan')
      expect(restored.confirmLoanForPending()).toBe(true)
      expect(restored.currentPlayer!.cash).toBe(needed - amount)
      expect(restored.pendingAction.type).not.toBe('need_loan')
      expect(restored.confirmLoanForPending()).toBe(false)
      if (kind === 'charity') {
        expect(restored.currentPlayer!.charityProtection).toBe(true)
        expect(restored.currentPlayer!.doubleDiceNextTurn).toBe(true)
      }
    })
  }
})
