<script setup lang="ts">
import { computed } from 'vue'
import { Target, TrendingUp, Trophy } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { formatMoney } from '@/utils/format'

const props = defineProps<{
  phase: 'rat_race' | 'fast_track'
}>()

const gameStore = useGameStore()

// ========== 原始积累阶段目标 ==========
const ratRaceProgress = computed(() => {
  const p = gameStore.viewingPlayer
  if (!p) return { percent: 0, passive: 0, expenses: 0, reached: false }
  const expenses = p.totalExpenses
  const passive = p.passiveIncome
  const percent = expenses > 0 ? Math.min(100, (passive / expenses) * 100) : 0
  return {
    percent,
    passive,
    expenses,
    reached: passive >= expenses,
  }
})

// ========== 资本游戏阶段目标 ==========
const fastTrackProgress = computed(() => {
  const p = gameStore.viewingPlayer
  if (!p) return { dreamPercent: 0, cashPercent: 0, cash: 0, dreamPrice: 0, dreamName: '', hasDream: false }
  const cash = p.cash
  const dream = p.dream
  const dreamPrice = dream?.price ?? 0
  const dreamPercent = dreamPrice > 0 ? Math.min(100, (cash / dreamPrice) * 100) : 0
  // 50M 现金目标
  const cashGoal = 50_000_000
  const cashPercent = Math.min(100, (cash / cashGoal) * 100)
  return {
    dreamPercent,
    cashPercent,
    cash,
    dreamPrice,
    dreamName: dream?.name ?? '',
    hasDream: !!dream,
  }
})
</script>

<template>
  <!-- 原始积累阶段：财务自由进度 -->
  <div v-if="phase === 'rat_race' && gameStore.viewingPlayer" class="goal-progress rat-race-goal">
    <div class="goal-header">
      <div class="goal-title">
        <Target class="goal-icon rat-race-icon" />
        <span class="goal-label">目标：财务自由</span>
      </div>
      <div class="goal-percent" :class="{ reached: ratRaceProgress.reached }">
        {{ ratRaceProgress.percent.toFixed(0) }}%
      </div>
    </div>
    <div class="progress-bar">
      <div
        class="progress-fill rat-race-fill"
        :style="{ width: `${ratRaceProgress.percent}%` }"
      />
    </div>
    <div class="goal-details">
      <span class="detail-item">
        <TrendingUp class="detail-icon" />
        被动收入 {{ formatMoney(ratRaceProgress.passive) }}
      </span>
      <span class="detail-sep">/</span>
      <span class="detail-item">
        总支出 {{ formatMoney(ratRaceProgress.expenses) }}
      </span>
    </div>
    <div v-if="ratRaceProgress.reached" class="goal-achieved">
      <Trophy class="trophy-icon" />
      <span>已达成！你可以进入资本游戏了</span>
    </div>
  </div>

  <!-- 资本游戏阶段：梦想/现金目标进度 -->
  <div v-if="phase === 'fast_track' && gameStore.viewingPlayer" class="goal-progress fast-track-goal">
    <!-- 梦想目标 -->
    <div v-if="fastTrackProgress.hasDream" class="goal-section">
      <div class="goal-header">
        <div class="goal-title">
          <Target class="goal-icon fast-track-icon" />
          <span class="goal-label">梦想：{{ fastTrackProgress.dreamName }}</span>
        </div>
        <div class="goal-percent" :class="{ reached: fastTrackProgress.dreamPercent >= 100 }">
          {{ fastTrackProgress.dreamPercent.toFixed(0) }}%
        </div>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill fast-track-fill"
          :style="{ width: `${fastTrackProgress.dreamPercent}%` }"
        />
      </div>
      <div class="goal-details">
        <span class="detail-item">现金 {{ formatMoney(fastTrackProgress.cash) }}</span>
        <span class="detail-sep">/</span>
        <span class="detail-item">{{ formatMoney(fastTrackProgress.dreamPrice) }}</span>
      </div>
    </div>

    <!-- 50M 现金目标 -->
    <div class="goal-section">
      <div class="goal-header">
        <div class="goal-title">
          <Trophy class="goal-icon cash-goal-icon" />
          <span class="goal-label">现金目标</span>
        </div>
        <div class="goal-percent" :class="{ reached: fastTrackProgress.cashPercent >= 100 }">
          {{ fastTrackProgress.cashPercent.toFixed(0) }}%
        </div>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill cash-goal-fill"
          :style="{ width: `${fastTrackProgress.cashPercent}%` }"
        />
      </div>
      <div class="goal-details">
        <span class="detail-item">现金 {{ formatMoney(fastTrackProgress.cash) }}</span>
        <span class="detail-sep">/</span>
        <span class="detail-item">{{ formatMoney(50000000) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/base.css";

.goal-progress {
  @apply rounded-xl border border-border bg-secondary/30 p-3 backdrop-blur-sm;
}

.goal-section + .goal-section {
  @apply mt-3 pt-3 border-t border-border/50;
}

.goal-header {
  @apply flex items-center justify-between mb-2;
}

.goal-title {
  @apply flex items-center gap-1.5;
}

.goal-icon {
  @apply h-4 w-4;
}

.rat-race-icon {
  @apply text-primary;
}

.fast-track-icon {
  @apply text-amber-400;
}

.cash-goal-icon {
  @apply text-emerald-400;
}

.goal-label {
  @apply text-xs font-medium text-foreground;
}

.goal-percent {
  @apply text-xs font-bold text-muted-foreground;
}

.goal-percent.reached {
  @apply text-success;
}

.progress-bar {
  @apply h-1.5 w-full overflow-hidden rounded-full bg-muted;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-500 ease-out;
}

.rat-race-fill {
  @apply bg-gradient-to-r from-primary to-blue-400;
}

.fast-track-fill {
  @apply bg-gradient-to-r from-amber-400 to-orange-400;
}

.cash-goal-fill {
  @apply bg-gradient-to-r from-emerald-400 to-teal-400;
}

.goal-details {
  @apply mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground;
}

.detail-item {
  @apply flex items-center gap-1;
}

.detail-icon {
  @apply h-3 w-3;
}

.detail-sep {
  @apply text-muted-foreground/50;
}

.goal-achieved {
  @apply mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-success/10 px-2 py-1.5 text-[11px] font-medium text-success;
}

.trophy-icon {
  @apply h-3.5 w-3.5;
}
</style>
