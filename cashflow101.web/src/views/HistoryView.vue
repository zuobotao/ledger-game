<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Trophy,
  TrendingDown,
  Clock,
  Calendar,
  Users,
  Trash2,
  TrendingUp,
  PieChart,
  BarChart3,
  Wallet,
  Sparkles,
  Lightbulb,
  Target,
  Briefcase,
  HeartHandshake,
  Baby,
  Landmark,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Filter,
} from 'lucide-vue-next'
import { useGameHistoryStore } from '@/stores/gameHistory'
import type { GameHistoryRecord, GameHistoryDetail, GameResult } from '@/types/game'
import { START_AGE } from '@/types/game'

const router = useRouter()
const historyStore = useGameHistoryStore()

// 视图状态
const selectedRecord = ref<GameHistoryDetail | null>(null)
const showDeleteConfirm = ref(false)
const filterResult = ref<GameResult | 'all'>('all')

// 筛选后的记录
const filteredRecords = computed(() => {
  if (filterResult.value === 'all') return historyStore.records
  return historyStore.records.filter((r) => r.result === filterResult.value)
})

// 展开的详情 section
const expandedSections = ref<Set<string>>(
  new Set(['overview', 'finance', 'trades', 'tips']),
)

function toggleSection(key: string) {
  if (expandedSections.value.has(key)) {
    expandedSections.value.delete(key)
  } else {
    expandedSections.value.add(key)
  }
}

// 格式化工具
function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function formatMoneyCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatDuration(start: number, end: number): string {
  const sec = Math.round((end - start) / 1000)
  if (sec < 60) return `${sec}秒`
  const min = Math.floor(sec / 60)
  const s = sec % 60
  if (min < 60) return `${min}分${s}秒`
  const hr = Math.floor(min / 60)
  const m = min % 60
  return `${hr}小时${m}分`
}

function getResultLabel(result: GameResult): string {
  switch (result) {
    case 'victory': return '财务自由'
    case 'bankrupt': return '破产'
    case 'retirement': return '退休结算'
  }
}

function getResultColor(result: GameResult): string {
  switch (result) {
    case 'victory': return 'text-amber-400'
    case 'bankrupt': return 'text-destructive'
    case 'retirement': return 'text-blue-400'
  }
}

function getResultBg(result: GameResult): string {
  switch (result) {
    case 'victory': return 'bg-amber-500/15 border-amber-500/30'
    case 'bankrupt': return 'bg-destructive/15 border-destructive/30'
    case 'retirement': return 'bg-blue-500/15 border-blue-500/30'
  }
}

function getGradeColor(grade?: string): string {
  switch (grade) {
    case 'S': return 'text-amber-400'
    case 'A': return 'text-purple-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-green-400'
    case 'D': return 'text-muted-foreground'
    default: return 'text-muted-foreground'
  }
}

function getGradeBg(grade?: string): string {
  switch (grade) {
    case 'S': return 'bg-amber-500/20 border-amber-400/40'
    case 'A': return 'bg-purple-500/20 border-purple-400/40'
    case 'B': return 'bg-blue-500/20 border-blue-400/40'
    case 'C': return 'bg-green-500/20 border-green-400/40'
    case 'D': return 'bg-muted/50 border-border'
    default: return 'bg-muted/50 border-border'
  }
}

// 查看详情
async function viewDetail(record: GameHistoryRecord) {
  const detail = await historyStore.loadRecordDetail(record.id)
  if (detail) {
    selectedRecord.value = detail
    expandedSections.value = new Set(['overview', 'finance', 'trades', 'tips'])
  } else {
    // 即使没有详情也显示基本信息
    selectedRecord.value = {
      ...record,
      mainPlayerTransactions: [],
      mainPlayerCardHistory: [],
      mainPlayerSnapshots: [],
    }
  }
}

function closeDetail() {
  selectedRecord.value = null
}

async function confirmDelete() {
  if (selectedRecord.value) {
    await historyStore.deleteRecord(selectedRecord.value.id)
    selectedRecord.value = null
    showDeleteConfirm.value = false
  }
}

function goBack() {
  router.push('/')
}

// 主玩家摘要
const mainPlayerSummary = computed(() => {
  if (!selectedRecord.value) return null
  return selectedRecord.value.players.find(
    (p) => p.id === selectedRecord.value!.mainPlayerId,
  ) ?? null
})

// 年龄
const finalAge = computed(() => {
  if (!selectedRecord.value) return { years: 0, months: 0 }
  const turns = selectedRecord.value.totalTurns
  return {
    years: START_AGE + Math.floor(turns / 12),
    months: turns % 12,
  }
})

// ========== 财务分析 ==========
const stockTradeStats = computed(() => {
  if (!selectedRecord.value) return null
  const txs = selectedRecord.value.mainPlayerTransactions
  const buys = txs.filter((t) => t.type === 'stock_buy')
  const sells = txs.filter((t) => t.type === 'stock_sell')
  const totalCostBasis = sells.reduce((sum, t) => sum + (t.costBasis ?? 0), 0)
  const totalSellRevenue = sells.reduce((sum, t) => sum + t.amount, 0)
  const totalPnL = totalSellRevenue - totalCostBasis
  const winTrades = sells.filter((t) => t.costBasis !== undefined && t.amount > t.costBasis).length
  const winRate = sells.length > 0 ? (winTrades / sells.length) * 100 : 0
  return {
    buyCount: buys.length,
    sellCount: sells.length,
    totalPnL,
    winRate,
  }
})

const realEstateStats = computed(() => {
  if (!selectedRecord.value) return null
  const txs = selectedRecord.value.mainPlayerTransactions
  const buys = txs.filter((t) => t.type === 'real_estate_buy')
  const sells = txs.filter((t) => t.type === 'real_estate_sell')
  const totalCostBasis = sells.reduce((sum, t) => sum + (t.costBasis ?? 0), 0)
  const totalSellRevenue = sells.reduce((sum, t) => sum + t.amount, 0)
  return {
    buyCount: buys.length,
    sellCount: sells.length,
    totalPnL: totalSellRevenue - totalCostBasis,
  }
})

const businessStats = computed(() => {
  if (!selectedRecord.value) return null
  const txs = selectedRecord.value.mainPlayerTransactions
  const buys = txs.filter((t) => t.type === 'business_buy')
  const mp = mainPlayerSummary.value
  return {
    buyCount: buys.length,
    passiveIncome: mp?.passiveIncome ?? 0,
  }
})

// 选择分析
const choiceAnalysis = computed(() => {
  if (!selectedRecord.value) return null
  const history = selectedRecord.value.mainPlayerCardHistory
  const opportunityCards = history.filter((h) => h.type === 'opportunity')
  let bigCount = 0
  let smallCount = 0
  for (const c of opportunityCards) {
    if (c.cardId.startsWith('big_') || c.cardId.includes('big')) {
      bigCount++
    } else {
      smallCount++
    }
  }
  const txs = selectedRecord.value.mainPlayerTransactions
  const charityCount = txs.filter((t) => t.type === 'charity').length
  const loanCount = txs.filter((t) => t.type === 'bank_loan').length
  const layoffCount = txs.filter((t) => t.type === 'layoff').length
  return {
    smallOpportunities: smallCount || opportunityCards.length,
    bigOpportunities: bigCount,
    charityCount,
    loanCount,
    layoffCount,
  }
})

// 财商建议
const financialTips = computed(() => {
  const tips: { icon: string; title: string; content: string; type: 'success' | 'warning' | 'info' }[] = []
  const mp = mainPlayerSummary.value
  if (!mp || !selectedRecord.value) return tips

  const passiveRatio = mp.totalExpenses > 0 ? (mp.passiveIncome / mp.totalExpenses) * 100 : 0
  const stockStats = stockTradeStats.value
  const record = selectedRecord.value

  // 1. 主要靠工资收入
  if (passiveRatio < 20) {
    tips.push({
      icon: '💼',
      title: '增加被动收入',
      content: '你目前主要依靠工资收入。财务自由的关键是让钱为你工作。学习投资知识，逐步建立股票、房产或企业等被动收入来源。',
      type: 'warning',
    })
  }

  // 2. 股票交易频繁但亏损
  if (stockStats && stockStats.sellCount >= 3 && stockStats.totalPnL < 0) {
    tips.push({
      icon: '📉',
      title: '学习价值投资',
      content: '你的股票交易较为频繁但总体亏损。建议减少投机性交易，学习价值投资理念，关注企业基本面，长期持有优质资产。',
      type: 'warning',
    })
  }

  // 3. 资产配置单一
  if (mp.assetCount <= 1 && mp.finalNetWorth > 10000) {
    tips.push({
      icon: '📊',
      title: '分散投资降低风险',
      content: '你的资产配置过于单一。建议学习资产配置理念，将资金分散到不同类型的资产（股票、房产、企业等），降低整体风险。',
      type: 'info',
    })
  }

  // 4. 破产分析
  if (record.result === 'bankrupt') {
    if (choiceAnalysis.value?.layoffCount && choiceAnalysis.value.layoffCount > 0) {
      tips.push({
        icon: '⚠️',
        title: '建立应急基金',
        content: '失业是导致破产的重要原因。在现实生活中，建议至少储备3-6个月生活费的应急基金，并考虑购买失业保险。',
        type: 'warning',
      })
    }
    if (choiceAnalysis.value?.loanCount && choiceAnalysis.value.loanCount > 2) {
      tips.push({
        icon: '💳',
        title: '谨慎使用杠杆',
        content: '过度借贷是财务危机的常见原因。使用杠杆前要充分评估风险，确保有足够的现金流来偿还债务。',
        type: 'warning',
      })
    }
    tips.push({
      icon: '💪',
      title: '失败是最好的老师',
      content: '这次破产是一次宝贵的学习经历。分析你哪里出了问题，总结经验教训。现实中的财务自由之路也充满挑战，关键是从失败中学习并持续进步。',
      type: 'success',
    })
  }

  // 5. 很快实现财务自由
  if (record.result === 'victory' && record.totalTurns < 30) {
    tips.push({
      icon: '🏆',
      title: '出色的财务规划能力',
      content: '你在很短的时间内就实现了财务自由！这展示了优秀的财务规划能力和投资眼光。继续保持这种投资思维。',
      type: 'success',
    })
  }

  // 6. 高被动收入
  if (passiveRatio >= 100) {
    tips.push({
      icon: '💰',
      title: '被动收入已覆盖支出',
      content: '恭喜！你的被动收入已经超过了总支出，达到了财务自由的标准。这是富人思维的核心体现——让钱为你工作。',
      type: 'success',
    })
  }

  // 如果没有任何建议
  if (tips.length === 0) {
    tips.push({
      icon: '🌟',
      title: '继续学习成长',
      content: '你的财务状况整体不错。继续学习财商知识，提升投资能力，让资产持续增值。记住：财务自由是一个旅程，不是终点。',
      type: 'info',
    })
  }

  return tips.slice(0, 5)
})

// 现金流走势迷你图
const cashFlowSparkline = computed(() => {
  if (!selectedRecord.value) return null
  const snapshots = selectedRecord.value.mainPlayerSnapshots.slice(-20)
  if (snapshots.length < 2) return null

  const width = 300
  const height = 60
  const padding = 4
  const values = snapshots.map((s) => s.monthlyCashFlow)
  const maxVal = Math.max(...values.map(Math.abs), 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)))
  const scaledMax = Math.ceil(maxVal / magnitude) * magnitude

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2)
    const y = height / 2 - (v / scaledMax) * (height / 2 - padding)
    return { x, y }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  return { path, width, height }
})

onMounted(() => {
  historyStore.loadHistory()
})
</script>

<template>
  <div class="history-page">
    <!-- 顶部导航 -->
    <header class="page-header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
        <span>返回首页</span>
      </button>
      <h1 class="page-title">历史对局</h1>
      <div class="header-spacer" />
    </header>

    <main class="page-content">
      <!-- 统计概览 -->
      <section class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon total">
            <Trophy class="h-5 w-5" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ historyStore.stats.totalGames }}</div>
            <div class="stat-label">总局数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon victory">
            <TrendingUp class="h-5 w-5" />
          </div>
          <div class="stat-info">
            <div class="stat-value text-amber-400">{{ historyStore.stats.victories }}</div>
            <div class="stat-label">财务自由</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bankrupt">
            <TrendingDown class="h-5 w-5" />
          </div>
          <div class="stat-info">
            <div class="stat-value text-destructive">{{ historyStore.stats.bankruptcies }}</div>
            <div class="stat-label">破产</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon rate">
            <PieChart class="h-5 w-5" />
          </div>
          <div class="stat-info">
            <div class="stat-value text-primary">{{ historyStore.stats.winRate.toFixed(0) }}%</div>
            <div class="stat-label">财务自由率</div>
          </div>
        </div>
      </section>

      <!-- 评级分布 -->
      <section v-if="historyStore.stats.totalGames > 0" class="grade-distribution">
        <h3 class="section-title">评级分布</h3>
        <div class="grade-bars">
          <div
            v-for="grade in ['S', 'A', 'B', 'C', 'D']"
            :key="grade"
            class="grade-bar-item"
          >
            <span :class="['grade-label', getGradeColor(grade)]">{{ grade }}</span>
            <div class="grade-bar-wrapper">
              <div
                :class="['grade-bar-fill', `grade-${grade.toLowerCase()}`]"
                :style="{
                  width: historyStore.stats.totalGames > 0
                    ? `${(historyStore.stats.gradeCount[grade] / historyStore.stats.totalGames) * 100}%`
                    : '0%',
                }"
              />
            </div>
            <span class="grade-count">{{ historyStore.stats.gradeCount[grade] }}</span>
          </div>
        </div>
      </section>

      <!-- 筛选 -->
      <section class="filter-section">
        <div class="filter-label">
          <Filter class="h-4 w-4" />
          <span>筛选</span>
        </div>
        <div class="filter-buttons">
          <button
            :class="['filter-btn', { active: filterResult === 'all' }]"
            @click="filterResult = 'all'"
          >
            全部
          </button>
          <button
            :class="['filter-btn', { active: filterResult === 'victory' }]"
            @click="filterResult = 'victory'"
          >
            财务自由
          </button>
          <button
            :class="['filter-btn', { active: filterResult === 'retirement' }]"
            @click="filterResult = 'retirement'"
          >
            退休结算
          </button>
          <button
            :class="['filter-btn', { active: filterResult === 'bankrupt' }]"
            @click="filterResult = 'bankrupt'"
          >
            破产
          </button>
        </div>
      </section>

      <!-- 历史列表 -->
      <section class="history-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <div class="empty-icon">
            <Clock class="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 class="empty-title">暂无对局记录</h3>
          <p class="empty-desc">完成一局游戏后，记录会自动保存在这里</p>
        </div>

        <div
          v-for="record in filteredRecords"
          :key="record.id"
          class="history-card"
          @click="viewDetail(record)"
        >
          <div class="card-left">
            <div :class="['result-badge', getResultBg(record.result)]">
              <Trophy v-if="record.result === 'victory'" :class="['h-5 w-5', getResultColor(record.result)]" />
              <TrendingDown v-else-if="record.result === 'bankrupt'" :class="['h-5 w-5', getResultColor(record.result)]" />
              <Clock v-else :class="['h-5 w-5', getResultColor(record.result)]" />
            </div>
            <div class="card-info">
              <div class="card-title">
                <span :class="getResultColor(record.result)">{{ getResultLabel(record.result) }}</span>
                <span v-if="record.grade" :class="['grade-chip', getGradeBg(record.grade), getGradeColor(record.grade)]">
                  {{ record.grade }}
                </span>
              </div>
              <div class="card-meta">
                <Calendar class="h-3 w-3" />
                <span>{{ formatDate(record.endTime) }}</span>
                <span class="meta-sep">·</span>
                <Clock class="h-3 w-3" />
                <span>{{ formatDuration(record.startTime, record.endTime) }}</span>
              </div>
              <div class="card-submeta">
                <Users class="h-3 w-3" />
                <span>{{ record.playerCount }} 人 · {{ record.aiCount }} AI</span>
                <span class="meta-sep">·</span>
                <span>{{ record.totalTurns }} 回合</span>
                <span v-if="record.dreamName" class="meta-sep">·</span>
                <span v-if="record.dreamName" class="dream-name">{{ record.dreamName }}</span>
              </div>
            </div>
          </div>
          <div class="card-right">
            <div class="net-worth" :class="mainPlayerSummary?.finalNetWorth ?? 0 >= 0 ? 'text-success' : 'text-destructive'">
              {{ formatMoneyCompact(record.players.find(p => p.id === record.mainPlayerId)?.finalNetWorth ?? 0) }}
            </div>
            <div class="net-worth-label">最终净值</div>
          </div>
        </div>
      </section>
    </main>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="selectedRecord" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-modal">
          <!-- 头部 -->
          <div :class="['detail-header', selectedRecord.result]">
            <div class="header-glow" aria-hidden="true" />
            <button class="close-btn" @click="closeDetail" title="关闭">
              <X class="h-5 w-5" />
            </button>
            <div :class="['header-icon', getResultBg(selectedRecord.result)]">
              <Trophy v-if="selectedRecord.result === 'victory'" :class="['h-8 w-8', getResultColor(selectedRecord.result)]" />
              <TrendingDown v-else-if="selectedRecord.result === 'bankrupt'" :class="['h-8 w-8', getResultColor(selectedRecord.result)]" />
              <Clock v-else :class="['h-8 w-8', getResultColor(selectedRecord.result)]" />
            </div>
            <h1 class="header-title">
              <span :class="getResultColor(selectedRecord.result)">{{ getResultLabel(selectedRecord.result) }}</span>
            </h1>
            <p class="header-subtitle">{{ formatDate(selectedRecord.endTime) }}</p>
            <div class="header-tags">
              <span class="tag">
                <Clock class="h-3 w-3" />
                {{ formatDuration(selectedRecord.startTime, selectedRecord.endTime) }}
              </span>
              <span class="tag">
                <Users class="h-3 w-3" />
                {{ selectedRecord.playerCount }}人
              </span>
              <span v-if="selectedRecord.grade" :class="['tag grade-tag', getGradeBg(selectedRecord.grade), getGradeColor(selectedRecord.grade)]">
                评级 {{ selectedRecord.grade }}
              </span>
            </div>
          </div>

          <!-- 内容 -->
          <div class="detail-content">
            <!-- 1. 概览 -->
            <section class="summary-section">
              <button class="section-header" @click="toggleSection('overview')">
                <div class="section-title">
                  <Sparkles class="h-4 w-4 text-primary" />
                  <span>概览</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="{ 'rotate-180': expandedSections.has('overview') }"
                />
              </button>
              <div v-show="expandedSections.has('overview')" class="section-body">
                <!-- 玩家排名 -->
                <div class="ranking-list">
                  <div
                    v-for="(p, idx) in [...selectedRecord.players].sort((a, b) => b.finalNetWorth - a.finalNetWorth)"
                    :key="p.id"
                    class="ranking-item"
                    :class="{
                      winner: idx === 0,
                      'is-main': p.id === selectedRecord.mainPlayerId,
                    }"
                  >
                    <div class="ranking-rank">
                      <Trophy v-if="idx === 0" class="h-5 w-5 text-amber-400" />
                      <span v-else class="rank-number">{{ idx + 1 }}</span>
                    </div>
                    <div class="ranking-player">
                      <span
                        class="player-color-dot"
                        :style="{ backgroundColor: p.color }"
                      />
                      <span class="player-name">{{ p.name }}</span>
                      <span v-if="p.isAI" class="ai-badge">AI</span>
                      <span v-if="p.id === selectedRecord.mainPlayerId" class="current-badge">你</span>
                    </div>
                    <div class="ranking-career">{{ p.careerName }}</div>
                    <div
                      class="ranking-networth"
                      :class="p.finalNetWorth >= 0 ? 'text-success' : 'text-destructive'"
                    >
                      {{ formatMoneyCompact(p.finalNetWorth) }}
                    </div>
                  </div>
                </div>

                <!-- 年龄 + 关键指标 -->
                <div v-if="mainPlayerSummary" class="age-grade-section">
                  <div class="age-display">
                    <Calendar class="h-4 w-4 text-muted-foreground" />
                    <span class="age-label">最终年龄</span>
                    <span class="age-value">{{ finalAge.years }} 岁 {{ finalAge.months }} 月</span>
                  </div>
                </div>

                <div class="stats-grid">
                  <div class="stat-mini">
                    <Clock class="h-4 w-4 text-muted-foreground" />
                    <div class="stat-mini-value">{{ selectedRecord.totalTurns }}</div>
                    <div class="stat-mini-label">总回合</div>
                  </div>
                  <div class="stat-mini">
                    <Wallet class="h-4 w-4 text-muted-foreground" />
                    <div class="stat-mini-value text-success">
                      {{ formatMoneyCompact(mainPlayerSummary?.finalCash ?? 0) }}
                    </div>
                    <div class="stat-mini-label">现金</div>
                  </div>
                  <div class="stat-mini">
                    <TrendingUp class="h-4 w-4 text-muted-foreground" />
                    <div
                      class="stat-mini-value"
                      :class="(mainPlayerSummary?.finalNetWorth ?? 0) >= 0 ? 'text-success' : 'text-destructive'"
                    >
                      {{ formatMoneyCompact(mainPlayerSummary?.finalNetWorth ?? 0) }}
                    </div>
                    <div class="stat-mini-label">净值</div>
                  </div>
                  <div class="stat-mini">
                    <BarChart3 class="h-4 w-4 text-muted-foreground" />
                    <div class="stat-mini-value text-primary">
                      +{{ formatMoneyCompact(mainPlayerSummary?.passiveIncome ?? 0) }}
                    </div>
                    <div class="stat-mini-label">月被动收入</div>
                  </div>
                </div>

                <!-- 阶段分布 -->
                <div class="phase-breakdown">
                  <div class="phase-item">
                    <span class="phase-label">原始资本积累</span>
                    <span class="phase-value">{{ selectedRecord.ratRaceTurns }} 回合</span>
                  </div>
                  <div v-if="selectedRecord.fastTrackTurns > 0" class="phase-item">
                    <span class="phase-label">资本游戏</span>
                    <span class="phase-value">{{ selectedRecord.fastTrackTurns }} 回合</span>
                  </div>
                </div>

                <!-- 现金流走势 -->
                <div v-if="cashFlowSparkline" class="sparkline-container">
                  <div class="sparkline-label">
                    <span>月现金流走势</span>
                  </div>
                  <svg
                    :width="'100%'"
                    :height="cashFlowSparkline.height"
                    :viewBox="`0 0 ${cashFlowSparkline.width} ${cashFlowSparkline.height}`"
                    preserveAspectRatio="none"
                  >
                    <path
                      :d="cashFlowSparkline.path"
                      fill="none"
                      stroke="var(--color-primary)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </section>

            <!-- 2. 财务分析 -->
            <section class="summary-section">
              <button class="section-header" @click="toggleSection('finance')">
                <div class="section-title">
                  <PieChart class="h-4 w-4 text-primary" />
                  <span>财务分析</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="{ 'rotate-180': expandedSections.has('finance') }"
                />
              </button>
              <div v-show="expandedSections.has('finance')" class="section-body">
                <div v-if="mainPlayerSummary" class="metrics-grid">
                  <div class="metric-card">
                    <div class="metric-label">被动收入/支出比率</div>
                    <div
                      class="metric-value"
                      :class="mainPlayerSummary.totalExpenses > 0 && (mainPlayerSummary.passiveIncome / mainPlayerSummary.totalExpenses) >= 1 ? 'text-success' : 'text-warning'"
                    >
                      {{ mainPlayerSummary.totalExpenses > 0 ? ((mainPlayerSummary.passiveIncome / mainPlayerSummary.totalExpenses) * 100).toFixed(1) : 0 }}%
                    </div>
                    <div class="metric-hint">
                      {{ mainPlayerSummary.totalExpenses > 0 && mainPlayerSummary.passiveIncome >= mainPlayerSummary.totalExpenses
                        ? '已实现财务自由'
                        : '目标：100%' }}
                    </div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">资产数量</div>
                    <div class="metric-value text-primary">
                      {{ mainPlayerSummary.assetCount }}
                    </div>
                    <div class="metric-hint">股票 + 房产 + 企业</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">总支出</div>
                    <div class="metric-value text-muted-foreground">
                      {{ formatMoneyCompact(mainPlayerSummary.totalExpenses) }}
                    </div>
                    <div class="metric-hint">月支出</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 3. 交易回顾 -->
            <section class="summary-section">
              <button class="section-header" @click="toggleSection('trades')">
                <div class="section-title">
                  <Briefcase class="h-4 w-4 text-primary" />
                  <span>交易回顾</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="{ 'rotate-180': expandedSections.has('trades') }"
                />
              </button>
              <div v-show="expandedSections.has('trades')" class="section-body">
                <div v-if="stockTradeStats && realEstateStats && businessStats" class="trade-stats-grid">
                  <!-- 股票 -->
                  <div class="trade-card">
                    <div class="trade-card-header">
                      <span class="trade-card-icon stock">📈</span>
                      <span class="trade-card-title">股票交易</span>
                    </div>
                    <div class="trade-card-body">
                      <div class="trade-row">
                        <span class="trade-label">买入/卖出</span>
                        <span class="trade-value">{{ stockTradeStats.buyCount }} / {{ stockTradeStats.sellCount }}</span>
                      </div>
                      <div class="trade-row">
                        <span class="trade-label">总盈亏</span>
                        <span
                          class="trade-value font-semibold"
                          :class="stockTradeStats.totalPnL >= 0 ? 'text-success' : 'text-destructive'"
                        >
                          {{ stockTradeStats.totalPnL >= 0 ? '+' : '' }}{{ formatMoney(stockTradeStats.totalPnL) }}
                        </span>
                      </div>
                      <div v-if="stockTradeStats.sellCount > 0" class="trade-row">
                        <span class="trade-label">胜率</span>
                        <span class="trade-value">{{ stockTradeStats.winRate.toFixed(0) }}%</span>
                      </div>
                    </div>
                  </div>

                  <!-- 房产 -->
                  <div class="trade-card">
                    <div class="trade-card-header">
                      <span class="trade-card-icon realestate">🏠</span>
                      <span class="trade-card-title">房产投资</span>
                    </div>
                    <div class="trade-card-body">
                      <div class="trade-row">
                        <span class="trade-label">买入/卖出</span>
                        <span class="trade-value">{{ realEstateStats.buyCount }} / {{ realEstateStats.sellCount }}</span>
                      </div>
                      <div class="trade-row">
                        <span class="trade-label">已实现盈亏</span>
                        <span
                          class="trade-value font-semibold"
                          :class="realEstateStats.totalPnL >= 0 ? 'text-success' : 'text-destructive'"
                        >
                          {{ realEstateStats.totalPnL >= 0 ? '+' : '' }}{{ formatMoney(realEstateStats.totalPnL) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 企业 -->
                  <div class="trade-card">
                    <div class="trade-card-header">
                      <span class="trade-card-icon business">🏢</span>
                      <span class="trade-card-title">企业投资</span>
                    </div>
                    <div class="trade-card-body">
                      <div class="trade-row">
                        <span class="trade-label">投资次数</span>
                        <span class="trade-value">{{ businessStats.buyCount }} 次</span>
                      </div>
                      <div class="trade-row">
                        <span class="trade-label">月被动收入</span>
                        <span class="trade-value font-semibold text-success">
                          +{{ formatMoney(businessStats.passiveIncome) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 选择分析 -->
                <div v-if="choiceAnalysis" class="choices-section">
                  <h4 class="subsection-title">历史选择</h4>
                  <div class="choices-grid">
                    <div class="choice-item">
                      <Sparkles class="h-5 w-5 text-primary" />
                      <div class="choice-info">
                        <div class="choice-value">{{ choiceAnalysis.smallOpportunities }}</div>
                        <div class="choice-label">小机会</div>
                      </div>
                    </div>
                    <div class="choice-item">
                      <Briefcase class="h-5 w-5 text-amber-400" />
                      <div class="choice-info">
                        <div class="choice-value">{{ choiceAnalysis.bigOpportunities }}</div>
                        <div class="choice-label">大机会</div>
                      </div>
                    </div>
                    <div class="choice-item">
                      <HeartHandshake class="h-5 w-5 text-pink-400" />
                      <div class="choice-info">
                        <div class="choice-value">{{ choiceAnalysis.charityCount }}</div>
                        <div class="choice-label">慈善</div>
                      </div>
                    </div>
                    <div class="choice-item">
                      <Landmark class="h-5 w-5 text-blue-400" />
                      <div class="choice-info">
                        <div class="choice-value">{{ choiceAnalysis.loanCount }}</div>
                        <div class="choice-label">贷款</div>
                      </div>
                    </div>
                    <div class="choice-item">
                      <Target class="h-5 w-5 text-destructive" />
                      <div class="choice-info">
                        <div class="choice-value">{{ choiceAnalysis.layoffCount }}</div>
                        <div class="choice-label">失业</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 4. 财商建议 -->
            <section class="summary-section">
              <button class="section-header" @click="toggleSection('tips')">
                <div class="section-title">
                  <Lightbulb class="h-4 w-4 text-primary" />
                  <span>财商建议</span>
                </div>
                <ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="{ 'rotate-180': expandedSections.has('tips') }"
                />
              </button>
              <div v-show="expandedSections.has('tips')" class="section-body">
                <div class="tips-list">
                  <div
                    v-for="(tip, index) in financialTips"
                    :key="index"
                    class="tip-card"
                    :class="tip.type"
                  >
                    <div class="tip-icon">{{ tip.icon }}</div>
                    <div class="tip-content">
                      <h5 class="tip-title">{{ tip.title }}</h5>
                      <p class="tip-text">{{ tip.content }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 底部 -->
          <div class="detail-footer">
            <button
              class="footer-btn danger"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="h-4 w-4" />
              <span>删除记录</span>
            </button>
            <button class="footer-btn primary" @click="closeDetail">
              <RotateCcw class="h-4 w-4" />
              <span>再来一局</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="showDeleteConfirm = false">
        <div class="confirm-modal">
          <div class="confirm-icon danger">
            <Trash2 class="h-6 w-6" />
          </div>
          <h3 class="confirm-title">确认删除</h3>
          <p class="confirm-desc">删除后将无法恢复此对局记录</p>
          <div class="confirm-buttons">
            <button class="confirm-btn secondary" @click="showDeleteConfirm = false">
              取消
            </button>
            <button class="confirm-btn danger" @click="confirmDelete">
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.history-page {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-foreground);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--color-foreground);
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--color-muted);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-spacer {
  width: 100px;
}

.page-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-icon.total {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-primary);
}

.stat-icon.victory {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.stat-icon.bankrupt {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-destructive);
}

.stat-icon.rate {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: var(--color-muted-foreground);
}

/* Grade Distribution */
.grade-distribution {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.grade-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grade-bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grade-label {
  width: 20px;
  font-size: 13px;
  font-weight: 700;
}

.grade-bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--color-muted);
  border-radius: 4px;
  overflow: hidden;
}

.grade-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.grade-s { background: #fbbf24; }
.grade-a { background: #a855f7; }
.grade-b { background: #3b82f6; }
.grade-c { background: #22c55e; }
.grade-d { background: #6b7280; }

.grade-count {
  width: 24px;
  text-align: right;
  font-size: 12px;
  color: var(--color-muted-foreground);
}

/* Filter */
.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted-foreground);
}

.filter-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-secondary);
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: var(--color-muted);
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin: 0;
}

.history-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;
}

.history-card:hover {
  background: var(--color-muted);
  border-color: var(--color-primary);
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.result-badge {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.grade-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid;
}

.card-meta, .card-submeta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-muted-foreground);
}

.card-submeta {
  margin-top: 2px;
}

.meta-sep {
  opacity: 0.5;
}

.dream-name {
  color: var(--color-primary);
  font-weight: 500;
}

.card-right {
  text-align: right;
  flex-shrink: 0;
}

.net-worth {
  font-size: 16px;
  font-weight: 700;
}

.net-worth-label {
  font-size: 11px;
  color: var(--color-muted-foreground);
}

/* Detail Modal */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.detail-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  background: var(--color-background);
  border-radius: 20px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.detail-header {
  position: relative;
  padding: 28px 24px 20px;
  text-align: center;
  overflow: hidden;
  flex-shrink: 0;
}

.header-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center top,
    rgba(59, 130, 246, 0.15) 0%,
    transparent 70%
  );
}

.detail-header.victory .header-glow {
  background: radial-gradient(
    ellipse at center top,
    rgba(251, 191, 36, 0.2) 0%,
    transparent 70%
  );
}

.detail-header.bankrupt .header-glow {
  background: radial-gradient(
    ellipse at center top,
    rgba(239, 68, 68, 0.15) 0%,
    transparent 70%
  );
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-foreground);
}

.header-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  position: relative;
  z-index: 1;
  border: 1px solid;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
  position: relative;
  z-index: 1;
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin: 0 0 10px 0;
  position: relative;
  z-index: 1;
}

.header-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 9999px;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
}

.grade-tag {
  font-weight: 700;
  border: 1px solid;
}

/* Detail Content */
.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.summary-section {
  border-bottom: 1px solid var(--color-border);
}

.summary-section:last-of-type {
  border-bottom: none;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 8px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--color-muted);
  border-radius: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0;
}

.section-body {
  padding: 0 8px 16px;
}

/* Ranking */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-secondary);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.ranking-item.winner {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 146, 60, 0.1));
  border-color: rgba(251, 191, 36, 0.4);
}

.ranking-item.is-main {
  border-color: var(--color-primary);
}

.ranking-rank {
  width: 24px;
  text-align: center;
}

.rank-number {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-muted-foreground);
}

.ranking-player {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
}

.player-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
}

.current-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  font-weight: 600;
}

.ranking-career {
  font-size: 11px;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
}

.ranking-networth {
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

/* Age & Stats */
.age-grade-section {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.age-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-secondary);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.age-label {
  font-size: 12px;
  color: var(--color-muted-foreground);
}

.age-value {
  font-size: 14px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: var(--color-secondary);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.stat-mini-value {
  font-size: 14px;
  font-weight: 700;
}

.stat-mini-label {
  font-size: 10px;
  color: var(--color-muted-foreground);
}

.phase-breakdown {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.phase-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-muted);
  border-radius: 8px;
  font-size: 12px;
}

.phase-label {
  color: var(--color-muted-foreground);
}

.phase-value {
  font-weight: 600;
}

/* Sparkline */
.sparkline-container {
  padding: 12px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.sparkline-label {
  font-size: 12px;
  margin-bottom: 8px;
  font-weight: 500;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-card {
  padding: 12px 8px;
  background: var(--color-secondary);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  text-align: center;
}

.metric-label {
  font-size: 10px;
  color: var(--color-muted-foreground);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 2px;
}

.metric-hint {
  font-size: 9px;
  color: var(--color-muted-foreground);
  opacity: 0.8;
}

/* Trades */
.trade-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.trade-card {
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.trade-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.trade-card-icon {
  font-size: 14px;
}

.trade-card-title {
  font-size: 12px;
  font-weight: 600;
}

.trade-card-body {
  padding: 10px 12px;
}

.trade-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 3px 0;
}

.trade-label {
  color: var(--color-muted-foreground);
}

.trade-value {
  font-weight: 500;
}

/* Choices */
.choices-section {
  margin-top: 8px;
}

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.choices-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.choice-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--color-secondary);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.choice-info {
  display: flex;
  flex-direction: column;
}

.choice-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.choice-label {
  font-size: 10px;
  color: var(--color-muted-foreground);
}

/* Tips */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.tip-card.success {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.25);
}

.tip-card.warning {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.25);
}

.tip-card.info {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.25);
}

.tip-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
  min-width: 0;
}

.tip-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.tip-text {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 0;
  line-height: 1.6;
}

/* Footer */
.detail-footer {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-secondary);
}

.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.footer-btn.primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.footer-btn.primary:hover {
  filter: brightness(1.1);
}

.footer-btn.danger {
  background: var(--color-destructive);
  color: white;
}

.footer-btn.danger:hover {
  filter: brightness(1.1);
}

/* Confirm Modal */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  padding: 16px;
}

.confirm-modal {
  width: 100%;
  max-width: 320px;
  background: var(--color-background);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  padding: 24px;
  text-align: center;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.confirm-icon.danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-destructive);
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.confirm-desc {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin: 0 0 20px 0;
}

.confirm-buttons {
  display: flex;
  gap: 10px;
}

.confirm-btn {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.confirm-btn.secondary {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.confirm-btn.secondary:hover {
  background: var(--color-border);
}

.confirm-btn.danger {
  background: var(--color-destructive);
  color: white;
}

.confirm-btn.danger:hover {
  filter: brightness(1.1);
}

/* Scrollbar */
.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track {
  background: transparent;
}

.detail-content::-webkit-scrollbar-thumb {
  background: var(--color-gray-600);
  border-radius: 3px;
}

/* Responsive */
@media (max-width: 640px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .trade-stats-grid {
    grid-template-columns: 1fr;
  }

  .choices-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .ranking-career {
    display: none;
  }
}
</style>
