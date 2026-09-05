import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig, PlayerSetup } from '@/types/game'

describe('存款 / 取出（savings）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function startHighCash(): ReturnType<typeof useGameStore> {
    const store = useGameStore()
    const config: GameConfig = {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
    // top-lawyer 起始现金 6000，足够测试存入/取出
    const setup: PlayerSetup = { name: 'Lawyer', colorId: 'red', careerId: 'top-lawyer', dreamId: '' }
    const ok = store.startGame(config, [setup])
    expect(ok).toBe(true)
    return store
  }

  it('存款：现金减少、存款增加，金额一致', () => {
    const store = startHighCash()
    const player = store.players[0]
    const cash0 = player.cash
    const sav0 = player.savings
    const ok = store.depositToSavings(1000)
    expect(ok).toBe(true)
    expect(player.cash).toBe(cash0 - 1000)
    expect(player.savings).toBe(sav0 + 1000)
    expect(store.transactions.some((t) => t.type === 'savings_deposit')).toBe(true)
  })

  it('取出：存款减少、现金增加，金额一致', () => {
    const store = startHighCash()
    const player = store.players[0]
    store.depositToSavings(1000)
    const cash1 = player.cash
    const sav1 = player.savings
    const ok = store.withdrawFromSavings(600)
    expect(ok).toBe(true)
    expect(player.cash).toBe(cash1 + 600)
    expect(player.savings).toBe(sav1 - 600)
    expect(store.transactions.some((t) => t.type === 'savings_withdraw')).toBe(true)
  })

  it('边界：不能取出超过存款', () => {
    const store = startHighCash()
    const player = store.players[0]
    store.depositToSavings(500)
    const cash1 = player.cash
    const sav1 = player.savings
    const ok = store.withdrawFromSavings(600)
    expect(ok).toBe(false)
    expect(player.cash).toBe(cash1)
    expect(player.savings).toBe(sav1)
  })

  it('边界：不能存入超过现金（向上取百后仍超现金才拒绝）', () => {
    const store = startHighCash()
    const player = store.players[0]
    const overCash = Math.ceil((player.cash + 1) / 100) * 100
    const ok = store.depositToSavings(overCash)
    expect(ok).toBe(false)
    expect(player.savings).toBe(player.savings)
  })

  it('边界：低于最小存款额被拒绝', () => {
    const store = startHighCash()
    const player = store.players[0]
    const sav0 = player.savings
    const ok = store.depositToSavings(50)
    expect(ok).toBe(false)
    expect(player.savings).toBe(sav0)
  })

  it('净资产不变：存取仅改变资金位置', () => {
    const store = startHighCash()
    const player = store.players[0]
    const net0 = store.calcPlayerNetWorth(player)
    store.depositToSavings(1000)
    expect(store.calcPlayerNetWorth(player)).toBe(net0)
    store.withdrawFromSavings(800)
    expect(store.calcPlayerNetWorth(player)).toBe(net0)
  })
})

describe('保存 / 继续（v2.3）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('存入的存档包含 schemaVersion', () => {
    const store = start()
    store.saveState?.()
    const raw = localStorage.getItem('ledger101-game-state')!
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw).schemaVersion).toBeGreaterThanOrEqual(1)
  })

  it('开始游戏后 resumableGame 提供继续游戏摘要', () => {
    const store = start()
    const info = store.resumableGame
    expect(info).toBeTruthy()
    expect(info!.playerName).toBe('Lawyer')
    expect(info!.turnNumber).toBeGreaterThanOrEqual(1)
    expect(typeof info!.cash).toBe('number')
    expect(typeof info!.cashFlow).toBe('number')
  })

  it('更高 schemaVersion 的存档被安全丢弃（不做坏迁移）', () => {
    // 手工写入一个未来版本的存档
    const store = start()
    store.saveState?.()
    const key = 'ledger101-game-state'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.schemaVersion = 999
    localStorage.setItem(key, JSON.stringify(state))
    // 新建 pinia 触发 loadState
    setActivePinia(createPinia())
    const fresh = useGameStore()
    expect(fresh.resumableGame).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  function start(): ReturnType<typeof useGameStore> {
    const store = useGameStore()
    const config: GameConfig = {
      playerCount: 1, insurance: false, bigFamily: false,
      mortgage: false, fastStart: false, ageLimit: true,
    }
    const setup: PlayerSetup = { name: 'Lawyer', colorId: 'red', careerId: 'top-lawyer', dreamId: '' }
    store.startGame(config, [setup])
    return store
  }
})