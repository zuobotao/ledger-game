import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GameHistoryRecord,
  GameHistoryDetail,
  GameHistoryPlayerSummary,
  Player,
  TransactionRecord,
  CardHistoryRecord,
  GameConfig,
  GameResult,
} from '@/types/game'
import { START_AGE } from '@/types/game'
import {
  getAllRecords,
  getRecordDetail,
  saveGameRecord,
  deleteRecord as dbDeleteRecord,
  clearAllRecords as dbClearAll,
  migrateFromLocalStorage,
} from '@/utils/historyDB'

function calcNetWorth(p: Player): number {
  const assetValue = p.assets.reduce(
    (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity,
    0,
  )
  const liabilityValue = p.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return p.cash + p.savings + assetValue - liabilityValue
}

function playerToSummary(
  p: Player,
  isWinner: boolean,
): GameHistoryPlayerSummary {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    careerName: p.career.name,
    isAI: p.isAI,
    isWinner,
    isBankrupt: p.isBankrupt,
    finalCash: p.cash,
    finalNetWorth: calcNetWorth(p),
    passiveIncome: p.passiveIncome,
    totalExpenses: p.totalExpenses,
    assetCount: p.assets.length,
  }
}

function calculateGrade(
  result: GameResult,
  totalTurns: number,
  netWorth: number,
  passiveIncome: number,
  totalExpenses: number,
  assetCount: number,
): 'S' | 'A' | 'B' | 'C' | 'D' {
  const age = START_AGE + Math.floor(totalTurns / 12)
  const passiveRatio = totalExpenses > 0 ? (passiveIncome / totalExpenses) * 100 : 0

  let score = 100

  // 用时评分
  if (result === 'victory') {
    if (age <= 40) score += 20
    else if (age <= 50) score += 15
    else if (age <= 60) score += 10
    else if (age <= 70) score += 5
    else score -= 10
  } else if (result === 'retirement') {
    if (netWorth > 10000000) score += 20
    else if (netWorth > 5000000) score += 15
    else if (netWorth > 1000000) score += 10
    else if (netWorth > 100000) score += 5
    else score -= 10
  }

  // 资产增长评分
  if (netWorth > 10000000) score += 20
  else if (netWorth > 5000000) score += 15
  else if (netWorth > 1000000) score += 10
  else if (netWorth > 100000) score += 5
  else score -= 10

  // 被动收入评分
  if (passiveRatio >= 200) score += 20
  else if (passiveRatio >= 100) score += 15
  else if (passiveRatio >= 50) score += 10
  else if (passiveRatio >= 20) score += 5
  else score -= 5

  // 资产多样性
  if (assetCount >= 8) score += 15
  else if (assetCount >= 5) score += 10
  else if (assetCount >= 3) score += 5
  else if (assetCount >= 1) score += 0
  else score -= 5

  // 破产场景
  if (result === 'bankrupt') {
    score = 30 + Math.floor(totalTurns / 10)
  }

  if (score >= 130) return 'S'
  if (score >= 110) return 'A'
  if (score >= 90) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

export const useGameHistoryStore = defineStore('gameHistory', () => {
  const records = ref<GameHistoryRecord[]>([])
  const currentDetail = ref<GameHistoryDetail | null>(null)
  const isLoaded = ref(false)
  const migratedCount = ref(0)

  // 从 SQLite 数据库加载
  async function loadHistory() {
    // 首次加载时尝试从 localStorage 迁移
    if (!isLoaded.value) {
      const count = await migrateFromLocalStorage()
      migratedCount.value = count
    }

    records.value = await getAllRecords()
    isLoaded.value = true
  }

  // 保存一局游戏的历史记录
  async function saveGame(params: {
    result: GameResult
    players: Player[]
    winnerId: string | null
    mainPlayerId: string
    config: GameConfig
    totalTurns: number
    ratRaceTurns: number
    fastTrackTurns: number
    startTime: number
    transactions: TransactionRecord[]
    cardHistory: CardHistoryRecord[]
    dreamName?: string
  }): Promise<string> {
    const {
      result,
      players,
      winnerId,
      mainPlayerId,
      config,
      totalTurns,
      ratRaceTurns,
      fastTrackTurns,
      startTime,
      transactions,
      cardHistory,
      dreamName,
    } = params

    // 找主玩家计算评级
    const mainPlayer = players.find((p) => p.id === mainPlayerId)
    let grade: 'S' | 'A' | 'B' | 'C' | 'D' | undefined
    if (mainPlayer) {
      grade = calculateGrade(
        result,
        totalTurns,
        calcNetWorth(mainPlayer),
        mainPlayer.passiveIncome,
        mainPlayer.totalExpenses,
        mainPlayer.assets.length,
      )
    }

    const id = await saveGameRecord({
      result,
      players: players as any[], // historyDB 内部会处理字段映射
      winnerId,
      mainPlayerId,
      config,
      totalTurns,
      ratRaceTurns,
      fastTrackTurns,
      startTime,
      transactions,
      cardHistory,
      dreamName,
      grade,
    })

    // 保存后刷新列表
    records.value = await getAllRecords()

    return id
  }

  // 获取某条记录的详情
  async function loadRecordDetail(id: string): Promise<GameHistoryDetail | null> {
    const detail = await getRecordDetail(id)
    currentDetail.value = detail
    return detail
  }

  // 删除一条记录
  async function deleteRecord(id: string) {
    await dbDeleteRecord(id)
    records.value = await getAllRecords()
    if (currentDetail.value?.id === id) {
      currentDetail.value = null
    }
  }

  // 清空所有记录
  async function clearAll() {
    await dbClearAll()
    records.value = []
    currentDetail.value = null
  }

  // 统计数据
  const stats = computed(() => {
    const total = records.value.length
    const victories = records.value.filter((r) => r.result === 'victory').length
    const bankruptcies = records.value.filter((r) => r.result === 'bankrupt').length
    const retirements = records.value.filter((r) => r.result === 'retirement').length
    const winRate = total > 0 ? (victories / total) * 100 : 0
    const avgTurns =
      total > 0
        ? records.value.reduce((sum, r) => sum + r.totalTurns, 0) / total
        : 0

    // 评级分布
    const gradeCount: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
    for (const r of records.value) {
      if (r.grade) gradeCount[r.grade]++
    }

    return {
      totalGames: total,
      victories,
      bankruptcies,
      retirements,
      winRate,
      avgTurns: Math.round(avgTurns),
      gradeCount,
    }
  })

  return {
    records,
    currentDetail,
    isLoaded,
    migratedCount,
    stats,
    loadHistory,
    saveGame,
    loadRecordDetail,
    deleteRecord,
    clearAll,
  }
})
