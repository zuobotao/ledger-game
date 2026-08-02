<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Trophy,
  X,
  RotateCcw,
  Home,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  BarChart3,
  Clock,
  Briefcase,
  HeartHandshake,
  Baby,
  BriefcaseBusiness,
  Landmark,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Player, TransactionRecord, CardHistoryRecord } from '@/types/game'

interface Props {
  player: Player
  phase: 'rat_race_end' | 'victory' | 'game_over'
  totalTurns: number
  ratRaceTurns?: number
  fastTrackTurns?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'restart'): void
  (e: 'home'): void
}>()

const gameStore = useGameStore()

// ========== 展开的部分 ==========
const expandedSections = ref<Set<string>>(new Set(['overview', 'finance']))

function toggleSection(key: string) {
  if (expandedSections.value.has(key)) {
    expandedSections.value.delete(key)
  } else {
    expandedSections.value.add(key)
  }
}

// ========== 工具函数 ==========
function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function formatMoneyCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

// ========== 概览数据 ==========
const resultInfo = computed(() => {
  switch (props.phase) {
    case 'rat_race_end':
      return {
        title: '进入资本游戏',
        subtitle: '成功完成原始资本积累',
        icon: Target,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/15',
        gradientFrom: 'from-blue-500',
        gradientTo: 'to-cyan-400',
        primaryBtnText: '进入资本游戏',
        showClose: true,
      }
    case 'victory':
      return {
        title: '财务自由！',
        subtitle: props.player.dream ? `实现梦想：${props.player.dream.name}` : '成功购买梦想',
        icon: Trophy,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/15',
        gradientFrom: 'from-amber-400',
        gradientTo: 'to-yellow-300',
        primaryBtnText: '再来一局',
        showClose: false,
      }
    case 'game_over':
      return {
        title: '破产',
        subtitle: '游戏结束，吸取教训重新出发',
        icon: TrendingDown,
        iconColor: 'text-destructive',
        iconBg: 'bg-destructive/15',
        gradientFrom: 'from-red-500',
        gradientTo: 'to-orange-500',
        primaryBtnText: '再来一局',
        showClose: false,
      }
  }
})

const finalNetWorth = computed(() => {
  const p = props.player
  const assetValue = p.assets.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const liabilityValue = p.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return p.cash + p.savings + assetValue - liabilityValue
})

const initialSnapshot = computed(() => {
  const snapshots = props.player.financialSnapshots
  return snapshots.length > 0 ? snapshots[0] : null
})

const finalSnapshot = computed(() => {
  const snapshots = props.player.financialSnapshots
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
})

const cashFlowChange = computed(() => {
  if (!initialSnapshot.value || !finalSnapshot.value) return 0
  return finalSnapshot.value.monthlyCashFlow - initialSnapshot.value.monthlyCashFlow
})

// ========== 财务分析 ==========
const assetBreakdown = computed(() => {
  const p = props.player
  const cashValue = p.cash + p.savings
  const stockValue = p.assets
    .filter((a) => a.type === 'stock')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const realEstateValue = p.assets
    .filter((a) => a.type === 'real_estate')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const businessValue = p.assets
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const total = cashValue + stockValue + realEstateValue + businessValue
  return {
    cash: { value: cashValue, label: '现金', color: '#facc15' },
    stock: { value: stockValue, label: '股票', color: '#3b82f6' },
    realEstate: { value: realEstateValue, label: '房地产', color: '#22c55e' },
    business: { value: businessValue, label: '企业', color: '#a855f7' },
    total,
  }
})

// 饼图数据
const pieData = computed(() => {
  const b = assetBreakdown.value
  return (
    [
      { key: 'cash', ...b.cash },
      { key: 'stock', ...b.stock },
      { key: 'realEstate', ...b.realEstate },
      { key: 'business', ...b.business },
    ] as { key: string; value: number; label: string; color: string }[]
  ).filter((d) => d.value > 0)
})

const PIE_SIZE = 200
const PIE_CENTER = PIE_SIZE / 2
const PIE_OUTER_RADIUS = 80
const PIE_INNER_RADIUS = 50

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function describeArc(startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(PIE_CENTER, PIE_CENTER, PIE_OUTER_RADIUS, endAngle)
  const outerEnd = polarToCartesian(PIE_CENTER, PIE_CENTER, PIE_OUTER_RADIUS, startAngle)
  const innerStart = polarToCartesian(PIE_CENTER, PIE_CENTER, PIE_INNER_RADIUS, startAngle)
  const innerEnd = polarToCartesian(PIE_CENTER, PIE_CENTER, PIE_INNER_RADIUS, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return [
    'M', outerStart.x, outerStart.y,
    'A', PIE_OUTER_RADIUS, PIE_OUTER_RADIUS, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    'L', innerStart.x, innerStart.y,
    'A', PIE_INNER_RADIUS, PIE_INNER_RADIUS, 0, largeArc, 1, innerEnd.x, innerEnd.y,
    'Z',
  ].join(' ')
}

const pieSlices = computed(() => {
  const data = pieData.value
  if (data.length === 0) return []
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = 0
  return data.map((d) => {
    const angle = (d.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    const path = describeArc(startAngle, endAngle)
    const percentage = (d.value / total) * 100
    return { ...d, path, percentage }
  })
})

// 收入来源分析
const incomeAnalysis = computed(() => {
  const p = props.player
  const salary = p.salary
  const passive = p.passiveIncome
  const total = salary + passive
  const passiveRatio = total > 0 ? (passive / total) * 100 : 0
  return { salary, passive, total, passiveRatio }
})

// 支出分析
const totalLiabilities = computed(() =>
  props.player.liabilities.reduce((sum, l) => sum + l.amount, 0),
)

// 关键财务指标
const financialMetrics = computed(() => {
  const p = props.player
  const totalExp = p.totalExpenses
  const passiveIncome = p.passiveIncome
  const passiveExpenseRatio = totalExp > 0 ? (passiveIncome / totalExp) * 100 : 0

  const totalAssetValue = p.assets.reduce(
    (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity,
    0,
  )
  const assetReturn = totalAssetValue > 0 ? (passiveIncome / totalAssetValue) * 100 : 0

  const totalInc = p.totalIncome
  const savingsRate = totalInc > 0 ? (p.cashFlow / totalInc) * 100 : 0

  return {
    passiveExpenseRatio,
    assetReturn,
    savingsRate,
  }
})

// ========== 交易回顾 ==========
const playerTransactions = computed<TransactionRecord[]>(() => {
  return gameStore.transactions.filter((t) => t.playerId === props.player.id)
})

const playerCardHistory = computed<CardHistoryRecord[]>(() => {
  return gameStore.cardHistory.filter((c) => c.playerId === props.player.id)
})

// 股票交易统计
const stockTradeStats = computed(() => {
  const txs = playerTransactions.value
  const buys = txs.filter((t) => t.type === 'stock_buy')
  const sells = txs.filter((t) => t.type === 'stock_sell')
  const totalBuyCost = buys.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalSellRevenue = sells.reduce((sum, t) => sum + t.amount, 0)
  const totalCostBasis = sells.reduce((sum, t) => sum + (t.costBasis ?? 0), 0)
  const totalPnL = totalSellRevenue - totalCostBasis
  const winTrades = sells.filter((t) => t.costBasis !== undefined && t.amount > t.costBasis).length
  const winRate = sells.length > 0 ? (winTrades / sells.length) * 100 : 0

  // 最大单笔盈亏
  let maxProfit = 0
  let maxLoss = 0
  let maxProfitTx: TransactionRecord | null = null
  let maxLossTx: TransactionRecord | null = null
  for (const t of sells) {
    if (t.costBasis !== undefined) {
      const pnl = t.amount - t.costBasis
      if (pnl > maxProfit) {
        maxProfit = pnl
        maxProfitTx = t
      }
      if (pnl < maxLoss) {
        maxLoss = pnl
        maxLossTx = t
      }
    }
  }

  return {
    buyCount: buys.length,
    sellCount: sells.length,
    totalBuyCost,
    totalSellRevenue,
    totalPnL,
    winRate,
    maxProfit,
    maxLoss,
    maxProfitTx,
    maxLossTx,
  }
})

// 房产交易统计
const realEstateStats = computed(() => {
  const txs = playerTransactions.value
  const buys = txs.filter((t) => t.type === 'real_estate_buy')
  const sells = txs.filter((t) => t.type === 'real_estate_sell')
  const totalCostBasis = sells.reduce((sum, t) => sum + (t.costBasis ?? 0), 0)
  const totalSellRevenue = sells.reduce((sum, t) => sum + t.amount, 0)
  const totalPnL = totalSellRevenue - totalCostBasis
  return {
    buyCount: buys.length,
    sellCount: sells.length,
    totalPnL,
  }
})

// 企业投资统计
const businessStats = computed(() => {
  const txs = playerTransactions.value
  const buys = txs.filter((t) => t.type === 'business_buy')
  const p = props.player
  const totalCashFlow = p.assets
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + a.cashFlow * a.quantity, 0)
  return {
    buyCount: buys.length,
    totalCashFlow,
  }
})

// ========== 历史选择分析 ==========
const choiceAnalysis = computed(() => {
  const history = playerCardHistory.value
  const smallOpportunities = history.filter(
    (h) => h.type === 'opportunity' && h.cardId.includes('small'),
  ).length
  // 用另一种方式判断大小机会：从cardHistory中统计opportunity类型
  const opportunityCards = history.filter((h) => h.type === 'opportunity')
  // 大机会卡id通常以big开头，小机会以small开头
  let bigCount = 0
  let smallCount = 0
  for (const c of opportunityCards) {
    if (c.cardId.startsWith('big_') || c.cardId.includes('big')) {
      bigCount++
    } else {
      smallCount++
    }
  }

  const charityCount = playerTransactions.value.filter((t) => t.type === 'charity').length
  const loanCount = playerTransactions.value.filter((t) => t.type === 'bank_loan').length
  const layoffCount = playerTransactions.value.filter((t) => t.type === 'layoff').length

  return {
    smallOpportunities: smallCount || opportunityCards.length,
    bigOpportunities: bigCount,
    charityCount,
    loanCount,
    childrenCount: props.player.childrenCount,
    layoffCount,
  }
})

// ========== 财商建议 ==========
const financialTips = computed(() => {
  const tips: { icon: string; title: string; content: string; type: 'success' | 'warning' | 'info' }[] = []
  const p = props.player
  const metrics = financialMetrics.value
  const stockStats = stockTradeStats.value
  const breakdown = assetBreakdown.value

  // 1. 主要靠工资收入
  if (incomeAnalysis.value.passiveRatio < 20 && p.salary > 0) {
    tips.push({
      icon: '💼',
      title: '增加被动收入',
      content: '你目前主要依靠工资收入。财务自由的关键是让钱为你工作。学习投资知识，逐步建立股票、房产或企业等被动收入来源。',
      type: 'warning',
    })
  }

  // 2. 股票交易频繁但亏损
  if (stockStats.sellCount >= 3 && stockStats.totalPnL < 0) {
    tips.push({
      icon: '📉',
      title: '学习价值投资',
      content: '你的股票交易较为频繁但总体亏损。建议减少投机性交易，学习价值投资理念，关注企业基本面，长期持有优质资产。',
      type: 'warning',
    })
  }

  // 3. 全是现金没投资
  if (breakdown.total > 0 && breakdown.cash.value / breakdown.total > 0.8 && p.assets.length === 0) {
    tips.push({
      icon: '💰',
      title: '让钱工作起来',
      content: '你的资产几乎全是现金，没有任何投资。现金会因通胀而贬值。学习资产配置，将部分资金投入股票、基金或其他投资品种。',
      type: 'warning',
    })
  }

  // 4. 负债过高
  if (totalLiabilities.value > finalNetWorth.value && finalNetWorth.value > 0) {
    tips.push({
      icon: '🏦',
      title: '优先偿还高息债务',
      content: '你的负债水平较高。建议优先偿还信用卡等高息债务，减少利息支出。负债越少，你就有越多的钱可以用来投资增值。',
      type: 'warning',
    })
  }

  // 5. 资产配置单一
  const assetCategories = pieData.value.length
  if (assetCategories <= 1 && breakdown.total > 10000) {
    tips.push({
      icon: '📊',
      title: '分散投资降低风险',
      content: '你的资产配置过于单一。建议学习资产配置理念，将资金分散到不同类型的资产（股票、房产、企业等），降低整体风险。',
      type: 'info',
    })
  }

  // 6. 很快进入快车道/实现梦想
  if (props.phase === 'victory' && props.totalTurns < 30) {
    tips.push({
      icon: '🏆',
      title: '出色的财务规划能力',
      content: '你在很短的时间内就实现了财务自由！这展示了优秀的财务规划能力和投资眼光。继续保持这种投资思维。',
      type: 'success',
    })
  }

  // 7. 破产分析
  if (props.phase === 'game_over') {
    if (choiceAnalysis.value.layoffCount > 0) {
      tips.push({
        icon: '⚠️',
        title: '建立应急基金',
        content: '失业是导致破产的重要原因。在现实生活中，建议至少储备3-6个月生活费的应急基金，并考虑购买失业保险。',
        type: 'warning',
      })
    }
    if (choiceAnalysis.value.loanCount > 2) {
      tips.push({
        icon: '💳',
        title: '谨慎使用杠杆',
        content: '过度借贷是财务危机的常见原因。使用杠杆前要充分评估风险，确保有足够的现金流来偿还债务。',
        type: 'warning',
      })
    }
    if (stockStats.totalPnL < 0 && stockStats.sellCount > 0) {
      tips.push({
        icon: '📈',
        title: '提升投资能力',
        content: '投资亏损是财务困境的原因之一。建议系统学习投资知识，建立自己的投资体系，避免情绪化交易。',
        type: 'info',
      })
    }
    // 通用破产建议
    tips.push({
      icon: '💪',
      title: '失败是最好的老师',
      content: '这次破产是一次宝贵的学习经历。分析你哪里出了问题，总结经验教训。现实中的财务自由之路也充满挑战，关键是从失败中学习并持续进步。',
      type: 'success',
    })
  }

  // 8. 高储蓄率
  if (metrics.savingsRate > 30) {
    tips.push({
      icon: '🎯',
      title: '优秀的储蓄习惯',
      content: '你的储蓄率很高，这是积累财富的基础。继续保持"先支付自己"的习惯，将储蓄转化为能产生现金流的资产。',
      type: 'success',
    })
  }

  // 如果没有任何建议，给一条通用建议
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

// 现金流变化曲线（简单的迷你图）
const cashFlowSparkline = computed(() => {
  const snapshots = props.player.financialSnapshots.slice(-20)
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

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return { path, width, height }
})
</script>

<template>
  <div class="game-summary-overlay">
    <div class="game-summary-modal">
      <!-- 头部 -->
      <div class="summary-header" :class="phase">
        <div class="header-glow" aria-hidden="true" />
        <button v-if="resultInfo.showClose" class="close-btn" @click="emit('close')" title="关闭">
          <X class="h-5 w-5" />
        </button>
        <div class="header-icon" :class="resultInfo.iconBg">
          <component :is="resultInfo.icon" class="h-8 w-8" :class="resultInfo.iconColor" />
        </div>
        <h1 class="header-title">
          <span
            class="gradient-text"
            :style="{
              background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }"
          >
            {{ resultInfo.title }}
          </span>
        </h1>
        <p class="header-subtitle">{{ resultInfo.subtitle }}</p>
        <p class="header-player">{{ player.name }} · {{ player.career.name }}</p>
      </div>

      <!-- 内容区域 -->
      <div class="summary-content">
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
            <!-- 关键指标卡片 -->
            <div class="stats-grid">
              <div class="stat-card">
                <Clock class="h-4 w-4 text-muted-foreground" />
                <div class="stat-value">{{ totalTurns }}</div>
                <div class="stat-label">总回合数</div>
              </div>
              <div class="stat-card">
                <Wallet class="h-4 w-4 text-muted-foreground" />
                <div class="stat-value text-success">{{ formatMoneyCompact(player.cash) }}</div>
                <div class="stat-label">最终现金</div>
              </div>
              <div class="stat-card">
                <TrendingUp class="h-4 w-4 text-muted-foreground" />
                <div class="stat-value" :class="finalNetWorth >= 0 ? 'text-success' : 'text-destructive'">
                  {{ formatMoneyCompact(finalNetWorth) }}
                </div>
                <div class="stat-label">最终净值</div>
              </div>
              <div class="stat-card">
                <BarChart3 class="h-4 w-4 text-muted-foreground" />
                <div class="stat-value" :class="cashFlowChange >= 0 ? 'text-success' : 'text-destructive'">
                  {{ cashFlowChange >= 0 ? '+' : '' }}{{ formatMoneyCompact(cashFlowChange) }}
                </div>
                <div class="stat-label">现金流变化</div>
              </div>
            </div>

            <!-- 阶段分布 -->
            <div v-if="ratRaceTurns !== undefined || fastTrackTurns !== undefined" class="phase-breakdown">
              <div v-if="ratRaceTurns !== undefined" class="phase-item">
                <span class="phase-label">原始资本积累</span>
                <span class="phase-value">{{ ratRaceTurns }} 回合</span>
              </div>
              <div v-if="fastTrackTurns !== undefined" class="phase-item">
                <span class="phase-label">资本游戏</span>
                <span class="phase-value">{{ fastTrackTurns }} 回合</span>
              </div>
            </div>

            <!-- 现金流变化迷你图 -->
            <div v-if="cashFlowSparkline" class="sparkline-container">
              <div class="sparkline-label">
                <span>月现金流走势</span>
                <span class="text-muted-foreground">
                  {{ initialSnapshot ? formatMoneyCompact(initialSnapshot.monthlyCashFlow) : '' }}
                  →
                  {{ finalSnapshot ? formatMoneyCompact(finalSnapshot.monthlyCashFlow) : '' }}
                </span>
              </div>
              <svg :width="'100%'" :height="cashFlowSparkline.height" :viewBox="`0 0 ${cashFlowSparkline.width} ${cashFlowSparkline.height}`" preserveAspectRatio="none">
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
            <!-- 资产结构饼图 -->
            <div class="pie-chart-section">
              <h4 class="subsection-title">资产结构</h4>
              <div class="pie-wrapper">
                <svg :width="PIE_SIZE" :height="PIE_SIZE" :viewBox="`0 0 ${PIE_SIZE} ${PIE_SIZE}`">
                  <g v-if="pieSlices.length > 0">
                    <path
                      v-for="slice in pieSlices"
                      :key="slice.key"
                      :d="slice.path"
                      :fill="slice.color"
                      opacity="0.9"
                    />
                  </g>
                  <text
                    v-else
                    :x="PIE_CENTER"
                    :y="PIE_CENTER"
                    text-anchor="middle"
                    class="pie-empty-text"
                  >
                    暂无资产
                  </text>
                  <text
                    v-if="pieSlices.length > 0"
                    :x="PIE_CENTER"
                    :y="PIE_CENTER - 6"
                    text-anchor="middle"
                    class="pie-center-label"
                  >
                    总资产
                  </text>
                  <text
                    v-if="pieSlices.length > 0"
                    :x="PIE_CENTER"
                    :y="PIE_CENTER + 14"
                    text-anchor="middle"
                    class="pie-center-value"
                  >
                    {{ formatMoneyCompact(assetBreakdown.total) }}
                  </text>
                </svg>
              </div>
              <div class="pie-legend">
                <div
                  v-for="item in pieSlices"
                  :key="item.key"
                  class="legend-item"
                >
                  <span class="legend-dot" :style="{ backgroundColor: item.color }" />
                  <span class="legend-label">{{ item.label }}</span>
                  <span class="legend-value">{{ formatMoneyCompact(item.value) }}</span>
                  <span class="legend-pct">{{ item.percentage.toFixed(0) }}%</span>
                </div>
              </div>
            </div>

            <!-- 收入来源 -->
            <div class="income-section">
              <h4 class="subsection-title">收入来源</h4>
              <div class="income-bar-wrapper">
                <div class="income-bar">
                  <div
                    class="income-bar-salary"
                    :style="{ width: `${100 - incomeAnalysis.passiveRatio}%` }"
                  />
                  <div
                    class="income-bar-passive"
                    :style="{ width: `${incomeAnalysis.passiveRatio}%` }"
                  />
                </div>
                <div class="income-legend">
                  <div class="income-legend-item">
                    <span class="legend-dot salary-dot" />
                    <span>工资 {{ (100 - incomeAnalysis.passiveRatio).toFixed(0) }}%</span>
                  </div>
                  <div class="income-legend-item">
                    <span class="legend-dot passive-dot" />
                    <span>被动收入 {{ incomeAnalysis.passiveRatio.toFixed(0) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 关键指标 -->
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">被动收入/支出比率</div>
                <div class="metric-value" :class="financialMetrics.passiveExpenseRatio >= 100 ? 'text-success' : 'text-warning'">
                  {{ financialMetrics.passiveExpenseRatio.toFixed(1) }}%
                </div>
                <div class="metric-hint">
                  {{ financialMetrics.passiveExpenseRatio >= 100 ? '已实现财务自由' : '目标：100%' }}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">资产收益率</div>
                <div class="metric-value" :class="financialMetrics.assetReturn >= 5 ? 'text-success' : 'text-muted-foreground'">
                  {{ financialMetrics.assetReturn.toFixed(1) }}%
                </div>
                <div class="metric-hint">被动收入 ÷ 总资产</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">储蓄率</div>
                <div class="metric-value" :class="financialMetrics.savingsRate >= 20 ? 'text-success' : 'text-warning'">
                  {{ financialMetrics.savingsRate.toFixed(1) }}%
                </div>
                <div class="metric-hint">现金流 ÷ 总收入</div>
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
            <div class="trade-stats-grid">
              <!-- 股票 -->
              <div class="trade-card">
                <div class="trade-card-header">
                  <span class="trade-card-icon stock">📈</span>
                  <span class="trade-card-title">股票交易</span>
                </div>
                <div class="trade-card-body">
                  <div class="trade-row">
                    <span class="trade-label">买入次数</span>
                    <span class="trade-value">{{ stockTradeStats.buyCount }} 次</span>
                  </div>
                  <div class="trade-row">
                    <span class="trade-label">卖出次数</span>
                    <span class="trade-value">{{ stockTradeStats.sellCount }} 次</span>
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
                    <span class="trade-label">买入次数</span>
                    <span class="trade-value">{{ realEstateStats.buyCount }} 次</span>
                  </div>
                  <div class="trade-row">
                    <span class="trade-label">卖出次数</span>
                    <span class="trade-value">{{ realEstateStats.sellCount }} 次</span>
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
                    <span class="trade-label">月现金流</span>
                    <span class="trade-value font-semibold text-success">
                      +{{ formatMoney(businessStats.totalCashFlow) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 最大单笔 -->
            <div v-if="stockTradeStats.maxProfit > 0 || stockTradeStats.maxLoss < 0" class="extreme-trades">
              <h4 class="subsection-title">单笔之最</h4>
              <div class="extreme-grid">
                <div v-if="stockTradeStats.maxProfit > 0" class="extreme-card profit">
                  <div class="extreme-label">最大盈利</div>
                  <div class="extreme-value">+{{ formatMoney(stockTradeStats.maxProfit) }}</div>
                  <div v-if="stockTradeStats.maxProfitTx" class="extreme-detail">
                    {{ stockTradeStats.maxProfitTx.assetName ?? stockTradeStats.maxProfitTx.description }}
                  </div>
                </div>
                <div v-if="stockTradeStats.maxLoss < 0" class="extreme-card loss">
                  <div class="extreme-label">最大亏损</div>
                  <div class="extreme-value">{{ formatMoney(stockTradeStats.maxLoss) }}</div>
                  <div v-if="stockTradeStats.maxLossTx" class="extreme-detail">
                    {{ stockTradeStats.maxLossTx.assetName ?? stockTradeStats.maxLossTx.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. 历史选择分析 -->
        <section class="summary-section">
          <button class="section-header" @click="toggleSection('choices')">
            <div class="section-title">
              <Target class="h-4 w-4 text-primary" />
              <span>历史选择</span>
            </div>
            <ChevronDown
              class="h-4 w-4 text-muted-foreground transition-transform"
              :class="{ 'rotate-180': expandedSections.has('choices') }"
            />
          </button>
          <div v-show="expandedSections.has('choices')" class="section-body">
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
                  <div class="choice-label">贷款次数</div>
                </div>
              </div>
              <div class="choice-item">
                <Baby class="h-5 w-5 text-rose-400" />
                <div class="choice-info">
                  <div class="choice-value">{{ choiceAnalysis.childrenCount }}</div>
                  <div class="choice-label">子女数量</div>
                </div>
              </div>
              <div class="choice-item">
                <BriefcaseBusiness class="h-5 w-5 text-destructive" />
                <div class="choice-info">
                  <div class="choice-value">{{ choiceAnalysis.layoffCount }}</div>
                  <div class="choice-label">失业次数</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 5. 财商建议 -->
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

      <!-- 底部按钮 -->
      <div class="summary-footer">
        <button class="footer-btn secondary" @click="emit('home')">
          <Home class="h-4 w-4" />
          <span>返回首页</span>
        </button>
        <button class="footer-btn primary" @click="emit('restart')">
          <RotateCcw class="h-4 w-4" />
          <span>{{ resultInfo.primaryBtnText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-summary-overlay {
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

.game-summary-modal {
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

/* Header */
.summary-header {
  position: relative;
  padding: 32px 24px 24px;
  text-align: center;
  overflow: hidden;
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

.summary-header.victory .header-glow {
  background: radial-gradient(
    ellipse at center top,
    rgba(251, 191, 36, 0.2) 0%,
    transparent 70%
  );
}

.summary-header.game_over .header-glow {
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
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  position: relative;
  z-index: 1;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
  position: relative;
  z-index: 1;
}

.gradient-text {
  background-clip: text;
  -webkit-background-clip: text;
}

.header-subtitle {
  font-size: 14px;
  color: var(--color-muted-foreground);
  margin: 0 0 8px 0;
  position: relative;
  z-index: 1;
}

.header-player {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 0;
  opacity: 0.7;
  position: relative;
  z-index: 1;
}

/* Content */
.summary-content {
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
}

.section-body {
  padding: 0 8px 16px;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-foreground);
}

.stat-label {
  font-size: 10px;
  color: var(--color-muted-foreground);
}

/* Phase breakdown */
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
  color: var(--color-foreground);
}

/* Sparkline */
.sparkline-container {
  padding: 12px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.sparkline-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 8px;
  font-weight: 500;
}

/* Subsections */
.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0 0 12px 0;
}

/* Pie chart */
.pie-chart-section {
  margin-bottom: 20px;
}

.pie-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.pie-empty-text {
  font-size: 12px;
  fill: var(--color-gray-500);
}

.pie-center-label {
  font-size: 11px;
  fill: var(--color-gray-400);
  font-weight: 500;
}

.pie-center-value {
  font-size: 15px;
  fill: var(--color-gray-100);
  font-weight: 700;
}

.pie-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  color: var(--color-muted-foreground);
  flex: 1;
}

.legend-value {
  color: var(--color-foreground);
  font-weight: 500;
}

.legend-pct {
  color: var(--color-muted-foreground);
  font-size: 10px;
}

/* Income bar */
.income-section {
  margin-bottom: 20px;
}

.income-bar-wrapper {
  padding: 12px;
  background: var(--color-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.income-bar {
  height: 12px;
  border-radius: 6px;
  display: flex;
  overflow: hidden;
  margin-bottom: 10px;
}

.income-bar-salary {
  background: #6b7280;
  transition: width 0.3s;
}

.income-bar-passive {
  background: #22c55e;
  transition: width 0.3s;
}

.income-legend {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--color-muted-foreground);
}

.income-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.salary-dot { background: #6b7280; }
.passive-dot { background: #22c55e; }

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

/* Trade stats */
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
  font-size: 16px;
}

.trade-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-foreground);
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
  color: var(--color-foreground);
  font-weight: 500;
}

/* Extreme trades */
.extreme-trades {
  margin-top: 8px;
}

.extreme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.extreme-card {
  padding: 12px;
  border-radius: 10px;
}

.extreme-card.profit {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.extreme-card.loss {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.extreme-label {
  font-size: 10px;
  color: var(--color-muted-foreground);
  margin-bottom: 4px;
}

.extreme-value {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.extreme-card.profit .extreme-value {
  color: var(--color-success);
}

.extreme-card.loss .extreme-value {
  color: var(--color-destructive);
}

.extreme-detail {
  font-size: 10px;
  color: var(--color-muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Choices */
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
  font-size: 18px;
  font-weight: 700;
  color: var(--color-foreground);
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
  color: var(--color-foreground);
  margin: 0 0 4px 0;
}

.tip-text {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 0;
  line-height: 1.6;
}

/* Footer */
.summary-footer {
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

.footer-btn.secondary {
  background: var(--color-muted);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.footer-btn.secondary:hover {
  background: var(--color-border);
}

/* Scrollbar */
.summary-content::-webkit-scrollbar {
  width: 6px;
}

.summary-content::-webkit-scrollbar-track {
  background: transparent;
}

.summary-content::-webkit-scrollbar-thumb {
  background: var(--color-gray-600);
  border-radius: 3px;
}

/* Responsive */
@media (max-width: 480px) {
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

  .header-title {
    font-size: 22px;
  }

  .pie-legend {
    grid-template-columns: 1fr;
  }
}
</style>
