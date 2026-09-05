import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { TRADABLE_STOCKS } from '@/data/cards'
import type { GameConfig } from '@/types/game'

const STORAGE_KEY = 'ledger101-game-state'

// v2.4.1 P0-3：资本交易标的当前价格不得在长局/重载后无理由归零。
// 根因：saveState 未持久化 stockPrices，重载后价格表为空 → 交易价 $0 / undefined。
describe('v2.4.1 资本交易价格持久化', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(): GameConfig {
    return {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
  }

  function setupStore(): ReturnType<typeof useGameStore> {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    return store
  }

  it('startGame 为所有可交易标的初始化正价格（不出现 $0）', () => {
    const store = setupStore()
    for (const s of TRADABLE_STOCKS) {
      const p = store.stockPrices[s.symbol]
      expect(Number.isFinite(p)).toBe(true)
      expect(p).toBeGreaterThan(0)
    }
  })

  it('save → reload 保留价格表，不归零', () => {
    let store = setupStore()
    // 模拟长局中价格波动到 42
    store.stockPrices['NOVA'] = 42
    store.saveState()

    // 刷新：新建 pinia / store，自动 loadState
    setActivePinia(createPinia())
    store = useGameStore()
    expect(store.stockPrices['NOVA']).toBe(42)
    expect(store.stockPrices['MEDX']).toBeGreaterThan(0)
    expect(store.stockPrices['GRW']).toBeGreaterThan(0)
  })

  it('旧存档（无 stockPrices 字段）回填 basePrice，避免 $0', () => {
    const store = setupStore()
    store.saveState()
    // 模拟 v2.4.1 之前的旧存档：去掉 stockPrices 字段
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<string, unknown>
    delete raw.stockPrices
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))

    setActivePinia(createPinia())
    const reloaded = useGameStore()
    for (const s of TRADABLE_STOCKS) {
      expect(reloaded.stockPrices[s.symbol]).toBe(s.basePrice)
    }
  })
})