import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

const config: GameConfig = {
  playerCount: 2,
  insurance: false,
  bigFamily: false,
  mortgage: false,
  fastStart: true,
  ageLimit: true,
}

describe('Multiplayer child gift', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function setup() {
    const store = useGameStore()
    store.startGame(config, [
      { name: '新手爸爸', colorId: 'red', careerId: 'cleaner', dreamId: '' },
      { name: '朋友', colorId: 'blue', careerId: 'doctor', dreamId: '' },
    ])
    const recipient = store.players[0]!
    const gifter = store.players[1]!
    store.setPending(
      'child_gift',
      '新生命降临',
      null,
      { recipientId: recipient.id, giftAmount: 100, eligiblePlayerIds: [gifter.id], respondedIds: [] },
      'major',
    )
    return { store, recipient, gifter }
  }

  it('transfers the fixed gift and closes the stage after the only responder', () => {
    const { store, recipient, gifter } = setup()
    const recipientCash = recipient.cash
    const gifterCash = gifter.cash

    expect(store.handleChildGift(gifter.id, recipient.id, true)).toBe(true)
    expect(gifter.cash).toBe(gifterCash - 100)
    expect(recipient.cash).toBe(recipientCash + 100)
    expect(store.pendingAction.type).toBeNull()
    expect(store.transactions.some((tx) => tx.description.includes('随礼给'))).toBe(true)
  })

  it('allows declining without changing either player cash', () => {
    const { store, recipient, gifter } = setup()
    const recipientCash = recipient.cash
    const gifterCash = gifter.cash

    expect(store.handleChildGift(gifter.id, recipient.id, false)).toBe(true)
    expect(gifter.cash).toBe(gifterCash)
    expect(recipient.cash).toBe(recipientCash)
    expect(store.pendingAction.type).toBeNull()
  })

  it('rejects duplicate responses', () => {
    const { store, recipient, gifter } = setup()
    expect(store.handleChildGift(gifter.id, recipient.id, false)).toBe(true)
    expect(store.handleChildGift(gifter.id, recipient.id, true)).toBe(false)
  })
})
