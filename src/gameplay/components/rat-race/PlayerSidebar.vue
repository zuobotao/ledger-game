<script setup lang="ts">
/**
 * PlayerSidebar — 共享玩法左侧栏（v2.4.3 Phase 4/5）
 *
 * 玩家切换（单机多人局）/ 目标进度（老鼠圈财务自由 / 资本游戏梦想+现金目标）/
 * 财务-历史-统计 Tab。只依赖 GameplayAdapter；Single 专属内容（阶段切换、学习模式）
 * 由父层经 sidebar-extra 插槽注入。
 */
import { computed, ref } from 'vue'
import {
  BarChart2,
  History,
  Receipt,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-vue-next'
import type { Player } from '@/types/game'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { formatMoney } from '@/gameplay/presentation'
import FinancialPanel from './FinancialPanel.vue'
import HistoryPanel from './HistoryPanel.vue'
import StatsPanel from './StatsPanel.vue'

const props = withDefaults(
  defineProps<{
    adapter: GameplayAdapter
    spectator?: boolean
    /** 阶段：老鼠圈 / 资本游戏（决定目标进度渲染） */
    phase?: 'rat_race' | 'fast_track'
  }>(),
  {
    spectator: false,
    phase: 'rat_race',
  },
)

const vm = computed(() => props.adapter.viewModel.value)
const isSingle = computed(() => props.adapter.meta.mode === 'single')

const sidePanelTab = ref<'balance' | 'history' | 'stats'>('balance')

const showSwitcher = computed(
  () => isSingle.value && (vm.value.gameState.players.length ?? 0) > 1,
)

// ============ 玩家切换（单机多人局） ============
const showDropdown = ref(false)

function selectPlayer(player: Player) {
  if (player.id === vm.value.currentPlayer.id) {
    props.adapter.setViewingPlayer(vm.value.currentPlayer.id)
  } else {
    props.adapter.setViewingPlayer(player.id)
  }
  showDropdown.value = false
}

function isViewing(player: Player): boolean {
  return vm.value.viewingPlayer.id === player.id
}

function isCurrentTurn(player: Player): boolean {
  return vm.value.currentPlayer.id === player.id
}

// ============ 目标进度（老鼠圈：财务自由） ============
const ratRaceProgress = computed(() => {
  const p = vm.value.viewingPlayer
  const expenses = p.totalExpenses
  const passive = p.passiveIncome
  const percent = expenses > 0 ? Math.min(100, (passive / expenses) * 100) : 0
  return { percent, passive, expenses, reached: passive >= expenses }
})

// ============ 目标进度（资本游戏：梦想 + 现金目标） ============
const FAST_TRACK_CASH_GOAL = 50_000_000

const fastTrackProgress = computed(() => {
  const p = vm.value.viewingPlayer
  const cash = p.cash
  const dream = p.dream
  const dreamPrice = dream?.price ?? 0
  const dreamPercent = dreamPrice > 0 ? Math.min(100, (cash / dreamPrice) * 100) : 0
  const cashPercent = Math.min(100, (cash / FAST_TRACK_CASH_GOAL) * 100)
  return {
    dreamPercent,
    cashPercent,
    cash,
    dreamPrice,
    dreamName: dream?.name ?? '',
    hasDream: !!dream,
  }
})

function formatMoneyFn(n: number): string {
  return formatMoney(n)
}
</script>

<template>
  <aside
    class="player-sidebar order-2 flex min-h-0 flex-col border-t border-border bg-secondary/30 lg:order-1 lg:w-80 lg:overflow-hidden lg:border-r lg:border-t-0 xl:w-96"
  >
    <!-- 玩家切换（单机多人局） -->
    <div v-if="showSwitcher" class="relative px-4 pt-3 lg:px-5">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
        data-testid="player-switcher"
        @click="showDropdown = !showDropdown"
      >
        <span class="flex items-center gap-2">
          <span
            class="h-3 w-3 rounded-full border border-white/20"
            :style="{ backgroundColor: vm.viewingPlayer.color ?? '#888' }"
          />
          <span class="truncate">
            {{ vm.viewingPlayer.name ?? '未选择' }}
            <span v-if="vm.viewingPlayer.isBankrupt" class="text-xs text-destructive">
              · 已破产
            </span>
            <span v-else-if="isCurrentTurn(vm.viewingPlayer)" class="text-xs text-primary">
              · 当前回合
            </span>
            <span v-else class="text-xs text-muted-foreground">· 观战</span>
          </span>
        </span>
        <Users class="h-4 w-4 text-muted-foreground" />
      </button>

      <Transition name="dropdown">
        <div
          v-if="showDropdown"
          class="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-xl backdrop-blur-md lg:left-5 lg:right-5"
        >
          <div class="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            切换查看玩家
          </div>
          <div class="max-h-60 overflow-y-auto py-1">
            <button
              v-for="player in vm.gameState.players"
              :key="player.id"
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted"
              :class="{
                'bg-primary/10': isViewing(player),
                'opacity-50': player.isBankrupt,
              }"
              @click="selectPlayer(player)"
            >
              <span
                class="h-3 w-3 shrink-0 rounded-full border border-white/20"
                :style="{ backgroundColor: player.color }"
              />
              <span class="flex-1 truncate font-medium">
                {{ player.name }}
                <span v-if="player.isAI" class="text-xs text-muted-foreground"> (AI)</span>
                <span v-if="player.isBankrupt" class="text-xs text-destructive"> · 破产</span>
              </span>
              <span v-if="isCurrentTurn(player)" class="text-xs font-medium text-primary">
                回合中
              </span>
              <span v-else-if="isViewing(player)" class="text-xs text-primary">查看中</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 目标进度：老鼠圈 = 财务自由；资本游戏 = 梦想 + 现金目标 -->
    <div v-if="vm.viewingPlayer && phase === 'rat_race'" class="goal-progress rat-race-goal mx-4 mt-3 lg:mx-5">
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
          被动收入 {{ formatMoneyFn(ratRaceProgress.passive) }}
        </span>
        <span class="detail-sep">/</span>
        <span class="detail-item">总支出 {{ formatMoneyFn(ratRaceProgress.expenses) }}</span>
      </div>
      <div v-if="ratRaceProgress.reached" class="goal-achieved">
        <Trophy class="trophy-icon" />
        <span>已达成！你可以进入资本游戏了</span>
      </div>
    </div>

    <div v-if="vm.viewingPlayer && phase === 'fast_track'" class="goal-progress fast-track-goal mx-4 mt-3 lg:mx-5">
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
          <span class="detail-item">现金 {{ formatMoneyFn(fastTrackProgress.cash) }}</span>
          <span class="detail-sep">/</span>
          <span class="detail-item">{{ formatMoneyFn(fastTrackProgress.dreamPrice) }}</span>
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
          <span class="detail-item">现金 {{ formatMoneyFn(fastTrackProgress.cash) }}</span>
          <span class="detail-sep">/</span>
          <span class="detail-item">{{ formatMoneyFn(FAST_TRACK_CASH_GOAL) }}</span>
        </div>
      </div>
    </div>

    <!-- 单机专属内容（阶段切换 / 学习模式）由父层注入 -->
    <div class="px-4 pt-3 lg:px-5">
      <slot name="sidebar-extra" />
    </div>

    <!-- Panel tabs -->
    <div class="flex border-b border-border px-4 pt-3 lg:px-5">
      <button
        type="button"
        class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
        :class="sidePanelTab === 'balance' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        data-testid="side-tab-balance"
        @click="sidePanelTab = 'balance'"
      >
        <span class="flex items-center justify-center gap-1.5">
          <Receipt class="h-4 w-4" />
          财务
        </span>
        <span
          v-if="sidePanelTab === 'balance'"
          class="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary"
        />
      </button>
      <button
        type="button"
        class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
        :class="sidePanelTab === 'history' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        data-testid="side-tab-history"
        @click="sidePanelTab = 'history'"
      >
        <span class="flex items-center justify-center gap-1.5">
          <History class="h-4 w-4" />
          历史
        </span>
        <span
          v-if="sidePanelTab === 'history'"
          class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
        />
      </button>
      <button
        type="button"
        class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
        :class="sidePanelTab === 'stats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        data-testid="side-tab-stats"
        @click="sidePanelTab = 'stats'"
      >
        <span class="flex items-center justify-center gap-1.5">
          <BarChart2 class="h-4 w-4" />
          统计
        </span>
        <span
          v-if="sidePanelTab === 'stats'"
          class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
        />
      </button>
    </div>

    <!-- Panel content -->
    <div class="player-sidebar-panel flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 lg:px-5" data-testid="player-sidebar-panel">
      <FinancialPanel v-if="sidePanelTab === 'balance'" :adapter="adapter" />
      <HistoryPanel v-else-if="sidePanelTab === 'history'" :adapter="adapter" />
      <StatsPanel v-else :adapter="adapter" />
    </div>
  </aside>
</template>

<style scoped>
@reference "../../../assets/base.css";

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.goal-progress {
  @apply rounded-xl border border-border bg-secondary/30 p-3 backdrop-blur-sm;
}

.goal-header {
  @apply mb-2 flex items-center justify-between;
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

.goal-section + .goal-section {
  @apply mt-3 border-t border-border/50 pt-3;
}

/* 手机上把财务、历史、统计收进一个明确的滚动面板，避免内容被外层棋盘页面吞掉。 */
@media (max-width: 1023px) {
  .player-sidebar {
    flex: 0 0 min(68svh, 620px);
    max-height: calc(100svh - 8rem);
    overflow: hidden;
  }
}



.fast-track-icon {
  @apply text-amber-400;
}

.cash-goal-icon {
  @apply text-emerald-400;
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
