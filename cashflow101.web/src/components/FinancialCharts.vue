<script setup lang="ts">
import { computed, ref } from 'vue'
import { PieChart, BarChart3, TrendingUp } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { FinancialSnapshot } from '@/types/game'

const props = defineProps<{
  playerId: string
}>()

const gameStore = useGameStore()

type TabKey = 'assets' | 'income' | 'wealth'
const activeTab = ref<TabKey>('assets')

const player = computed(() => gameStore.players.find((p) => p.id === props.playerId) ?? null)

const snapshots = computed<FinancialSnapshot[]>(() => player.value?.financialSnapshots ?? [])

// 当前财务数据（用于饼图）
const currentFinance = computed(() => {
  const p = player.value
  if (!p) return null
  const stockValue = p.assets
    .filter((a) => a.type === 'stock')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const realEstateValue = p.assets
    .filter((a) => a.type === 'real_estate')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const businessValue = p.assets
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const cashValue = p.cash + p.savings
  const total = cashValue + stockValue + realEstateValue + businessValue
  return { cashValue, stockValue, realEstateValue, businessValue, total }
})

// ========== 颜色方案 ==========
const COLORS = {
  cash: '#facc15',
  stock: '#3b82f6',
  realEstate: '#22c55e',
  business: '#a855f7',
  income: '#22c55e',
  expense: '#ef4444',
  netWorth: '#f97316',
  totalAssets: '#3b82f6',
  cashFlow: '#06b6d4',
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

// ========== 饼图：资产结构 ==========
const pieData = computed(() => {
  if (!currentFinance.value) return []
  const { cashValue, stockValue, realEstateValue, businessValue } = currentFinance.value
  return [
    { label: '现金', value: cashValue, color: COLORS.cash, key: 'cash' },
    { label: '股票', value: stockValue, color: COLORS.stock, key: 'stock' },
    { label: '房地产', value: realEstateValue, color: COLORS.realEstate, key: 'realEstate' },
    { label: '企业', value: businessValue, color: COLORS.business, key: 'business' },
  ].filter((d) => d.value > 0)
})

const hoveredPieSlice = ref<string | null>(null)

// 饼图尺寸
const PIE_SIZE = 200
const PIE_CENTER = PIE_SIZE / 2
const PIE_OUTER_RADIUS = 85
const PIE_INNER_RADIUS = 55

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle)
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle)
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle)
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return [
    'M', outerStart.x, outerStart.y,
    'A', rOuter, rOuter, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    'L', innerStart.x, innerStart.y,
    'A', rInner, rInner, 0, largeArc, 1, innerEnd.x, innerEnd.y,
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
    const path = describeArc(PIE_CENTER, PIE_CENTER, PIE_OUTER_RADIUS, PIE_INNER_RADIUS, startAngle, endAngle)
    const midAngle = (startAngle + endAngle) / 2
    const labelPos = polarToCartesian(PIE_CENTER, PIE_CENTER, (PIE_OUTER_RADIUS + PIE_INNER_RADIUS) / 2, midAngle)
    return { ...d, path, startAngle, endAngle, midAngle, labelPos, percentage: (d.value / total) * 100 }
  })
})

// ========== 柱状图：收支对比 ==========
const barChartData = computed(() => {
  const snaps = snapshots.value.slice(-12)
  return snaps.map((s) => ({
    turn: s.turn,
    income: s.totalIncome,
    expense: s.totalExpenses,
  }))
})

const BAR_CHART_W = 360
const BAR_CHART_H = 200
const BAR_PADDING_TOP = 20
const BAR_PADDING_BOTTOM = 30
const BAR_PADDING_LEFT = 50
const BAR_PADDING_RIGHT = 10

const barChartMax = computed(() => {
  const data = barChartData.value
  if (data.length === 0) return 1000
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1)
  // 向上取整到最近的"好看"的数
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)))
  return Math.ceil(maxVal / magnitude) * magnitude
})

const barChartYLabels = computed(() => {
  const max = barChartMax.value
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => ({
    value: (max / steps) * i,
    y: BAR_PADDING_TOP + BAR_CHART_H - BAR_PADDING_BOTTOM - ((BAR_CHART_H - BAR_PADDING_TOP - BAR_PADDING_BOTTOM) / steps) * i,
  }))
})

const barGroups = computed(() => {
  const data = barChartData.value
  if (data.length === 0) return []
  const chartInnerW = BAR_CHART_W - BAR_PADDING_LEFT - BAR_PADDING_RIGHT
  const groupW = chartInnerW / data.length
  const barW = Math.min(12, groupW * 0.35)
  const maxVal = barChartMax.value
  const chartInnerH = BAR_CHART_H - BAR_PADDING_TOP - BAR_PADDING_BOTTOM

  return data.map((d, i) => {
    const groupX = BAR_PADDING_LEFT + groupW * i + groupW / 2
    const incomeH = (d.income / maxVal) * chartInnerH
    const expenseH = (d.expense / maxVal) * chartInnerH
    const baseY = BAR_PADDING_TOP + chartInnerH
    return {
      turn: d.turn,
      income: d.income,
      expense: d.expense,
      x: groupX,
      incomeBar: {
        x: groupX - barW - 2,
        y: baseY - incomeH,
        w: barW,
        h: incomeH,
      },
      expenseBar: {
        x: groupX + 2,
        y: baseY - expenseH,
        w: barW,
        h: expenseH,
      },
      showLabel: data.length <= 8 || i % Math.ceil(data.length / 6) === 0,
    }
  })
})

// ========== 折线图：财富趋势 ==========
const lineChartData = computed(() => {
  const snaps = snapshots.value.slice(-20)
  return snaps.map((s) => ({
    turn: s.turn,
    netWorth: s.netWorth,
    totalAssets: s.totalAssets,
    monthlyCashFlow: s.monthlyCashFlow,
  }))
})

const LINE_CHART_W = 360
const LINE_CHART_H = 220
const LINE_PADDING_TOP = 20
const LINE_PADDING_BOTTOM = 30
const LINE_PADDING_LEFT = 50
const LINE_PADDING_RIGHT = 10

const lineChartMax = computed(() => {
  const data = lineChartData.value
  if (data.length === 0) return 1000
  const allVals = data.flatMap((d) => [d.netWorth, d.totalAssets, d.monthlyCashFlow])
  const maxVal = Math.max(...allVals.map((v) => Math.abs(v)), 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)))
  return Math.ceil(maxVal / magnitude) * magnitude
})

const lineChartYLabels = computed(() => {
  const max = lineChartMax.value
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => ({
    value: (max / steps) * i,
    y: LINE_PADDING_TOP + LINE_CHART_H - LINE_PADDING_BOTTOM - ((LINE_CHART_H - LINE_PADDING_TOP - LINE_PADDING_BOTTOM) / steps) * i,
  }))
})

const linePoints = computed(() => {
  const data = lineChartData.value
  if (data.length < 2) return null
  const chartInnerW = LINE_CHART_W - LINE_PADDING_LEFT - LINE_PADDING_RIGHT
  const chartInnerH = LINE_CHART_H - LINE_PADDING_TOP - LINE_PADDING_BOTTOM
  const maxVal = lineChartMax.value
  const baseY = LINE_PADDING_TOP + chartInnerH

  const xStep = data.length > 1 ? chartInnerW / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = LINE_PADDING_LEFT + xStep * i
    return {
      turn: d.turn,
      x,
      netWorthY: baseY - (d.netWorth / maxVal) * chartInnerH,
      totalAssetsY: baseY - (d.totalAssets / maxVal) * chartInnerH,
      cashFlowY: baseY - (d.monthlyCashFlow / maxVal) * chartInnerH,
      showLabel: data.length <= 8 || i % Math.ceil(data.length / 6) === 0,
    }
  })

  const toPath = (key: 'netWorthY' | 'totalAssetsY' | 'cashFlowY') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p[key]}`).join(' ')

  return {
    points,
    netWorthPath: toPath('netWorthY'),
    totalAssetsPath: toPath('totalAssetsY'),
    cashFlowPath: toPath('cashFlowY'),
  }
})

const hoveredLinePoint = ref<number | null>(null)
const hoveredBarGroup = ref<number | null>(null)

// Tooltip 位置计算
const lineTooltipStyle = computed(() => {
  if (hoveredLinePoint.value === null || !linePoints.value) return {}
  const point = linePoints.value.points[hoveredLinePoint.value]
  if (!point) return {}
  // 基于 SVG viewBox 坐标，转为百分比
  const xPct = (point.x / LINE_CHART_W) * 100
  return {
    left: `${xPct}%`,
    transform: 'translateX(-50%)',
  }
})

const barTooltipStyle = computed(() => {
  if (hoveredBarGroup.value === null) return {}
  const group = barGroups.value[hoveredBarGroup.value]
  if (!group) return {}
  const xPct = (group.x / BAR_CHART_W) * 100
  return {
    left: `${xPct}%`,
    transform: 'translateX(-50%)',
  }
})

const hoveredLineData = computed(() => {
  if (hoveredLinePoint.value === null || !linePoints.value) return null
  const point = linePoints.value.points[hoveredLinePoint.value]
  const data = lineChartData.value[hoveredLinePoint.value]
  if (!point || !data) return null
  return {
    turn: data.turn,
    netWorth: data.netWorth,
    totalAssets: data.totalAssets,
    monthlyCashFlow: data.monthlyCashFlow,
  }
})

const hoveredBarData = computed(() => {
  if (hoveredBarGroup.value === null) return null
  const group = barGroups.value[hoveredBarGroup.value]
  if (!group) return null
  return {
    turn: group.turn,
    income: group.income,
    expense: group.expense,
  }
})
</script>

<template>
  <div class="financial-charts">
    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'assets' }"
        @click="activeTab = 'assets'"
      >
        <PieChart class="h-4 w-4" />
        <span>资产结构</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'income' }"
        @click="activeTab = 'income'"
      >
        <BarChart3 class="h-4 w-4" />
        <span>收支对比</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'wealth' }"
        @click="activeTab = 'wealth'"
      >
        <TrendingUp class="h-4 w-4" />
        <span>财富趋势</span>
      </button>
    </div>

    <!-- Chart content -->
    <div class="chart-content">
      <!-- 饼图：资产结构 -->
      <div v-if="activeTab === 'assets'" class="chart-panel">
        <div v-if="pieData.length === 0" class="empty-state">
          暂无资产数据
        </div>
        <template v-else>
          <div class="pie-chart-wrapper">
            <svg :width="PIE_SIZE" :height="PIE_SIZE" :viewBox="`0 0 ${PIE_SIZE} ${PIE_SIZE}`">
              <g>
                <path
                  v-for="slice in pieSlices"
                  :key="slice.key"
                  :d="slice.path"
                  :fill="slice.color"
                  :opacity="hoveredPieSlice === null || hoveredPieSlice === slice.key ? 1 : 0.4"
                  class="pie-slice"
                  @mouseenter="hoveredPieSlice = slice.key"
                  @mouseleave="hoveredPieSlice = null"
                />
              </g>
              <!-- 中心文字 -->
              <text
                :x="PIE_CENTER"
                :y="PIE_CENTER - 6"
                text-anchor="middle"
                class="pie-center-label"
              >
                总资产
              </text>
              <text
                :x="PIE_CENTER"
                :y="PIE_CENTER + 14"
                text-anchor="middle"
                class="pie-center-value"
              >
                {{ formatMoney(currentFinance?.total ?? 0) }}
              </text>
            </svg>

            <!-- Tooltip -->
            <div
              v-if="hoveredPieSlice"
              class="pie-tooltip"
            >
              <div class="tooltip-label">
                <span class="tooltip-dot" :style="{ backgroundColor: pieSlices.find(s => s.key === hoveredPieSlice)?.color }" />
                {{ pieSlices.find(s => s.key === hoveredPieSlice)?.label }}
              </div>
              <div class="tooltip-value">
                {{ formatMoney(pieSlices.find(s => s.key === hoveredPieSlice)?.value ?? 0) }}
              </div>
              <div class="tooltip-pct">
                {{ pieSlices.find(s => s.key === hoveredPieSlice)?.percentage.toFixed(1) }}%
              </div>
            </div>
          </div>

          <!-- 图例 -->
          <div class="pie-legend">
            <div
              v-for="item in pieData"
              :key="item.key"
              class="legend-item"
              @mouseenter="hoveredPieSlice = item.key"
              @mouseleave="hoveredPieSlice = null"
            >
              <span class="legend-dot" :style="{ backgroundColor: item.color }" />
              <span class="legend-label">{{ item.label }}</span>
              <span class="legend-value">{{ formatMoney(item.value) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 柱状图：收支对比 -->
      <div v-else-if="activeTab === 'income'" class="chart-panel">
        <div v-if="barGroups.length === 0" class="empty-state">
          暂无收支数据
        </div>
        <div v-else class="bar-chart-wrapper">
        <svg :width="'100%'" :height="BAR_CHART_H" :viewBox="`0 0 ${BAR_CHART_W} ${BAR_CHART_H}`" preserveAspectRatio="xMidYMid meet">
          <!-- Y轴网格线 -->
          <g class="grid-lines">
            <line
              v-for="(label, i) in barChartYLabels"
              :key="i"
              :x1="BAR_PADDING_LEFT"
              :x2="BAR_CHART_W - BAR_PADDING_RIGHT"
              :y1="label.y"
              :y2="label.y"
              class="grid-line"
            />
          </g>

          <!-- Y轴标签 -->
          <g class="y-labels">
            <text
              v-for="(label, i) in barChartYLabels"
              :key="i"
              :x="BAR_PADDING_LEFT - 8"
              :y="label.y + 4"
              text-anchor="end"
              class="axis-label"
            >
              {{ formatMoney(label.value) }}
            </text>
          </g>

          <!-- X轴基线 -->
          <line
            :x1="BAR_PADDING_LEFT"
            :x2="BAR_CHART_W - BAR_PADDING_RIGHT"
            :y1="BAR_PADDING_TOP + BAR_CHART_H - BAR_PADDING_BOTTOM"
            :y2="BAR_PADDING_TOP + BAR_CHART_H - BAR_PADDING_BOTTOM"
            class="axis-line"
          />

          <!-- 柱状图 -->
          <g class="bars">
            <g v-for="(group, i) in barGroups" :key="i">
              <!-- 收入柱 -->
              <rect
                :x="group.incomeBar.x"
                :y="group.incomeBar.y"
                :width="group.incomeBar.w"
                :height="group.incomeBar.h"
                :fill="COLORS.income"
                rx="2"
                class="bar-rect"
                @mouseenter="hoveredBarGroup = i"
                @mouseleave="hoveredBarGroup = null"
              />
              <!-- 支出柱 -->
              <rect
                :x="group.expenseBar.x"
                :y="group.expenseBar.y"
                :width="group.expenseBar.w"
                :height="group.expenseBar.h"
                :fill="COLORS.expense"
                rx="2"
                class="bar-rect"
                @mouseenter="hoveredBarGroup = i"
                @mouseleave="hoveredBarGroup = null"
              />
            </g>
          </g>

          <!-- X轴标签 -->
          <g class="x-labels">
            <text
              v-for="(group, i) in barGroups"
              v-show="group.showLabel"
              :key="i"
              :x="group.x"
              :y="BAR_CHART_H - 10"
              text-anchor="middle"
              class="axis-label"
            >
              R{{ group.turn }}
            </text>
          </g>
        </svg>

          <!-- Bar chart tooltip -->
          <div v-if="hoveredBarData" class="chart-tooltip" :style="barTooltipStyle">
            <div class="tooltip-title">第 {{ hoveredBarData.turn }} 回合</div>
            <div class="tooltip-row">
              <span class="tooltip-dot" :style="{ backgroundColor: COLORS.income }"></span>
              <span class="tooltip-name">收入</span>
              <span class="tooltip-val">{{ formatMoney(hoveredBarData.income) }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-dot" :style="{ backgroundColor: COLORS.expense }"></span>
              <span class="tooltip-name">支出</span>
              <span class="tooltip-val">{{ formatMoney(hoveredBarData.expense) }}</span>
            </div>
            <div class="tooltip-row net-row">
              <span class="tooltip-name">净收入</span>
              <span class="tooltip-val" :class="hoveredBarData.income - hoveredBarData.expense >= 0 ? 'text-success' : 'text-destructive'">
                {{ formatMoney(hoveredBarData.income - hoveredBarData.expense) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="bar-legend">
          <div class="legend-item">
            <span class="legend-bar" :style="{ backgroundColor: COLORS.income }" />
            <span class="legend-label">收入</span>
          </div>
          <div class="legend-item">
            <span class="legend-bar" :style="{ backgroundColor: COLORS.expense }" />
            <span class="legend-label">支出</span>
          </div>
        </div>
      </div>

      <!-- 折线图：财富趋势 -->
      <div v-else-if="activeTab === 'wealth'" class="chart-panel">
        <div v-if="!linePoints" class="empty-state">
          暂无趋势数据，完成更多回合后显示
        </div>
        <div v-else class="line-chart-wrapper">
        <svg :width="'100%'" :height="LINE_CHART_H" :viewBox="`0 0 ${LINE_CHART_W} ${LINE_CHART_H}`" preserveAspectRatio="xMidYMid meet">
          <!-- Y轴网格线 -->
          <g class="grid-lines">
            <line
              v-for="(label, i) in lineChartYLabels"
              :key="i"
              :x1="LINE_PADDING_LEFT"
              :x2="LINE_CHART_W - LINE_PADDING_RIGHT"
              :y1="label.y"
              :y2="label.y"
              class="grid-line"
            />
          </g>

          <!-- Y轴标签 -->
          <g class="y-labels">
            <text
              v-for="(label, i) in lineChartYLabels"
              :key="i"
              :x="LINE_PADDING_LEFT - 8"
              :y="label.y + 4"
              text-anchor="end"
              class="axis-label"
            >
              {{ formatMoney(label.value) }}
            </text>
          </g>

          <!-- X轴基线 -->
          <line
            :x1="LINE_PADDING_LEFT"
            :x2="LINE_CHART_W - LINE_PADDING_RIGHT"
            :y1="LINE_PADDING_TOP + LINE_CHART_H - LINE_PADDING_BOTTOM"
            :y2="LINE_PADDING_TOP + LINE_CHART_H - LINE_PADDING_BOTTOM"
            class="axis-line"
          />

          <!-- 折线：总资产 -->
          <path
            :d="linePoints.totalAssetsPath"
            fill="none"
            :stroke="COLORS.totalAssets"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="line-path"
          />

          <!-- 折线：净资产 -->
          <path
            :d="linePoints.netWorthPath"
            fill="none"
            :stroke="COLORS.netWorth"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="line-path"
          />

          <!-- 折线：月现金流 -->
          <path
            :d="linePoints.cashFlowPath"
            fill="none"
            :stroke="COLORS.cashFlow"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="line-path"
          />

          <!-- 数据点 -->
          <g class="data-points">
            <g v-for="(point, i) in linePoints.points" :key="i">
              <circle
                :cx="point.x"
                :cy="point.totalAssetsY"
                r="4"
                :fill="COLORS.totalAssets"
                class="data-point"
                @mouseenter="hoveredLinePoint = i"
                @mouseleave="hoveredLinePoint = null"
              />
              <circle
                :cx="point.x"
                :cy="point.netWorthY"
                r="4"
                :fill="COLORS.netWorth"
                class="data-point"
                @mouseenter="hoveredLinePoint = i"
                @mouseleave="hoveredLinePoint = null"
              />
              <circle
                :cx="point.x"
                :cy="point.cashFlowY"
                r="4"
                :fill="COLORS.cashFlow"
                class="data-point"
                @mouseenter="hoveredLinePoint = i"
                @mouseleave="hoveredLinePoint = null"
              />
            </g>
          </g>

          <!-- X轴标签 -->
          <g class="x-labels">
            <text
              v-for="(point, i) in linePoints.points"
              v-show="point.showLabel"
              :key="i"
              :x="point.x"
              :y="LINE_CHART_H - 10"
              text-anchor="middle"
              class="axis-label"
            >
              R{{ point.turn }}
            </text>
          </g>
        </svg>

          <!-- Line chart tooltip -->
          <div v-if="hoveredLineData" class="chart-tooltip" :style="lineTooltipStyle">
            <div class="tooltip-title">第 {{ hoveredLineData.turn }} 回合</div>
            <div class="tooltip-row">
              <span class="tooltip-dot" :style="{ backgroundColor: COLORS.netWorth }"></span>
              <span class="tooltip-name">净资产</span>
              <span class="tooltip-val">{{ formatMoney(hoveredLineData.netWorth) }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-dot" :style="{ backgroundColor: COLORS.totalAssets }"></span>
              <span class="tooltip-name">总资产</span>
              <span class="tooltip-val">{{ formatMoney(hoveredLineData.totalAssets) }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-dot" :style="{ backgroundColor: COLORS.cashFlow }"></span>
              <span class="tooltip-name">月现金流</span>
              <span class="tooltip-val">{{ formatMoney(hoveredLineData.monthlyCashFlow) }}</span>
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="line-legend">
          <div class="legend-item">
            <span class="legend-line" :style="{ backgroundColor: COLORS.netWorth }" />
            <span class="legend-label">净资产</span>
          </div>
          <div class="legend-item">
            <span class="legend-line" :style="{ backgroundColor: COLORS.totalAssets }" />
            <span class="legend-label">总资产</span>
          </div>
          <div class="legend-item">
            <span class="legend-line" :style="{ backgroundColor: COLORS.cashFlow }" />
            <span class="legend-label">月现金流</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-charts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-gray-800);
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-gray-400);
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--color-gray-200);
  background: var(--color-gray-700);
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
}

.chart-content {
  width: 100%;
}

.chart-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  color: var(--color-gray-500);
  font-size: 13px;
  width: 100%;
}

/* 饼图 */
.pie-chart-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.pie-slice {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.pie-center-label {
  font-size: 11px;
  fill: var(--color-gray-400);
  font-weight: 500;
}

.pie-center-value {
  font-size: 16px;
  fill: var(--color-gray-100);
  font-weight: 700;
}

.pie-tooltip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: var(--color-gray-900);
  border: 1px solid var(--color-gray-600);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.tooltip-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-gray-300);
  font-weight: 500;
}

.tooltip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tooltip-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-gray-100);
  margin-top: 2px;
}

.tooltip-pct {
  font-size: 11px;
  color: var(--color-gray-400);
}

.pie-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.legend-item:hover {
  background: var(--color-gray-800);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-bar {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  color: var(--color-gray-300);
  flex: 1;
}

.legend-value {
  color: var(--color-gray-200);
  font-weight: 600;
  font-size: 11px;
}

/* 柱状图/折线图 */
.grid-line {
  stroke: var(--color-gray-700);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.axis-line {
  stroke: var(--color-gray-600);
  stroke-width: 1;
}

.axis-label {
  font-size: 10px;
  fill: var(--color-gray-500);
  font-family: var(--font-mono);
}

.bar-rect {
  transition: opacity 0.2s ease;
}

.bar-rect:hover {
  opacity: 0.8;
}

.bar-legend,
.line-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.bar-legend .legend-item,
.line-legend .legend-item {
  cursor: default;
  padding: 0;
}

.bar-legend .legend-item:hover,
.line-legend .legend-item:hover {
  background: transparent;
}

.line-path {
  transition: stroke-width 0.2s ease;
}

.data-point {
  transition: r 0.2s ease;
  cursor: pointer;
}

.data-point:hover {
  r: 6;
}

/* Chart wrappers for tooltip positioning */
.bar-chart-wrapper,
.line-chart-wrapper {
  position: relative;
  width: 100%;
}

/* Shared chart tooltip */
.chart-tooltip {
  position: absolute;
  top: 8px;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid var(--color-gray-600);
  border-radius: 10px;
  padding: 10px 12px;
  z-index: 20;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  min-width: 140px;
}

.chart-tooltip .tooltip-title {
  font-size: 11px;
  color: var(--color-gray-400);
  font-weight: 500;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-gray-700);
}

.chart-tooltip .tooltip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 2px 0;
}

.chart-tooltip .tooltip-row.net-row {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--color-gray-700);
  font-weight: 600;
}

.chart-tooltip .tooltip-name {
  color: var(--color-gray-400);
  flex: 1;
}

.chart-tooltip .tooltip-val {
  color: var(--color-gray-100);
  font-weight: 600;
  font-family: var(--font-mono);
}

.text-success {
  color: #22c55e;
}

.text-destructive {
  color: #ef4444;
}
</style>
