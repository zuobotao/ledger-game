<script setup lang="ts">
/**
 * FastTrackEligibilityBar — 共享资本游戏资格面板（v2.4.3 Phase 4）
 *
 * 资格判定复用纯引擎函数 getFastTrackEligibility(player)，
 * 与 Engine / Domain 同一权威规则；组件只负责显示 + 进入 CTA。
 */
import { computed, ref, watch } from 'vue'
import { ArrowRight, CheckCircle2, ChevronDown, Rocket, XCircle } from 'lucide-vue-next'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { getFastTrackEligibility } from '@/engine/turnEngine'

const props = defineProps<{
  adapter: GameplayAdapter
}>()

const emit = defineEmits<{ (e: 'enter'): void }>()

const vm = computed(() => props.adapter.viewModel.value)
const player = computed(() => vm.value.currentPlayer)

const eligibility = computed(() =>
  player.value ? getFastTrackEligibility(player.value) : null,
)

const playerName = computed(() => player.value?.name ?? '玩家')

const statusText = computed(() =>
  eligibility.value?.eligible ? '已具备进入资本游戏资格' : '尚未具备资本游戏资格',
)

const expanded = ref(false)

watch(
  () => eligibility.value?.eligible,
  (eligible) => {
    if (eligible) expanded.value = true
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="rounded-xl border bg-card/60"
    :class="eligibility?.eligible ? 'border-emerald-500/40' : 'border-border'"
  >
    <!-- 紧凑横幅 -->
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-muted/30"
      @click="eligibility?.eligible ? undefined : (expanded = !expanded)"
    >
      <div class="flex min-w-0 items-center gap-2">
        <Rocket
          class="h-4 w-4 shrink-0"
          :class="eligibility?.eligible ? 'text-emerald-500' : 'text-muted-foreground'"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="truncate text-xs font-semibold">资本游戏资格</span>
            <span
              v-if="eligibility?.eligible"
              class="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500"
            >
              已达成
            </span>
            <ChevronDown
              v-else
              class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
              :class="{ 'rotate-180': expanded }"
            />
          </div>
          <p class="truncate text-[11px] text-muted-foreground">
            <template v-if="eligibility">
              {{
                eligibility.eligible
                  ? statusText
                  : `被动收入 $${Math.round(eligibility.passiveIncome).toLocaleString()} / 支出 $${Math.round(eligibility.totalExpenses).toLocaleString()} / 还差 $${Math.round(eligibility.gap).toLocaleString()}/月`
              }}
            </template>
            <template v-else>—</template>
          </p>
        </div>
      </div>
      <span v-if="!eligibility?.eligible" class="shrink-0 text-xs font-semibold text-muted-foreground">
        详情
      </span>
    </button>

    <!-- 展开详情 -->
    <div v-if="expanded || eligibility?.eligible" class="border-t border-border px-3 py-2.5">
      <ul class="space-y-1.5">
        <li
          v-for="(c, i) in eligibility?.criteria ?? []"
          :key="i"
          class="flex items-start gap-1.5 text-xs"
        >
          <CheckCircle2 v-if="c.met" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <XCircle v-else class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <span class="min-w-0">
            <span :class="c.met ? 'text-foreground' : 'text-foreground/80'">{{ c.label }}</span>
            <span class="ml-1 text-muted-foreground">{{ c.detail }}</span>
          </span>
        </li>
      </ul>

      <p
        v-if="eligibility && !eligibility.eligible && eligibility.gap > 0"
        class="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-500"
      >
        还需增加被动收入 ${{ Math.round(eligibility.gap).toLocaleString() }}/月（购买更多可带来正向现金流的资产）。
      </p>

      <!-- 进入资本游戏 CTA -->
      <button
        v-if="eligibility?.eligible"
        type="button"
        data-testid="enter-fast-track-cta"
        class="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
        @click="emit('enter')"
      >
        <Rocket class="h-4 w-4" />
        进入资本游戏（{{ playerName }}）
        <ArrowRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
