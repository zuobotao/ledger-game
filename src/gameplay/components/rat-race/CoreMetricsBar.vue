<script setup lang="ts">
/**
 * CoreMetricsBar — 共享核心指标栏（v2.4.3 Phase 4）
 *
 * 只依赖 GameplayAdapter；与 Single / Multiplayer 共用同一渲染。
 * 指标取当前行动玩家（currentPlayer），与旧 CoreMetricsBar 行为一致。
 */
import { computed } from 'vue'
import { Wallet, TrendingUp, Gem, Target, Banknote, Baby } from 'lucide-vue-next'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { formatMoney } from '@/gameplay/presentation'
import { calcFinancialFreedomRatio } from '@/engine/financialEngine'

const props = defineProps<{
  adapter: GameplayAdapter
}>()

const vm = computed(() => props.adapter.viewModel.value)
const player = computed(() => vm.value.currentPlayer)

const cashDisplay = computed(() => formatMoney(player.value?.cash ?? 0))

const cashFlowDisplay = computed(() => {
  const v = player.value?.cashFlow ?? 0
  const sign = v >= 0 ? '+' : '-'
  return `${sign}${formatMoney(Math.abs(v))}`
})

const cashFlowPositive = computed(() => (player.value?.cashFlow ?? 0) >= 0)

const netWorth = computed(() => vm.value.finance.netWorth)

const netWorthDisplay = computed(() => {
  const v = netWorth.value
  const sign = v >= 0 ? '' : '-'
  return `${sign}${formatMoney(Math.abs(v))}`
})

const netWorthPositive = computed(() => netWorth.value >= 0)

const freedomRatio = computed(() => {
  if (!player.value) return 0
  return calcFinancialFreedomRatio(player.value)
})

const freedomPercent = computed(() => Math.min(100, Math.round(freedomRatio.value * 100)))

const isFinanciallyFree = computed(() => freedomRatio.value >= 1.0)

const passiveIncomeDisplay = computed(() => formatMoney(player.value?.passiveIncome ?? 0))
const totalExpensesDisplay = computed(() => formatMoney(player.value?.totalExpenses ?? 0))
const savingsDisplay = computed(() => formatMoney(player.value?.savings ?? 0))
const childrenCount = computed(() => player.value?.childrenCount ?? 0)
</script>

<template>
  <div class="core-metrics-bar">
    <!-- 现金 -->
    <div class="metric-item">
      <div class="metric-icon cash">
        <Wallet class="h-4 w-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">现金</span>
        <span class="metric-value cash">{{ cashDisplay }}</span>
      </div>
    </div>

    <!-- 存款 -->
    <div class="metric-item">
      <div class="metric-icon savings">
        <Banknote class="h-4 w-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">存款</span>
        <span class="metric-value savings">{{ savingsDisplay }}</span>
      </div>
    </div>

    <!-- 月现金流 -->
    <div class="metric-item">
      <div class="metric-icon" :class="cashFlowPositive ? 'cashflow' : 'cashflow-negative'">
        <TrendingUp class="h-4 w-4" :class="{ 'rotate-180': !cashFlowPositive }" />
      </div>
      <div class="metric-content">
        <span class="metric-label">月现金流</span>
        <span class="metric-value" :class="cashFlowPositive ? 'cashflow' : 'cashflow-negative'">
          {{ cashFlowDisplay }}/月
        </span>
      </div>
    </div>

    <!-- 净资产 -->
    <div class="metric-item">
      <div class="metric-icon" :class="netWorthPositive ? 'networth' : 'networth-negative'">
        <Gem class="h-4 w-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">净资产</span>
        <span class="metric-value" :class="netWorthPositive ? 'networth' : 'networth-negative'">
          {{ netWorthDisplay }}
        </span>
      </div>
    </div>

    <!-- 孩子数量 -->
    <div class="metric-item" title="家庭孩子数量（每月也会计入支出）">
      <div class="metric-icon children">
        <Baby class="h-4 w-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">孩子</span>
        <span class="metric-value children">{{ childrenCount }} 个</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="metric-divider"></div>

    <!-- 财务自由度进度 -->
    <div class="freedom-progress">
      <div class="freedom-header">
        <div class="freedom-title">
          <Target class="h-3.5 w-3.5 text-primary" />
          <span>财务自由度</span>
        </div>
        <span class="freedom-percent" :class="{ 'text-primary': isFinanciallyFree }">
          {{ freedomPercent }}%
        </span>
      </div>
      <div class="freedom-bar-container">
        <div
          class="freedom-bar"
          :class="{ 'freedom-bar-free': isFinanciallyFree }"
          :style="{ width: `${freedomPercent}%` }"
        ></div>
      </div>
      <div class="freedom-detail">
        <span class="text-xs text-muted-foreground">
          被动收入 {{ passiveIncomeDisplay }} / 支出 {{ totalExpensesDisplay }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.core-metrics-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
}

.metric-icon.cash {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.metric-icon.cashflow {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.metric-icon.cashflow-negative {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.metric-icon.networth {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.metric-icon.networth-negative {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.metric-icon.savings {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.metric-icon.children {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
}

.metric-value.savings {
  color: #10b981;
}

.metric-value.children {
  color: #fb923c;
}

.metric-content {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.metric-label {
  font-size: 11px;
  color: var(--muted-foreground);
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.metric-value.cash {
  color: #22c55e;
}

.metric-value.cashflow {
  color: #3b82f6;
}

.metric-value.cashflow-negative {
  color: #ef4444;
}

.metric-value.networth {
  color: #a855f7;
}

.metric-value.networth-negative {
  color: #ef4444;
}

.metric-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

.freedom-progress {
  flex: 1;
  min-width: 160px;
}

.freedom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.freedom-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.freedom-percent {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--foreground);
}

.freedom-bar-container {
  height: 6px;
  background: var(--secondary);
  border-radius: 3px;
  overflow: hidden;
}

.freedom-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.freedom-bar.freedom-bar-free {
  background: linear-gradient(90deg, #22c55e, #10b981);
}

.freedom-detail {
  margin-top: 3px;
}

@media (max-width: 640px) {
  .core-metrics-bar {
    gap: 10px;
    padding: 6px 8px;
    flex-wrap: wrap;
  }

  .metric-item {
    gap: 6px;
  }

  .metric-icon {
    width: 28px;
    height: 28px;
  }

  .metric-value {
    font-size: 13px;
  }

  .metric-divider {
    display: none;
  }

  .freedom-progress {
    width: 100%;
    flex-basis: 100%;
    order: 99;
  }
}
</style>
