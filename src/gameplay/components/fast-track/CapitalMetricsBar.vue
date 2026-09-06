<script setup lang="ts">
/**
 * CapitalMetricsBar — 共享资本游戏指标栏（v2.4.3 Phase 5）
 *
 * 只依赖 GameplayAdapter；与 Single / Multiplayer 共用同一渲染。
 * 指标取当前行动玩家（currentPlayer）：现金 / 存款 / 月现金流 / 净资产 / 梦想进度。
 */
import { computed } from 'vue'
import { Banknote, Gem, Target, TrendingUp, Trophy, Wallet } from 'lucide-vue-next'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { formatMoney } from '@/gameplay/presentation'

const props = defineProps<{
  adapter: GameplayAdapter
}>()

const vm = computed(() => props.adapter.viewModel.value)
const player = computed(() => vm.value.currentPlayer)

const FAST_TRACK_CASH_GOAL = 50_000_000

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

const savingsDisplay = computed(() => formatMoney(player.value?.savings ?? 0))

// ============ 梦想进度 ============
const dreamProgress = computed(() => {
  const p = player.value
  const cash = p?.cash ?? 0
  const dream = p?.dream
  const dreamPrice = dream?.price ?? 0
  const dreamPercent = dreamPrice > 0 ? Math.min(100, (cash / dreamPrice) * 100) : 0
  const cashPercent = Math.min(100, (cash / FAST_TRACK_CASH_GOAL) * 100)
  return {
    dreamName: dream?.name ?? '',
    dreamPercent,
    dreamReached: dreamPercent >= 100,
    cash,
    dreamPrice,
    cashPercent,
    cashReached: cashPercent >= 100,
  }
})
</script>

<template>
  <div class="capital-metrics-bar">
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

    <!-- 分隔线 -->
    <div class="metric-divider"></div>

    <!-- 梦想进度 -->
    <div class="dream-progress">
      <div class="dream-header">
        <div class="dream-title">
          <Target v-if="dreamProgress.dreamName" class="h-3.5 w-3.5 text-amber-400" />
          <Trophy v-else class="h-3.5 w-3.5 text-emerald-400" />
          <span>{{ dreamProgress.dreamName || '现金目标' }}</span>
        </div>
        <span
          class="dream-percent"
          :class="{
            'text-amber-400': dreamProgress.dreamName && !dreamProgress.dreamReached,
            'text-success': dreamProgress.dreamReached,
          }"
        >
          {{
            dreamProgress.dreamName
              ? `${dreamProgress.dreamPercent.toFixed(0)}%`
              : `${dreamProgress.cashPercent.toFixed(0)}%`
          }}
        </span>
      </div>
      <div class="dream-bar-container">
        <div
          class="dream-bar"
          :class="{
            'dream-bar-amber': dreamProgress.dreamName && !dreamProgress.dreamReached,
            'dream-bar-green': !dreamProgress.dreamName || dreamProgress.dreamReached,
          }"
          :style="{
            width: `${dreamProgress.dreamName ? dreamProgress.dreamPercent : dreamProgress.cashPercent}%`,
          }"
        ></div>
      </div>
      <div class="dream-detail">
        <span class="text-xs text-muted-foreground">
          {{
            dreamProgress.dreamName
              ? `现金 ${formatMoney(dreamProgress.cash)} / ${formatMoney(dreamProgress.dreamPrice)}`
              : `现金 ${formatMoney(dreamProgress.cash)} / ${formatMoney(FAST_TRACK_CASH_GOAL)}`
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capital-metrics-bar {
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

.metric-value.savings {
  color: #10b981;
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

.dream-progress {
  flex: 1;
  min-width: 160px;
}

.dream-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dream-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.dream-percent {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--foreground);
}

.dream-bar-container {
  height: 6px;
  background: var(--secondary);
  border-radius: 3px;
  overflow: hidden;
}

.dream-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.dream-bar-amber {
  background: linear-gradient(90deg, #f59e0b, #fb923c);
}

.dream-bar-green {
  background: linear-gradient(90deg, #10b981, #14b8a6);
}

.dream-detail {
  margin-top: 3px;
}

@media (max-width: 640px) {
  .capital-metrics-bar {
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

  .dream-progress {
    width: 100%;
    flex-basis: 100%;
    order: 99;
  }
}
</style>
