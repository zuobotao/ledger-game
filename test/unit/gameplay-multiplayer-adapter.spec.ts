/**
 * Multiplayer Gameplay Adapter 验收测试（v2.4.3 §6）
 *
 * 验证：
 * - viewModel 从权威快照投影（财务 / FastTrack / 网络信息）
 * - 离线/未连接时命令返回 NETWORK_TIMEOUT
 * - 命令映射为协议 GameAction（意图提交，不本地执行规则）
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { createMultiplayerGameplayAdapter } from '@/gameplay/adapters/multiplayerGameplayAdapter'
import { isCommandOk } from '@/gameplay/types'
import type { GameState, Player } from '@/types/game'

function makePlayer(id: string, name: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name,
    color: '#007aff',
    career: { id: 'programmer', name: '程序员', salary: 6000, expenses: { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 0, child: 0 } },
    salary: 6000,
    passiveIncome: 500,
    totalIncome: 6500,
    expenses: { taxes: 0, mortgage: 0, schoolLoan: 0, carLoan: 0, creditCard: 0, other: 0, child: 0 },
    totalExpenses: 4000,
    cashFlow: 2500,
    cash: 10000,
    savings: 2000,
    assets: [],
    liabilities: [],
    ratRacePosition: 0,
    fastTrackPosition: 0,
    isUnemployed: false,
    unemploymentTurns: 0,
    hasInsurance: false,
    hasUnemploymentInsurance: false,
    childrenCount: 0,
    lastChildTurn: 0,
    doubleDiceNextTurn: false,
    charityProtection: false,
    ageMonths: 300,
    isAI: false,
    isBankrupt: false,
    financialStatement: {
      userTotalAssets: null, userTotalLiabilities: null, userNetWorth: null, userPassiveIncome: null,
      userTotalIncome: null, userTotalExpenses: null, userMonthlyCashFlow: null, userOtherAssets: null,
      userOtherLiabilities: null, userOtherExpenses: null, verified: {}, viewedAnswers: [],
    },
    financialSnapshots: [],
    phase: 'rat_race',
    ...over,
  }
}

function makeGameState(players: Player[]): GameState {
  return {
    players,
    currentPlayerIndex: 0,
    phase: 'rat_race',
    config: { playerCount: 2, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
    winnerId: null,
    turnStatus: 'idle',
    lastRoll: 0,
    turnNumber: 1,
    pendingAction: { type: null, card: null, message: '' },
    transactions: [],
    cardHistory: [],
  }
}

describe('Multiplayer Gameplay Adapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function setup() {
    const store = useMultiplayerStore()
    store.status = 'open'
    store.gameState = makeGameState([makePlayer('g1', '小明'), makePlayer('g2', '小红')])
    store.playerMap = { p1: 'g1', p2: 'g2' }
    store.session = { sessionId: 's1', playerId: 'p1', roomId: 'r1', token: 't1', nickname: '小明' }
    store.turn = { currentPlayerId: 'g1', pendingAction: null, allowedActions: ['roll_dice', 'end_turn'] }
    store.sessionInfo = { id: 'sess1', roomId: 'r1', seed: 1, version: '2.4.0', turnNumber: 1, currentPlayerId: 'g1', status: 'playing', startedAt: 0 }
    const adapter = createMultiplayerGameplayAdapter(store)
    return { store, adapter }
  }

  /** 单测环境无 RoomClient：用 stub dispatch 模拟「提交 + 服务器立即裁决回包」 */
  function stubServerAck(store: ReturnType<typeof useMultiplayerStore>, onDispatch?: (action: GameAction) => void) {
    store.dispatch = ((action: GameAction) => {
      onDispatch?.(action)
      store.pendingMyRequest = null
      store.lastResult = {
        sequence: 1,
        success: true,
        events: [],
        state: store.gameState!,
        turn: store.turn!,
        stateHash: 'h',
        financialDeltas: {},
      }
    }) as typeof store.dispatch
  }

  it('projects viewModel from authoritative snapshot', () => {
    const { store, adapter } = setup()
    const vm = adapter.viewModel.value
    expect(vm.network.mode).toBe('multiplayer')
    expect(vm.network.status).toBe('open')
    expect(vm.currentPlayer.name).toBe('小明')
    expect(vm.viewingPlayer.name).toBe('小明') // 我的座位
    expect(vm.isMyTurn).toBe(true)
    expect(vm.canAct).toBe(true)
    expect(vm.finance.cash).toBe(10000)
    expect(vm.finance.savings).toBe(2000)
    expect(vm.finance.netWorth).toBe(10000 + 2000 - 0)
    expect(vm.turnNumber).toBe(1)
  })

  it('isMyTurn false when other player acts', () => {
    const { store, adapter } = setup()
    // 服务器广播：gameState 与 turn 上下文同步切换（权威一致性）
    store.gameState!.currentPlayerIndex = 1
    store.turn!.currentPlayerId = 'g2'
    const vm = adapter.viewModel.value
    expect(vm.currentPlayer.name).toBe('小红')
    expect(vm.isMyTurn).toBe(false)
    expect(vm.canAct).toBe(false)
  })

  it('roomPaused blocks actions', () => {
    const { store, adapter } = setup()
    store.roomPaused = true
    const vm = adapter.viewModel.value
    expect(vm.canAct).toBe(false)
    expect(vm.network.roomPaused).toBe(true)
  })

  it('fastTrack projection uses viewing player financials', () => {
    const { store, adapter } = setup()
    store.gameState!.players[0]!.passiveIncome = 5000
    store.gameState!.players[0]!.totalExpenses = 4000
    const vm = adapter.viewModel.value
    expect(vm.fastTrack.eligible).toBe(true)
    expect(vm.fastTrack.gap).toBe(0)
    expect(vm.fastTrack.progress).toBe(1)
  })

  it('commands return NETWORK_TIMEOUT when not connected', async () => {
    setActivePinia(createPinia())
    const a = createMultiplayerGameplayAdapter(useMultiplayerStore())
    // 未连接 store：status idle、无游戏快照
    const r = await a.commands.rollDice()
    expect(isCommandOk(r)).toBe(false)
    if (!r.ok) expect(r.code).toBe('NETWORK_TIMEOUT')
  })

  it('connected commands dispatch and await server result', async () => {
    const { store, adapter } = setup()
    let submitted: GameAction | null = null
    stubServerAck(store, (action) => {
      submitted = action
    })
    const r = await adapter.commands.rollDice()
    expect(isCommandOk(r)).toBe(true)
    expect(submitted?.type).toBe('roll_dice')
  })

  it('unavailable multiplayer features return ACTION_NOT_ALLOWED', async () => {
    const { adapter } = setup()
    const ins = await adapter.commands.buyInsurance()
    expect(isCommandOk(ins)).toBe(false)
    const payoff = await adapter.commands.repayLiability({ liabilityId: 'x' })
    expect(isCommandOk(payoff)).toBe(false)
  })

  it('enter_fast_track maps to send_to_fast_track intent', async () => {
    const { store, adapter } = setup()
    let submitted: GameAction | null = null
    stubServerAck(store, (action) => {
      submitted = action
    })
    const r = await adapter.commands.resolvePendingAction({ kind: 'enter_fast_track' })
    expect(isCommandOk(r)).toBe(true)
    expect(submitted?.type).toBe('send_to_fast_track')
  })
})
