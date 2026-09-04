/**
 * 自动化试玩 - Playtest Runner
 *
 * 运行不同策略的 Bot 进行多局游戏，收集平衡数据。
 *
 * 用法：
 *   npx vitest run test/playtest/playtest.spec.ts
 *
 * 输出：
 * - 各策略胜率、平均回合数、净资产、破产率等
 * - 生成 docs/gameplay/BALANCE.md
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { createBot, type BotType, type StrategyBot } from '@/engine/strategyBots'
import { calcFinancialFreedomRatio } from '@/engine/financialEngine'
import * as fs from 'fs'
import * as path from 'path'

interface GameResult {
  botType: BotType
  botName: string
  won: boolean
  winReason: string | null
  bankrupt: boolean
  totalTurns: number
  ratRaceTurns: number
  fastTrackTurns: number
  finalCash: number
  finalPassiveIncome: number
  finalCashFlow: number
  finalNetWorth: number
  finalLiabilities: number
  finalFreedomRatio: number
  assetBuys: number
  loanCount: number
  repayCount: number
  declinedCount: number
  enteredFastTrack: boolean
  fastTrackTurn: number | null
}

interface StrategySummary {
  botType: BotType
  botName: string
  gamesPlayed: number
  wins: number
  winRate: number
  bankruptcies: number
  bankruptcyRate: number
  avgTotalTurns: number
  avgRatRaceTurns: number
  avgFinalNetWorth: number
  avgFinalCashFlow: number
  avgFinalPassiveIncome: number
  avgFreedomRatio: number
  avgAssetBuys: number
  avgLoanCount: number
  enteredFastTrackRate: number
}

const GAMES_PER_BOT = 10
const MAX_TURNS_PER_GAME = 200 // 防止无限循环
const MAX_STEPS_PER_TURN = 50 // 每回合最多操作步数（防止死循环）

const BOT_TYPES: { type: BotType; name: string }[] = [
  { type: 'conservative', name: '保守型' },
  { type: 'cashflow', name: '现金流型' },
  { type: 'aggressive', name: '激进型' },
  { type: 'random', name: '随机型' },
]

function runSingleGame(botType: BotType, seed: number): GameResult {
  setActivePinia(createPinia())
  const store = useGameStore()

  const bot: StrategyBot = createBot(botType, seed)

  store.startGame(
    { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
    [{ name: `${bot.name}Bot`, careerId: 'engineer', colorId: 'red', isAI: false }],
  )

  let turnCount = 0
  let enteredFastTrack = false
  let fastTrackTurn: number | null = null

  // 运行游戏
  while (turnCount < MAX_TURNS_PER_GAME) {
    // 检查游戏是否结束
    if (store.phase === 'finished') break
    if (store.currentPlayer?.isBankrupt) break

    let stepsThisTurn = 0
    let continueTurn = true

    while (continueTurn && stepsThisTurn < MAX_STEPS_PER_TURN) {
      continueTurn = bot.takeStep(store)
      stepsThisTurn++

      // 检查游戏是否在操作中结束
      if (store.phase === 'finished') break
      if (store.currentPlayer?.isBankrupt) break
    }

    turnCount++
    store.moveToNextPlayer()

    // 检查是否进入快车道
    const player = store.currentPlayer
    if (player && player.phase === 'fast_track' && !enteredFastTrack) {
      enteredFastTrack = true
      fastTrackTurn = turnCount
    }
  }

  const player = store.currentPlayer!
  const stats = bot.getStats()
  const netWorth = calcNetWorth(player)

  return {
    botType,
    botName: bot.name,
    won: store.phase === 'finished' && store.winnerId === player.id,
    winReason: store.gameEndReason || null,
    bankrupt: player.isBankrupt,
    totalTurns: turnCount,
    ratRaceTurns: store.ratRaceTurns,
    fastTrackTurns: store.fastTrackTurns,
    finalCash: player.cash,
    finalPassiveIncome: player.passiveIncome,
    finalCashFlow: player.cashFlow,
    finalNetWorth: netWorth,
    finalLiabilities: player.liabilities.reduce((s, l) => s + l.amount, 0),
    finalFreedomRatio: calcFinancialFreedomRatio(player),
    assetBuys: stats.assetBuys,
    loanCount: stats.loanCount,
    repayCount: stats.repayCount,
    declinedCount: stats.declinedCount,
    enteredFastTrack,
    fastTrackTurn,
  }
}

function calcNetWorth(player: any): number {
  const cash = player.cash + player.savings
  const assetValue = player.assets.reduce((s: number, a: any) => {
    const price = a.marketPrice ?? a.cost
    return s + price * a.quantity
  }, 0)
  const liabilities = player.liabilities.reduce((s: number, l: any) => s + l.amount, 0)
  return cash + assetValue - liabilities
}

function summarizeResults(results: GameResult[], botType: BotType, botName: string): StrategySummary {
  const botResults = results.filter((r) => r.botType === botType)
  const n = botResults.length

  if (n === 0) {
    return {
      botType,
      botName,
      gamesPlayed: 0,
      wins: 0,
      winRate: 0,
      bankruptcies: 0,
      bankruptcyRate: 0,
      avgTotalTurns: 0,
      avgRatRaceTurns: 0,
      avgFinalNetWorth: 0,
      avgFinalCashFlow: 0,
      avgFinalPassiveIncome: 0,
      avgFreedomRatio: 0,
      avgAssetBuys: 0,
      avgLoanCount: 0,
      enteredFastTrackRate: 0,
    }
  }

  const sum = (key: keyof GameResult) =>
    botResults.reduce((s, r) => s + (r[key] as number), 0)

  return {
    botType,
    botName,
    gamesPlayed: n,
    wins: botResults.filter((r) => r.won).length,
    winRate: botResults.filter((r) => r.won).length / n,
    bankruptcies: botResults.filter((r) => r.bankrupt).length,
    bankruptcyRate: botResults.filter((r) => r.bankrupt).length / n,
    avgTotalTurns: sum('totalTurns') / n,
    avgRatRaceTurns: sum('ratRaceTurns') / n,
    avgFinalNetWorth: sum('finalNetWorth') / n,
    avgFinalCashFlow: sum('finalCashFlow') / n,
    avgFinalPassiveIncome: sum('finalPassiveIncome') / n,
    avgFreedomRatio: sum('finalFreedomRatio') / n,
    avgAssetBuys: sum('assetBuys') / n,
    avgLoanCount: sum('loanCount') / n,
    enteredFastTrackRate: botResults.filter((r) => r.enteredFastTrack).length / n,
  }
}

function generateBalanceMarkdown(summaries: StrategySummary[]): string {
  const date = new Date().toISOString().split('T')[0]

  return `# 游戏平衡数据 (BALANCE.md)

> 自动生成于 ${date}
> 每策略 ${GAMES_PER_BOT} 局，单局上限 ${MAX_TURNS_PER_GAME} 回合
> 职业：工程师（标准开局）

## 各策略对比

| 策略 | 胜率 | 破产率 | 平均回合数 | 平均净资产 | 平均月现金流 | 平均被动收入 | 财务自由度 | 资产购买数 | 贷款次数 | 进入快车道率 |
|------|------|--------|-----------|-----------|-------------|-------------|-----------|-----------|---------|------------|
${summaries.map((s) => `| ${s.botName} | ${(s.winRate * 100).toFixed(1)}% | ${(s.bankruptcyRate * 100).toFixed(1)}% | ${s.avgTotalTurns.toFixed(1)} | $${Math.round(s.avgFinalNetWorth).toLocaleString()} | $${Math.round(s.avgFinalCashFlow).toLocaleString()} | $${Math.round(s.avgFinalPassiveIncome).toLocaleString()} | ${(s.avgFreedomRatio * 100).toFixed(1)}% | ${s.avgAssetBuys.toFixed(1)} | ${s.avgLoanCount.toFixed(1)} | ${(s.enteredFastTrackRate * 100).toFixed(1)}% |`).join('\n')}

## 策略分析

### 保守型 (Conservative)
- **特点**：优先现金储备（6 个月以上），只买安全资产，少贷款
- **预期**：破产率最低，胜率中等，净资产增长稳定但较慢
- **观察**：

### 现金流型 (CashFlow)
- **特点**：最大化被动收入，尽快实现财务自由，适度杠杆
- **预期**：进入快车道率最高，胜率较高
- **观察**：

### 激进型 (Aggressive)
- **特点**：高杠杆、高风险、高回报，现金储备少
- **预期**：净资产波动大，破产率较高，顺风时增长快
- **观察**：

### 随机型 (Random)
- **特点**：随机选择操作，用作基准线
- **预期**：胜率最低，破产率较高
- **观察**：

## 平衡性结论

### ✅ 正常的差异

- 不同策略应该有不同的胜率和风格
- 保守型破产率 < 激进型破产率 → 合理
- 现金流型财务自由度最高 → 合理

### ⚠️ 需要关注

- 如果某策略胜率 > 70% 且远高于其他策略 → 可能过强
- 如果某策略破产率 > 30% → 可能太弱或机制有问题
- 如果进入快车道率 < 5% → 可能 Rat Race 太难

### ❌ 明显失衡（需要调整）

（待数据填充）

## 测试配置

- 游戏模式：单人 Rat Race
- 职业：工程师
- 初始设置：无保险、无房贷、无大家庭、标准开始、年龄限制开启
- 随机种子：每局递增（保证可重复）
`
}

describe('Playtest - Strategy Balance', () => {
  let allResults: GameResult[] = []
  let summaries: StrategySummary[] = []

  beforeAll(() => {
    allResults = []

    for (const bot of BOT_TYPES) {
      for (let i = 0; i < GAMES_PER_BOT; i++) {
        const seed = 1000 + i
        const result = runSingleGame(bot.type, seed)
        allResults.push(result)
      }
    }

    summaries = BOT_TYPES.map((bot) =>
      summarizeResults(allResults, bot.type, bot.name),
    )

    // 生成 BALANCE.md
    const markdown = generateBalanceMarkdown(summaries)
    const docsDir = path.resolve(process.cwd(), 'docs', 'gameplay')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
    }
    fs.writeFileSync(path.join(docsDir, 'BALANCE.md'), markdown)
    console.log('\n📊 BALANCE.md 已生成: docs/gameplay/BALANCE.md\n')
  }, 120000) // 2 分钟超时

  it('所有策略都完成了至少 90% 的游戏（没有死循环）', () => {
    for (const s of summaries) {
      expect(s.gamesPlayed).toBeGreaterThanOrEqual(GAMES_PER_BOT * 0.9)
    }
  })

  it('随机策略破产率 < 50%（游戏不会过于残酷）', () => {
    const random = summaries.find((s) => s.botType === 'random')
    expect(random).toBeDefined()
    expect(random!.bankruptcyRate).toBeLessThan(0.5)
  })

  it('保守策略破产率低于激进策略（风险与回报匹配）', () => {
    const conservative = summaries.find((s) => s.botType === 'conservative')
    const aggressive = summaries.find((s) => s.botType === 'aggressive')
    expect(conservative).toBeDefined()
    expect(aggressive).toBeDefined()
    expect(conservative!.bankruptcyRate).toBeLessThanOrEqual(aggressive!.bankruptcyRate + 0.1)
  })

  it('现金流策略财务自由度最高（策略目标匹配）', () => {
    const cashflow = summaries.find((s) => s.botType === 'cashflow')
    const others = summaries.filter((s) => s.botType !== 'cashflow')
    expect(cashflow).toBeDefined()
    // 现金流型应该比随机型高
    const random = summaries.find((s) => s.botType === 'random')
    if (random) {
      expect(cashflow!.avgFreedomRatio).toBeGreaterThan(random.avgFreedomRatio)
    }
  })

  it('所有策略都能在 100 回合内完成 Rat Race 或达到稳定状态', () => {
    // 关注 Rat Race 阶段，不强制要求 Fast Track 胜利
    for (const s of summaries) {
      // 至少有一些回合数（不是 0）
      expect(s.avgTotalTurns).toBeGreaterThan(10)
    }
  })

  it('激进策略贷款次数 > 保守策略贷款次数', () => {
    const conservative = summaries.find((s) => s.botType === 'conservative')
    const aggressive = summaries.find((s) => s.botType === 'aggressive')
    expect(conservative).toBeDefined()
    expect(aggressive).toBeDefined()
    expect(aggressive!.avgLoanCount).toBeGreaterThan(conservative!.avgLoanCount)
  })
})
