/**
 * Single Gameplay Adapter 验收测试（v2.4.3 §5）
 *
 * 验证：
 * - viewModel 投影正确（财务 / FastTrack / 回合 / 反馈）
 * - 命令映射到 store 方法（rollDice / buyOpportunity / 存款取款 / 贷款还款 / 保险）
 * - 错误标准化（false → CommandResult fail）
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { createSingleGameplayAdapter } from '@/gameplay/adapters/singleGameplayAdapter'
import { isCommandOk } from '@/gameplay/types'
import { calcPlayerNetWorth } from '@/engine/financialEngine'
import type { GameConfig } from '@/types/game'

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

describe('Single Gameplay Adapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function setup() {
    const store = useGameStore()
    store.startGame(createConfig(), [{ name: '小明', colorId: 'red', careerId: 'software-engineer', dreamId: '' }])
    const adapter = createSingleGameplayAdapter(store)
    return { store, adapter }
  }

  it('projects viewModel basics', () => {
    const { store, adapter } = setup()
    const vm = adapter.viewModel.value
    expect(vm.phase).toBe('rat_race')
    expect(vm.network.mode).toBe('single')
    expect(vm.currentPlayer.id).toBe(store.players[0]!.id)
    expect(vm.viewingPlayer.id).toBe(store.currentPlayer!.id)
    expect(vm.finance.cash).toBe(store.currentPlayer!.cash)
    expect(vm.finance.netWorth).toBe(calcPlayerNetWorth(store.currentPlayer!))
    expect(vm.fastTrack.eligible).toBe(false)
    expect(vm.isMyTurn).toBe(true)
    expect(vm.canAct).toBe(true)
  })

  it('projects message-only pending actions for landing-cell toast feedback', () => {
    const { store, adapter } = setup()
    store.setPending(null, '孩子数量已达上限。')

    expect(adapter.viewModel.value.pendingAction).toEqual(expect.objectContaining({
      type: null,
      message: '孩子数量已达上限。',
    }))
  })

  it('keeps the same feedback timestamp across unrelated state refreshes', () => {
    const { store, adapter } = setup()
    store.takeBankLoan(5000)

    const first = adapter.viewModel.value.lastAction
    expect(first?.timestamp).toBe(store.lastActionResult?.timestamp)

    store.lastRoll = 2
    const refreshed = adapter.viewModel.value.lastAction
    expect(refreshed).not.toBe(first)
    expect(refreshed?.timestamp).toBe(first?.timestamp)
  })

  it('rollDice succeeds on idle turn', async () => {
    const { adapter } = setup()
    const r = await adapter.commands.rollDice()
    expect(isCommandOk(r)).toBe(true)
  })

  it('buyOpportunity without pending action is rejected with code', async () => {
    const { adapter } = setup()
    const r = await adapter.commands.buyOpportunity({ quantity: 1 })
    expect(isCommandOk(r)).toBe(false)
    if (!r.ok) expect(r.code).toBe('ACTION_NOT_ALLOWED')
  })

  it('deposit / withdraw round-trip and boundary validation', async () => {
    const { store, adapter } = setup()
    const before = store.currentPlayer!.cash
    const dep = await adapter.commands.depositSavings({ amount: 500 })
    expect(isCommandOk(dep)).toBe(true)
    expect(store.currentPlayer!.cash).toBe(before - 500)
    expect(store.currentPlayer!.savings).toBe(500)

    const wd = await adapter.commands.withdrawSavings({ amount: 200 })
    expect(isCommandOk(wd)).toBe(true)
    expect(store.currentPlayer!.savings).toBe(300)

    // 取款不能超过存款
    const over = await adapter.commands.withdrawSavings({ amount: 99999 })
    expect(isCommandOk(over)).toBe(false)
  })

  it('takeLoan creates bank loan; repayLoan pays it back', async () => {
    const { store, adapter } = setup()
    const loan = await adapter.commands.takeLoan({ amount: 5000 })
    expect(isCommandOk(loan)).toBe(true)
    const player = store.currentPlayer!
    const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
    expect(bankLoan).toBeDefined()
    expect(bankLoan!.amount).toBe(5000)

    const repay = await adapter.commands.repayLoan({ liabilityId: bankLoan!.id, amount: 5000 })
    expect(isCommandOk(repay)).toBe(true)
    expect(store.currentPlayer!.liabilities.find((l) => l.id === bankLoan!.id)).toBeUndefined()
  })

  it('buyInsurance succeeds with sufficient cash and sets hasInsurance', async () => {
    const { store, adapter } = setup()
    store.currentPlayer!.cash = 1000000
    const r = await adapter.commands.buyInsurance()
    expect(isCommandOk(r)).toBe(true)
    expect(store.currentPlayer!.hasInsurance).toBe(true)
  })

  it('buyInsurance fails gracefully when cash insufficient', async () => {
    const { store, adapter } = setup()
    store.currentPlayer!.cash = 1
    const r = await adapter.commands.buyInsurance()
    expect(isCommandOk(r)).toBe(false)
    expect(store.currentPlayer!.hasInsurance).toBe(false)
  })

  it('charity resolve maps to acceptCharity', async () => {
    const { store, adapter } = setup()
    store.setPending('charity', '慈善机会', null)
    const r = await adapter.commands.resolvePendingAction({ kind: 'charity', accepted: true })
    expect(isCommandOk(r)).toBe(true)
    expect(store.currentPlayer!.charityProtection).toBe(true)
  })

  it('market resolve with sells calls sellAssetToMarket', async () => {
    const { store, adapter } = setup()
    const p = store.currentPlayer!
    const asset = { id: 'a1', name: '测试房', type: 'real_estate' as const, cost: 1000, cashFlow: 100, quantity: 2 }
    p.assets.push(asset)
    store.recalcPlayerFinancials(p)
    store.marketEvent = { id: 'm1', title: '房市利好', description: '', targetType: 'real_estate', multiplier: 2 }
    store.marketEventState = { card: store.marketEvent!, responderIndex: 0, respondedIds: [], phase: 'current_player' }
    store.setPending('market', '市场风云', store.marketEvent)

    const r = await adapter.commands.resolvePendingAction({ kind: 'market', sells: [{ assetId: 'a1', quantity: 1 }] })
    expect(isCommandOk(r)).toBe(true)
    expect(store.currentPlayer!.assets.find((a) => a.id === 'a1')!.quantity).toBe(1)
  })

  it('endTurn moves to next player', async () => {
    const { store, adapter } = setup()
    store.startGame(createConfig(), [
      { name: '小明', colorId: 'red', careerId: 'software-engineer', dreamId: '' },
      { name: 'AI', colorId: 'blue', careerId: 'doctor', dreamId: '', isAI: true },
    ])
    store.setPending('story', '故事', null)
    const r = await adapter.commands.endTurn()
    expect(isCommandOk(r)).toBe(true)
  })
})
