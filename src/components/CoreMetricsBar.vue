<script setup lang="ts">
import { computed } from 'vue'
import { Wallet, TrendingUp, Gem, Target, Info } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { calcFinancialFreedomRatio } from '@/engine/financialEngine'

const gameStore = useGameStore()

const player = computed(() => gameStore.currentPlayer)

const cashDisplay = computed(() => {
  const v = player.value?.cash ?? 0
  return `$${Math.round(v).toLocaleString()}`
})

const cashFlowDisplay = computed(() => {
  const v = player.value?.cashFlow ?? 0
  const sign = v >= 0 ? '+' : '-'
  return `${sign}$${Math.round(Math.abs(v)).toLocaleString()}`
})

const cashFlowPositive = computed(() => (player.value?.cashFlow ?? 0) >= 0)

const netWorthDisplay = computed(() => {
  if (!player.value) return '$0'
  const v = gameStore.calcPlayerNetWorth(player.value)
  const sign = v >= 0 ? '' : '-'
  return `${sign}$${Math.round(Math.abs(v)).toLocaleString()}`
})

const netWorthPositive = computed(() => {
  if (!player.value) return true
  return gameStore.calcPlayerNetWorth(player.value) >= 0
})

const freedomRatio = computed(() => {
  if (!player.value) return 0
  return calcFinancialFreedomRatio(player.value)
})

const freedomPercent = computed(() => {
  return Math.min(100, Math.round(freedomRatio.value * 100))
})

const isFinanciallyFree = computed(() => freedomRatio.value >= 1.0)

const passiveIncomeDisplay = computed(() => {
  const v = player.value?.passiveIncome ?? 0
  return `$${Math.round(v).toLocaleString()}`
})

const totalExpensesDisplay = computed(() => {
  const v = player.value?.totalExpenses ?? 0
  return `$${Math.round(v).toLocaleString()}`
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}
</script>

<template>
  <div class="core-metrics-bar">
    <!-- 现金 -->
    <div class="metric-item">
      <div class="metric-icon cash">
        <Wallet class="w-4 h-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">现金</span>
        <span class="metric-value cash">{{ cashDisplay }}</span>
      </div>
    </div>

    <!-- 月现金流 -->
    <div class="metric-item">
      <div class="metric-icon" :class="cashFlowPositive ? 'cashflow' : 'cashflow-negative'">
        <TrendingUp class="w-4 h-4" :class="{ 'rotate-180': !cashFlowPositive }" />
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
        <Gem class="w-4 h-4" />
      </div>
      <div class="metric-content">
        <span class="metric-label">净资产</span>
        <span class="metric-value" :class="netWorthPositive ? 'networth' : 'networth-negative'">
          {{ netWorthDisplay }}
        </span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="metric-divider"></div>

    <!-- 财务自由度进度 -->
    <div class="freedom-progress">
      <div class="freedom-header">
        <div class="freedom-title">
          <Target class="w-3.5 h-3.5 text-primary" />
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
