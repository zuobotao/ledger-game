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
  // v2.3 P0-2: 连续大机会（连续"兑现为大机会"的回合）
  bigTurns: number // 兑现为大机会的回合数
  maxBigRun: number // 最长连续大机会回合
  curBigRun: number // 当前连续数（累计用）
  bigRuns: number // 连续段数量（≥1 记为一段）
  bigRun2: number // 连续≥2 的段数
  bigRun3: number // 连续≥3 的段数
  bigRun4: number // 连续≥4 的段数
  // 大机会平均间隔（段之间）
  lastBigTurn: number
  bigGapSum: number
  // 参与方式
  oppFull: number
  oppFinance: number
  oppPartial: number
  oppNone: number
  // 瞬态：本回合是否兑现为大机会（用于连续统计）
  bigSeenThisTurn: boolean
  // v2.3 P0-3: Fast Track 可达性（被动收入 >= 总支出）
  ftReachTurn: number // 首次满足脱离 Rat Race 条件（被动收入>=总支出）的回合，0=未达成
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
// --legacy: 关闭 v2.3 OpportunitySelector（无冷却/无资金降级），用于前后对比
const LEGACY = process.argv.includes('--legacy')

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
    s.bigSeenThisTurn = isBig
    if (isBig) { s.bigSeen++; if (affordableCash) s.bigAffordableCash++ }
    else { s.smallSeen++; if (affordableCash) s.smallAffordableCash++ }
    if (s.turns <= 5) {
      s.first5Seen++
      if (affordableCash) s.first5AffordableCash++
      if (isBig) { s.first5BigSeen++; if (affordableCash) s.first5BigAffordable++ }
    }

    // v2.3 P0-2: 参与方式分布（full / partial / none）
    const funds = (player?.cash ?? 0) + (player?.savings ?? 0)
    if (upfront > 0 && funds >= upfront) s.oppFull++
    else if (upfront > 0 && funds >= upfront * 0.5) s.oppPartial++
    else s.oppNone++

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
    bigTurns: 0, maxBigRun: 0, curBigRun: 0, bigRuns: 0,
    bigRun2: 0, bigRun3: 0, bigRun4: 0,
    lastBigTurn: 0, bigGapSum: 0,
    oppFull: 0, oppFinance: 0, oppPartial: 0, oppNone: 0,
    bigSeenThisTurn: false,
    ftReachTurn: 0,
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
  if (LEGACY) store.setLegacyOpportunityMode(true)
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

    // v2.3 P0-2: 连续大机会统计（跨回合连续兑现为大机会）
    if (s.bigSeenThisTurn) {
      s.bigTurns++
      if (s.curBigRun === 0) {
        // 新连续段开始
        s.bigRuns++
        s.curBigRun = 1
      } else {
        s.curBigRun++
      }
      if (s.curBigRun > s.maxBigRun) s.maxBigRun = s.curBigRun
      // 段结束判断：若下一回合非大机会则归零（在 turn 首部处理）
    } else {
      if (s.curBigRun > 0) {
        // 段结束
        if (s.curBigRun >= 2) s.bigRun2++
        if (s.curBigRun >= 3) s.bigRun3++
        if (s.curBigRun >= 4) s.bigRun4++
        s.curBigRun = 0
      }
    }
    // 大机会间隔（连续段之间）
    if (s.bigSeenThisTurn && s.turns > 1 && s.lastBigTurn === 0 && s.bigTurns === 1) {
      // 第一次遇到，无间隔
    } else if (s.bigSeenThisTurn && s.lastBigTurn > 0) {
      s.bigGapSum += s.turns - s.lastBigTurn
    }
    if (s.bigSeenThisTurn) s.lastBigTurn = s.turns
    s.bigSeenThisTurn = false

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
      // v2.3 P0-3: Fast Track 可达性（被动收入 >= 总支出）
      if (s.ftReachTurn === 0 && pl.passiveIncome >= pl.totalExpenses) s.ftReachTurn = s.turns

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
  // 收尾：把可能未结算的尾段计入连续统计
  if (s.curBigRun > 0) {
    if (s.curBigRun >= 2) s.bigRun2++
    if (s.curBigRun >= 3) s.bigRun3++
    if (s.curBigRun >= 4) s.bigRun4++
    s.curBigRun = 0
  }
  return s
}

// 将 SimStats 的参与方式计数转换为占比
function share(r: SimStats, key: 'oppFull' | 'oppFinance' | 'oppPartial' | 'oppNone'): number {
  if (r.opportunitySeen === 0) return 0
  return r[key] / r.opportunitySeen
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
      // 机会分布
      smallShare: avg((s) => (s.opportunitySeen ? s.smallSeen / s.opportunitySeen : 0)),
      bigShare: avg((s) => (s.opportunitySeen ? s.bigSeen / s.opportunitySeen : 0)),
      bigAffordableCashRate: avg((s) => (s.bigSeen ? s.bigAffordableCash / s.bigSeen : 0)),
      smallAffordableCashRate: avg((s) => (s.smallSeen ? s.smallAffordableCash / s.smallSeen : 0)),
      // v2.3 P0-2: 参与方式分布
      participation: {
        full: avg((s) => share(s, 'oppFull')),
        finance: avg((s) => share(s, 'oppFinance')),
        partial: avg((s) => share(s, 'oppPartial')),
        none: avg((s) => share(s, 'oppNone')),
      },
      // v2.3 P0-2: 连续大机会
      bigPerGame: avg((s) => s.bigTurns),
      maxBigRun: avg((s) => s.maxBigRun),
      bigRuns: avg((s) => s.bigRuns),
      'bigRun2+': avg((s) => s.bigRun2),
      'bigRun3+': avg((s) => s.bigRun3),
      'bigRun4+': avg((s) => s.bigRun4),
      bigAvgInterval: avg((s) => (s.bigTurns > 1 && s.bigRuns >= 1 ? s.bigGapSum / Math.max(1, s.bigTurns - 1) : 0)),
      // v2.3 P0-3: Fast Track 可达性
      ftReachRate: avg((s) => (s.ftReachTurn > 0 ? 1 : 0)),
      ftReachTurn: avg((s) => (s.ftReachTurn > 0 ? s.ftReachTurn : 0)),
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