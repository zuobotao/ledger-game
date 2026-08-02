<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset } from '@/types/game'

const props = defineProps<{
  playerId: string
}>()

const gameStore = useGameStore()

const player = computed(() => gameStore.players.find((p) => p.id === props.playerId) ?? null)

const stockAssets = computed<Asset[]>(() => {
  return player.value?.assets.filter((a) => a.type === 'stock') ?? []
})

// 计算每只股票的盈亏数据
const stockStats = computed(() => {
  return stockAssets.value.map((stock) => {
    const costBasis = stock.cost * stock.quantity
    const currentValue = (stock.marketPrice ?? stock.cost) * stock.quantity
    const profit = currentValue - costBasis
    const profitPct = costBasis > 0 ? (profit / costBasis) * 100 : 0
    return {
      id: stock.id,
      symbol: stock.symbol ?? stock.name,
      name: stock.name,
      quantity: stock.quantity,
      costBasis,
      currentValue,
      profit,
      profitPct,
      avgCost: stock.cost,
      currentPrice: stock.marketPrice ?? stock.cost,
    }
  })
})

// 总投资收益
const totalInvestment = computed(() => stockStats.value.reduce((sum, s) => sum + s.costBasis, 0))
const totalCurrentValue = computed(() => stockStats.value.reduce((sum, s) => sum + s.currentValue, 0))
const totalProfit = computed(() => totalCurrentValue.value - totalInvestment.value)
const totalProfitPct = computed(() =>
  totalInvestment.value > 0 ? (totalProfit.value / totalInvestment.value) * 100 : 0,
)

// 柱状图：各股票盈亏比例
const BAR_CHART_W = 320
const BAR_CHART_H = 180
const BAR_PADDING_TOP = 20
const BAR_PADDING_BOTTOM = 40
const BAR_PADDING_LEFT = 10
const BAR_PADDING_RIGHT = 10

const profitBarMax = computed(() => {
  if (stockStats.value.length === 0) return 50
  const maxAbs = Math.max(...stockStats.value.map((s) => Math.abs(s.profitPct)), 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxAbs)))
  return Math.ceil(maxAbs / magnitude) * magnitude
})

const profitBars = computed(() => {
  const stats = stockStats.value
  if (stats.length === 0) return []
  const chartInnerW = BAR_CHART_W - BAR_PADDING_LEFT - BAR_PADDING_RIGHT
  const chartInnerH = BAR_CHART_H - BAR_PADDING_TOP - BAR_PADDING_BOTTOM
  const barW = Math.min(36, chartInnerW / stats.length - 8)
  const groupW = chartInnerW / stats.length
  const zeroLineY = BAR_PADDING_TOP + chartInnerH / 2
  const maxVal = profitBarMax.value

  return stats.map((s, i) => {
    const x = BAR_PADDING_LEFT + groupW * i + (groupW - barW) / 2
    const barHeight = (Math.abs(s.profitPct) / maxVal) * (chartInnerH / 2)
    const isPositive = s.profitPct >= 0
    const y = isPositive ? zeroLineY - barHeight : zeroLineY
    return {
      ...s,
      x,
      y,
      w: barW,
      h: Math.max(barHeight, 2),
      isPositive,
      labelX: BAR_PADDING_LEFT + groupW * i + groupW / 2,
    }
  })
})

const zeroLineY = computed(() => BAR_PADDING_TOP + (BAR_CHART_H - BAR_PADDING_TOP - BAR_PADDING_BOTTOM) / 2)

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

const COLORS = {
  profit: '#22c55e',
  loss: '#ef4444',
  neutral: '#6b7280',
}
</script>

<template>
  <div class="stock-portfolio-chart">
    <!-- 总览卡片 -->
    <div class="overview-card">
      <div class="overview-row">
        <div class="overview-item">
          <span class="overview-label">总投资成本</span>
          <span class="overview-value">{{ formatMoney(totalInvestment) }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">当前市值</span>
          <span class="overview-value">{{ formatMoney(totalCurrentValue) }}</span>
        </div>
      </div>
      <div class="overview-row">
        <div class="overview-item">
          <span class="overview-label">总盈亏</span>
          <span class="overview-value profit-value" :class="{ profit: totalProfit >= 0, loss: totalProfit < 0 }">
            <TrendingUp v-if="totalProfit > 0" class="h-3.5 w-3.5" />
            <TrendingDown v-else-if="totalProfit < 0" class="h-3.5 w-3.5" />
            <Minus v-else class="h-3.5 w-3.5" />
            {{ formatMoney(totalProfit) }}
          </span>
        </div>
        <div class="overview-item">
          <span class="overview-label">收益率</span>
          <span class="overview-value profit-value" :class="{ profit: totalProfitPct >= 0, loss: totalProfitPct < 0 }">
            {{ formatPct(totalProfitPct) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 盈亏比例柱状图 -->
    <div class="chart-section">
      <div class="section-header">
        <BarChart2 class="h-4 w-4 text-primary" />
        <span class="section-title">各股票盈亏比例</span>
      </div>
      <div v-if="stockStats.length === 0" class="empty-state">
        暂无股票持仓
      </div>
      <svg v-else :width="'100%'" :height="BAR_CHART_H" :viewBox="`0 0 ${BAR_CHART_W} ${BAR_CHART_H}`" preserveAspectRatio="xMidYMid meet">
        <!-- 零线 -->
        <line
          :x1="BAR_PADDING_LEFT"
          :x2="BAR_CHART_W - BAR_PADDING_RIGHT"
          :y1="zeroLineY"
          :y2="zeroLineY"
          class="zero-line"
        />

        <!-- 网格线 -->
        <g class="grid-lines">
          <line
            v-for="i in 2"
            :key="`top-${i}`"
            :x1="BAR_PADDING_LEFT"
            :x2="BAR_CHART_W - BAR_PADDING_RIGHT"
            :y1="zeroLineY - (zeroLineY - BAR_PADDING_TOP) * (i / 2)"
            :y2="zeroLineY - (zeroLineY - BAR_PADDING_TOP) * (i / 2)"
            class="grid-line"
          />
          <line
            v-for="i in 2"
            :key="`bottom-${i}`"
            :x1="BAR_PADDING_LEFT"
            :x2="BAR_CHART_W - BAR_PADDING_RIGHT"
            :y1="zeroLineY + (BAR_CHART_H - BAR_PADDING_BOTTOM - zeroLineY) * (i / 2)"
            :y2="zeroLineY + (BAR_CHART_H - BAR_PADDING_BOTTOM - zeroLineY) * (i / 2)"
            class="grid-line"
          />
        </g>

        <!-- 柱子 -->
        <g class="profit-bars">
          <g v-for="bar in profitBars" :key="bar.id">
            <rect
              :x="bar.x"
              :y="bar.y"
              :width="bar.w"
              :height="bar.h"
              :fill="bar.isPositive ? COLORS.profit : COLORS.loss"
              rx="3"
              class="profit-bar"
            />
            <!-- 百分比标签 -->
            <text
              :x="bar.x + bar.w / 2"
              :y="bar.isPositive ? bar.y - 6 : bar.y + bar.h + 14"
              text-anchor="middle"
              class="bar-value-label"
              :fill="bar.isPositive ? COLORS.profit : COLORS.loss"
            >
              {{ formatPct(bar.profitPct) }}
            </text>
            <!-- 股票代码标签 -->
            <text
              :x="bar.labelX"
              :y="BAR_CHART_H - 8"
              text-anchor="middle"
              class="bar-stock-label"
            >
              {{ bar.symbol }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <!-- 持仓明细 -->
    <div class="holdings-section">
      <div class="section-header">
        <span class="section-title">持仓明细</span>
        <span class="section-count">{{ stockStats.length }} 只股票</span>
      </div>
      <div v-if="stockStats.length === 0" class="empty-state">
        暂无持仓
      </div>
      <div v-else class="holdings-list">
        <div
          v-for="stock in stockStats"
          :key="stock.id"
          class="holding-item"
        >
          <div class="holding-header">
            <span class="holding-symbol">{{ stock.symbol }}</span>
            <span
              class="holding-pnl"
              :class="{ profit: stock.profit >= 0, loss: stock.profit < 0 }"
            >
              {{ formatPct(stock.profitPct) }}
            </span>
          </div>
          <div class="holding-details">
            <div class="detail-row">
              <span class="detail-label">持有数量</span>
              <span class="detail-value">{{ stock.quantity }} 股</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">成本价</span>
              <span class="detail-value">{{ formatMoney(stock.avgCost) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">现价</span>
              <span class="detail-value">{{ formatMoney(stock.currentPrice) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">市值</span>
              <span class="detail-value">{{ formatMoney(stock.currentValue) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">盈亏</span>
              <span class="detail-value" :class="{ profit: stock.profit >= 0, loss: stock.profit < 0 }">
                {{ formatMoney(stock.profit) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-portfolio-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.overview-card {
  background: var(--color-gray-800);
  border: 1px solid var(--color-gray-700);
  border-radius: 12px;
  padding: 12px;
}

.overview-row {
  display: flex;
  gap: 12px;
}

.overview-row + .overview-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-gray-700);
}

.overview-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-label {
  font-size: 11px;
  color: var(--color-gray-400);
  font-weight: 500;
}

.overview-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-gray-100);
}

.profit-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.profit-value.profit {
  color: var(--color-success);
}

.profit-value.loss {
  color: var(--color-destructive);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-gray-200);
}

.section-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-gray-500);
}

.chart-section,
.holdings-section {
  background: var(--color-gray-800);
  border: 1px solid var(--color-gray-700);
  border-radius: 12px;
  padding: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--color-gray-500);
  font-size: 13px;
}

.zero-line {
  stroke: var(--color-gray-500);
  stroke-width: 1;
  stroke-dasharray: 4 2;
}

.grid-line {
  stroke: var(--color-gray-700);
  stroke-width: 1;
  stroke-dasharray: 2 4;
  opacity: 0.5;
}

.profit-bar {
  transition: opacity 0.2s ease;
}

.profit-bar:hover {
  opacity: 0.8;
}

.bar-value-label {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.bar-stock-label {
  font-size: 10px;
  fill: var(--color-gray-400);
  font-family: var(--font-mono);
  font-weight: 500;
}

.holdings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.holding-item {
  background: var(--color-gray-900);
  border: 1px solid var(--color-gray-700);
  border-radius: 10px;
  padding: 10px 12px;
}

.holding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-gray-700);
}

.holding-symbol {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-gray-100);
  font-family: var(--font-mono);
}

.holding-pnl {
  font-size: 13px;
  font-weight: 700;
}

.holding-pnl.profit {
  color: var(--color-success);
}

.holding-pnl.loss {
  color: var(--color-destructive);
}

.holding-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-label {
  color: var(--color-gray-400);
}

.detail-value {
  color: var(--color-gray-200);
  font-weight: 500;
  font-family: var(--font-mono);
}

.detail-value.profit {
  color: var(--color-success);
}

.detail-value.loss {
  color: var(--color-destructive);
}
</style>
