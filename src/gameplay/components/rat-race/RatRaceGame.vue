<script setup lang="ts">
/**
 * RatRaceGame — 共享老鼠圈玩法页（v2.4.3 Phase 4 / §7）
 *
 * Single / Multiplayer 最终都渲染 <RatRaceGame :adapter="..." />。
 * 组件只依赖 GameplayAdapter；弹窗状态（银行 / 决策反馈）由本层持有。
 *
 * 单机专属流程（进入资本阶段的总结确认、路由跳转、AI 导师、学习模式等）
 * 由容器视图经插槽 / 事件注入，不写死在本组件。
 */
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Check, Landmark, Lightbulb, X } from 'lucide-vue-next'
import type { FinancialDelta, GameWarning } from '@/engine/contract'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import type { BankPanelTab } from '@/gameplay/types'
import GameHeader from './GameHeader.vue'
import CoreMetricsBar from './CoreMetricsBar.vue'
import FastTrackEligibilityBar from './FastTrackEligibilityBar.vue'
import PlayerSidebar from './PlayerSidebar.vue'
import RatRaceBoardPanel from './RatRaceBoardPanel.vue'
import BankPanel from './BankPanel.vue'

const props = withDefaults(
  defineProps<{
    adapter: GameplayAdapter
    spectator?: boolean
    showBack?: boolean
  }>(),
  {
    spectator: false,
    showBack: true,
  },
)

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'enter-fast-track'): void
}>()

const vm = computed(() => props.adapter.viewModel.value)
const isSingle = computed(() => props.adapter.meta.mode === 'single')

// ============ 银行弹窗 ============
const bankOpen = ref(false)
const bankTab = ref<BankPanelTab>('deposit')

function openBank(tab: BankPanelTab) {
  bankTab.value = tab
  bankOpen.value = true
}

// ============ 资本资格栏（当前行动玩家且非 AI / 观战时显示） ============
const showEligibilityBar = computed(() => {
  const p = vm.value.currentPlayer
  return (
    !props.spectator &&
    !p?.isAI &&
    p?.phase === 'rat_race'
  )
})

// ============ 单机决策反馈弹窗（多人由 GameBoardSection 的 toast 反馈） ============
const feedbackOpen = ref(false)

const deltaKeys: { key: keyof FinancialDelta; label: string }[] = [
  { key: 'cash', label: '现金' },
  { key: 'cashFlow', label: '月现金流' },
  { key: 'passiveIncome', label: '被动收入' },
  { key: 'assets', label: '总资产' },
  { key: 'liabilities', label: '总负债' },
  { key: 'netWorth', label: '净资产' },
]

function hasNonZeroDelta(delta: FinancialDelta): boolean {
  return Object.values(delta).some((v) => Math.abs(v) >= 1)
}

watch(
  () => vm.value.lastAction,
  (la, prev) => {
    if (!isSingle.value) return
    if (la && la !== prev && la.delta && hasNonZeroDelta(la.delta)) {
      feedbackOpen.value = true
    }
  },
)

const feedback = computed(() => (isSingle.value ? vm.value.lastAction : null))
const visibleWarnings = computed(() => {
  const warnings = feedback.value?.warnings ?? []
  const seen = new Set<string>()
  return warnings.filter((warning) => {
    const key = `${warning.level}:${warning.title ?? ''}:${warning.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})
const visibleMetrics = computed(() => {
  const delta = feedback.value?.delta
  if (!delta) return []
  return deltaKeys.filter((m) => Math.abs(delta[m.key]) >= 1)
})

function fmt(n: number, showSign = true): string {
  const abs = Math.abs(Math.round(n))
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${showSign ? sign : ''}$${abs.toLocaleString()}`
}

function warningLevelClass(level: string): string {
  switch (level) {
    case 'high':
      return 'text-red-500 bg-red-500/10'
    case 'medium':
      return 'text-amber-500 bg-amber-500/10'
    case 'low':
      return 'text-blue-500 bg-blue-500/10'
    default:
      return 'text-muted-foreground bg-secondary'
  }
}

function warningTitle(w: GameWarning): string {
  return w.title ?? (w.type === 'risk' ? '风险提示' : '学习提示')
}
</script>

<template>
  <main class="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
    <!-- 顶栏 -->
    <GameHeader
      :adapter="adapter"
      :spectator="spectator"
      :show-back="showBack"
      @back="emit('back')"
      @open-bank="openBank"
    />

    <!-- 核心指标栏 -->
    <div class="shrink-0 border-b border-border bg-card/50 px-3 py-2 sm:px-6 sm:py-2.5">
      <CoreMetricsBar :adapter="adapter" />
    </div>

    <!-- 资本游戏资格面板 -->
    <div
      v-if="showEligibilityBar"
      class="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 px-2 py-1 backdrop-blur-sm sm:px-3 sm:pt-2 lg:static lg:border-0 lg:bg-transparent lg:px-6 lg:py-0 lg:pt-2 lg:backdrop-blur-none"
    >
      <FastTrackEligibilityBar :adapter="adapter" @enter="emit('enter-fast-track')" />
    </div>

    <!-- Game area -->
    <div class="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <PlayerSidebar :adapter="adapter" :spectator="spectator">
        <template #sidebar-extra>
          <slot name="sidebar-extra" />
        </template>
      </PlayerSidebar>

      <RatRaceBoardPanel :adapter="adapter">
        <template #board-extra>
          <slot name="board-extra" />
        </template>
        <template #pending-panel>
          <slot name="pending-panel" />
        </template>
      </RatRaceBoardPanel>
    </div>

    <!-- 银行弹窗 -->
    <Teleport to="body">
      <Transition name="rr-modal">
        <div
          v-if="bankOpen"
          class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          @click.self="bankOpen = false"
        >
          <div
            class="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl sm:max-h-[88vh]"
            role="dialog"
            aria-modal="true"
          >
            <div class="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 class="flex items-center gap-2 text-lg font-bold">
                <Landmark class="h-5 w-5 text-primary" />
                银行与财务
              </h2>
              <button
                type="button"
                class="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="关闭"
                data-testid="bank-close"
                @click="bankOpen = false"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              <BankPanel :adapter="adapter" :initial-tab="bankTab" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 单机决策反馈弹窗 -->
    <Teleport to="body">
      <Transition name="rr-modal">
        <div
          v-if="feedbackOpen && feedback"
          class="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          @click.self="feedbackOpen = false"
        >
          <div class="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
            <!-- 头部 -->
            <div class="flex items-start gap-3 border-b border-border bg-gradient-to-b from-card to-background p-5">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <Check class="h-5 w-5" />
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold">{{ feedback.title }}</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  本次操作对你的财务状况产生了以下影响
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="关闭"
                @click="feedbackOpen = false"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- 财务变化 -->
            <div v-if="visibleMetrics.length" class="border-b border-border p-5">
              <h4 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                财务变化
              </h4>
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-3">
                <div
                  v-for="m in visibleMetrics"
                  :key="m.key"
                  class="rounded-xl border border-border bg-background p-3"
                >
                  <span class="block text-[11px] text-muted-foreground">{{ m.label }}</span>
                  <span
                    class="mt-1 block text-sm font-semibold tabular-nums"
                    :class="
                      (feedback.delta?.[m.key] ?? 0) > 0
                        ? 'text-success'
                        : (feedback.delta?.[m.key] ?? 0) < 0
                          ? 'text-destructive'
                          : 'text-foreground'
                    "
                  >
                    {{ fmt(feedback.delta?.[m.key] ?? 0) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 风险警告 -->
            <div v-if="visibleWarnings.length" class="border-b border-border p-5">
              <h4 class="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
                需要注意
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(w, idx) in visibleWarnings"
                  :key="idx"
                  class="flex gap-2.5 rounded-xl border border-border bg-background p-3"
                >
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    :class="warningLevelClass(w.level)"
                  >
                    <Lightbulb class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <div class="text-sm font-medium">{{ warningTitle(w) }}</div>
                    <div class="text-xs leading-relaxed text-muted-foreground">
                      {{ w.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="p-5">
              <button
                type="button"
                data-testid="decision-feedback-dismiss"
                class="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-95"
                @click="feedbackOpen = false"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.rr-modal-enter-active,
.rr-modal-leave-active {
  transition: all 0.25s ease;
}
.rr-modal-enter-from,
.rr-modal-leave-to {
  opacity: 0;
}
.rr-modal-enter-from > div,
.rr-modal-leave-to > div {
  transform: scale(0.96) translateY(10px);
}
</style>
