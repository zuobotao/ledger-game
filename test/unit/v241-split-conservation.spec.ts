import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

// v2.4.1 P0-4：Split / Reverse Split 必须保持持仓市值近似守恒，
// 且多人下所有持有该标的的玩家持仓同步调整（而非仅当前玩家）。
describe('v2.4.1 拆股/合股市值守恒', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(playerCount: number): GameConfig {
    return {
      playerCount,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
  }

  function makeSplitCard(symbol: string, splitRatio: number) {
    return { title: `${symbol} ${splitRatio > 1 ? splitRatio + ':1' : '合股'}`, symbol, splitRatio }
  }

  it('2 拆 1（ratio 2）：数量翻倍、成本减半、市值近似守恒', () => {
    const store = useGameStore()
    store.startGame(createConfig(1), [
      { name: 'A', colorId: 'blue', careerId: 'programmer', dreamId: '' },
    ])
    const p = store.players[0]
    p.cash = 100000
    p.assets.push({
      id: 'n1',
      name: 'NOVA',
      type: 'stock',
      symbol: 'NOVA',
      quantity: 100,
      cost: 30,
      marketPrice: 30,
      cashFlow: 0,
    })
    store.stockPrices['NOVA'] = 30

    store.pendingAction = { type: 'opportunity', card: makeSplitCard('NOVA', 2) as never, message: '' } as never
    store.buyOpportunity()

    const h = store.players[0].assets.find((a) => a.symbol === 'NOVA')
    expect(h!.quantity).toBe(200)
    expect(h!.cost).toBe(15)
    expect(store.stockPrices['NOVA']).toBe(15)
    // 100×30 = 3000 ≈ 200×15 = 3000
    expect(h!.quantity * h!.marketPrice).toBe(100 * 30)
  })

  it('2 合 1（ratio 0.5，reverse split）：数量减半、成本翻倍、市值近似守恒', () => {
    const store = useGameStore()
    store.startGame(createConfig(1), [
      { name: 'A', colorId: 'blue', careerId: 'programmer', dreamId: '' },
    ])
    const p = store.players[0]
    p.cash = 100000
    p.assets.push({
      id: 'n1',
      name: 'NOVA',
      type: 'stock',
      symbol: 'NOVA',
      quantity: 100,
      cost: 30,
      marketPrice: 30,
      cashFlow: 0,
    })
    store.stockPrices['NOVA'] = 30

    store.pendingAction = { type: 'opportunity', card: makeSplitCard('NOVA', 0.5) as never, message: '' } as never
    store.buyOpportunity()

    const h = store.players[0].assets.find((a) => a.symbol === 'NOVA')
    expect(h!.quantity).toBe(50)
    expect(h!.cost).toBe(60)
    expect(store.stockPrices['NOVA']).toBe(60)
    expect(h!.quantity * h!.marketPrice).toBe(100 * 30)
  })

  it('多人：任一玩家触发拆分，所有玩家持仓同步调整并守恒', () => {
    const store = useGameStore()
    store.startGame(createConfig(2), [
      { name: 'A', colorId: 'blue', careerId: 'programmer', dreamId: '' },
      { name: 'B', colorId: 'red', careerId: 'doctor', dreamId: '' },
    ])
    const [p0, p1] = store.players
    p0.cash = p1.cash = 100000
    p0.assets.push({ id: 'n1', name: 'NOVA', type: 'stock', symbol: 'NOVA', quantity: 100, cost: 30, marketPrice: 30, cashFlow: 0 })
    // 对手 B 也持有 40 股 @ $30
    p1.assets.push({ id: 'n2', name: 'NOVA', type: 'stock', symbol: 'NOVA', quantity: 40, cost: 30, marketPrice: 30, cashFlow: 0 })
    store.stockPrices['NOVA'] = 30

    // 当前玩家 A 触发 2:1 拆分
    store.pendingAction = { type: 'opportunity', card: makeSplitCard('NOVA', 2) as never, message: '' } as never
    store.buyOpportunity()

    const h0 = p0.assets.find((a) => a.symbol === 'NOVA')!
    const h1 = p1.assets.find((a) => a.symbol === 'NOVA')!
    expect(h0.quantity).toBe(200)
    expect(h0.quantity * h0.marketPrice).toBe(100 * 30)
    // 对手持仓同样守恒：40×30=1200 → 80×15=1200
    expect(h1.quantity).toBe(80)
    expect(h1.cost).toBe(15)
    expect(h1.quantity * h1.marketPrice).toBe(40 * 30)
  })
})