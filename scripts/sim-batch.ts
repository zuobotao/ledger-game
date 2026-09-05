/**
 * 批量确定性对局模拟器（v2.3 经济曲线分析）
 *
 * 用途：跑 N 局完整老鼠圈对局，聚合"前期机会可负担性 / 第一次购买时机 / 生育频率 / 经济曲线"等指标，
 * 为机会卡梯度与孩子事件频率调整提供数据依据（先分析后修改）。
 *
 * 运行：npx tsx scripts/sim-batch.ts --runs=1040 --turns=40
 */

import './node-polyfill'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { CAREERS } from '@/data/careers'
import type { OpportunityCard } from '@/types/game'

interface SimStats {
  careerId: string
  turns: number
  // 机会可负担性
  opportunitySeen: number
  oppAffordableCash: number // 现金>=upfront
  oppAffordableFull: number // canPlayerAfford
  bigSeen: number
  smallSeen: number
  bigAffordableCash: number
  smallAffordableCash: number
  // 前 5 回合机会
  first5Seen: number
  first5AffordableCash: number
  first5BigSeen: number
  first5BigAffordable: number
  // 第一次里程碑（回合数，0=未达成）
  firstAssetTurn: number
  firstPassiveIncomeTurn: number
  firstPositiveCashFlowTurn: number
  firstBigBuyTurn: number
  // 连续买不起
  maxUnaffordableRun: number
  curUnaffordableRun: number
  totalUnaffordable: number
  // 孩子
  childTotal: number
  childByTurn10: number
  childFirstTurn: number
  maxConsecutiveChild: number
  curConsecutiveChild: number
  // 经济快照（回合10）
  cashT10: number
  assetT10: number
  liabilityT10: number
  cashflowT10: number
  // 全程平均
  avgCash: number
  sampleCount: number
}

const OUTPUT = process.argv.find((a) => a.startsWith('--runs='))
const RUNS = OUTPUT ? parseInt(OUTPUT.split('=')[1]!, 10) : 1040
const TURNS_ARG = process.argv.find((a) => a.startsWith('--turns='))
const MAX_TURNS = TURNS_ARG ? parseInt(TURNS_ARG.split('=')[1]!, 10) : 40

const SAMPLE_CAREERS = [
  'cleaner', 'janitor', 'nurse', 'engineer', 'teacher',
  'sales', 'doctor', 'lawyer', 'ceo', 'dentist',
]

function startGame(store: ReturnType<typeof useGameStore>, careerId: string): boolean {
  return store.startGame(
    { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
    [{ name: 'Sim', colorId: 'red', careerId, dreamId: '' }],
  )
}

// 解析机会卡的"首付/成本"
function upfrontCost(card: OpportunityCard | null | undefined): number {
  if (!card) return 0
  return card.downPayment !== undefined ? card.downPayment : card.cost
}

function resolvePending(store: ReturnType<typeof useGameStore>, s: SimStats): void {
  const pa = store.pendingAction
  if (!pa || !pa.type) return
  const t = pa.type
  const player = store.currentPlayer

  if (t === 'opportunity') {
    const card = pa.card as OpportunityCard | null
    const upfront = upfrontCost(card)
    const cash = player?.cash ?? 0
    const affordableCash = upfront > 0 && cash >= upfront
    const affordableFull = card ? store.canPlayerAfford(player!, upfront) : false
    const isBig = card?.size === 'big'

    s.opportunitySeen++
    if (isBig) { s.bigSeen++; if (affordableCash) s.bigAffordableCash++ }
    else { s.smallSeen++; if (affordableCash) s.smallAffordableCash++ }
    if (s.turns <= 5) {
      s.first5Seen++
      if (affordableCash) s.first5AffordableCash++
      if (isBig) { s.first5BigSeen++; if (affordableCash) s.first5BigAffordable++ }
    }

    if (affordableCash) {
      s.curUnaffordableRun = 0
      // 温和买入：买得起的就买 1 单位，推进游戏并产生首个购买里程碑
      const bought = store.buyOpportunity(1)
      if (bought) {
        if (s.firstAssetTurn === 0) s.firstAssetTurn = s.turns
        if (isBig && s.firstBigBuyTurn === 0) s.firstBigBuyTurn = s.turns
        // 股票交易卡买后可能仍触发后续；若未清空则 decline
        if (store.pendingAction?.type === 'opportunity') store.declineOpportunity()
      } else {
        store.declineOpportunity()
      }
    } else {
      s.totalUnaffordable++
      s.curUnaffordableRun++
      if (s.curUnaffordableRun > s.maxUnaffordableRun) s.maxUnaffordableRun = s.curUnaffordableRun
      store.declineOpportunity()
    }
    if (affordableFull) s.oppAffordableFull++
    if (affordableCash) s.oppAffordableCash++
    return
  }

  if (t === 'fast_track_opportunity') {
    const ok = store.buyOpportunity(1)
    if (!ok) store.declineOpportunity()
    return
  }

  switch (t) {
    case 'market':
    case 'stock_sell_opportunity':
    case 'fast_track_dream':
    case 'layoff':
      store.acknowledgeMessage()
      break
    case 'doodad':
      if ((store.currentPlayer?.cash ?? 0) > 0) store.dismissDoodad()
      else store.acceptCharity()
      break
    case 'charity':
      store.declineCharity()
      break
    case 'story':
      if (store.pendingAction?.type === 'need_loan') store.confirmLoanForPending()
      else store.dismissStoryCard()
      break
    case 'need_loan': {
      const ok = store.confirmLoanForPending()
      if (!ok) store.declareBankruptcy()
      break
    }
    case 'fast_track_stock_trading':
      store.closeStockTrading()
      break
    case 'bankrupt':
      store.resolveBankruptcy()
      break
    default:
      store.acknowledgeMessage()
      break
  }
}

function trackChildChange(store: ReturnType<typeof useGameStore>, s: SimStats): void {
  // 通过交易历史识别孩子增加（每次+1）
}

function runOne(careerId: string): SimStats {
  const s: SimStats = {
    careerId, turns: 0,
    opportunitySeen: 0, oppAffordableCash: 0, oppAffordableFull: 0,
    bigSeen: 0, smallSeen: 0, bigAffordableCash: 0, smallAffordableCash: 0,
    first5Seen: 0, first5AffordableCash: 0, first5BigSeen: 0, first5BigAffordable: 0,
    firstAssetTurn: 0, firstPassiveIncomeTurn: 0, firstPositiveCashFlowTurn: 0, firstBigBuyTurn: 0,
    maxUnaffordableRun: 0, curUnaffordableRun: 0, totalUnaffordable: 0,
    childTotal: 0, childByTurn10: 0, childFirstTurn: 0,
    maxConsecutiveChild: 0, curConsecutiveChild: 0,
    cashT10: 0, assetT10: 0, liabilityT10: 0, cashflowT10: 0,
    avgCash: 0, sampleCount: 0,
  }

  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useGameStore()
  if (!startGame(store, careerId)) return s

  let prevChildren = 0
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    if (store.gameOver) break
    s.turns = turn

    // 回合结束态清理
    if (store.turnStatus === 'resolving') store.endTurn()
    if (store.gameOver) break

    // 掷骰
    try {
      store.ratRaceRollDice()
    } catch {
      break
    }

    // 解析所有 pending action（防死循环）
    let cap = 0
    while (store.pendingAction?.type && cap < 40) {
      resolvePending(store, s)
      cap++
    }

    // 检测孩子变化
    const cc = store.currentPlayer?.childrenCount ?? 0
    if (cc > prevChildren) {
      const gained = cc - prevChildren
      s.childTotal += gained
      if (turn <= 10) s.childByTurn10 += gained
      if (s.childFirstTurn === 0) s.childFirstTurn = turn
      // 连续生育（同回合多次或相邻回合）
      s.curConsecutiveChild += gained
      if (s.curConsecutiveChild > s.maxConsecutiveChild) s.maxConsecutiveChild = s.curConsecutiveChild
    } else if (cc === prevChildren) {
      // 未生育：相邻回合连续由 lastChildTurn 判断
      const p = store.currentPlayer
      if (p && s.turns - (p.lastChildTurn || 0) > 1) s.curConsecutiveChild = 0
    }
    prevChildren = cc

    // 里程碑
    const pl = store.currentPlayer
    if (pl) {
      if (s.firstAssetTurn === 0 && pl.assets.length > 0) s.firstAssetTurn = s.turns
      if (s.firstPassiveIncomeTurn === 0 && pl.passiveIncome > 0) s.firstPassiveIncomeTurn = s.turns
      if (s.firstPositiveCashFlowTurn === 0 && pl.cashFlow > 0) s.firstPositiveCashFlowTurn = s.turns

      if (turn === 10) {
        s.cashT10 = pl.cash
        s.assetT10 = store.calcTotalAssetValue?.(pl.assets) ?? 0
        s.liabilityT10 = pl.liabilities.reduce((a, l) => a + l.amount, 0)
        s.cashflowT10 = pl.cashFlow
      }
      s.avgCash += pl.cash
      s.sampleCount++
    }

    // 结束回合
    if (store.turnStatus === 'resolving') store.endTurn()
  }
  if (s.sampleCount > 0) void (s.turns) // keep
  s.cashflowT10 = s.cashflowT10 // noop
  return s
}

function aggregate(): void {
  const results: SimStats[] = []
  for (let i = 0; i < RUNS; i++) {
    const career = SAMPLE_CAREERS[i % SAMPLE_CAREERS.length]!
    results.push(runOne(career))
  }

  const avg = (f: (s: SimStats) => number) => {
    const sum = results.reduce((a, r) => a + f(r), 0)
    return sum / results.length
  }

  const output = {
    runs: results.length,
    maxTurns: MAX_TURNS,
    careers: SAMPLE_CAREERS,
    // 平均每人
    perGame: {
      opportunitySeen: avg((s) => s.opportunitySeen),
      oppAffordableCashRate: avg((s) => (s.opportunitySeen ? s.oppAffordableCash / s.opportunitySeen : 0)),
      oppAffordableFullRate: avg((s) => (s.opportunitySeen ? s.oppAffordableFull / s.opportunitySeen : 0)),
      bigShare: avg((s) => (s.opportunitySeen ? s.bigSeen / s.opportunitySeen : 0)),
      bigAffordableCashRate: avg((s) => (s.bigSeen ? s.bigAffordableCash / s.bigSeen : 0)),
      smallAffordableCashRate: avg((s) => (s.smallSeen ? s.smallAffordableCash / s.smallSeen : 0)),
      // 前5回合
      first5Seen: avg((s) => s.first5Seen),
      first5AffordableRate: avg((s) => (s.first5Seen ? s.first5AffordableCash / s.first5Seen : 0)),
      first5BigShare: avg((s) => (s.first5Seen ? s.first5BigSeen / s.first5Seen : 0)),
      first5BigAffordableRate: avg((s) => (s.first5BigSeen ? s.first5BigAffordable / s.first5BigSeen : 0)),
      // 里程碑
      firstAssetTurn: avg((s) => s.firstAssetTurn),
      firstPassiveIncomeTurn: avg((s) => s.firstPassiveIncomeTurn),
      firstPositiveCashFlowTurn: avg((s) => s.firstPositiveCashFlowTurn),
      firstBigBuyTurn: avg((s) => s.firstBigBuyTurn),
      // 买不起
      maxUnaffordableRun: avg((s) => s.maxUnaffordableRun),
      unaffordableRate: avg((s) => (s.opportunitySeen ? s.totalUnaffordable / s.opportunitySeen : 0)),
      // 孩子
      childTotal: avg((s) => s.childTotal),
      childByTurn10: avg((s) => s.childByTurn10),
      childFirstTurn: avg((s) => s.childFirstTurn),
      maxConsecutiveChild: avg((s) => s.maxConsecutiveChild),
      // 经济快照
      cashT10: avg((s) => s.cashT10),
      assetT10: avg((s) => s.assetT10),
      liabilityT10: avg((s) => s.liabilityT10),
      cashflowT10: avg((s) => s.cashflowT10),
    },
  }

  console.log('=== v2.3 经济曲线 Simulation ===')
  console.log(JSON.stringify(output, null, 2))

  // 分职业关键指标
  const byCareer: Record<string, { opp: number; aff: number; big: number; child: number }> = {}
  for (const r of results) {
    const b = byCareer[r.careerId] ?? (byCareer[r.careerId] = { opp: 0, aff: 0, big: 0, child: 0 })
    b.opp += r.opportunitySeen
    b.aff += r.opportunitySeen ? r.oppAffordableCash : 0
    b.big += r.bigSeen
    b.child += r.childTotal
  }
  console.log('=== 分职业 ===')
  for (const [k, v] of Object.entries(byCareer)) {
    console.log(`${k}: opp=${v.opp} affordable=${v.aff} (${v.opp ? Math.round((v.aff / v.opp) * 100) : 0}%) big=${v.big} childAvg=${(v.child / (results.filter((r) => r.careerId === k).length || 1)).toFixed(1)}`)
  }
}

aggregate()