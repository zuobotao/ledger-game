<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CheckCircle2, Rocket, XCircle } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'

const emit = defineEmits<{ enter: [] }>()

const gameStore = useGameStore()

const eligibility = computed(() => gameStore.fastTrackEligibility)

const playerName = computed(() => gameStore.currentPlayer?.name ?? '玩家')

const statusText = computed(() =>
  eligibility.value?.eligible ? '已具备进入资本游戏资格' : '尚未具备资本游戏资格',
)
</script>

<template>
  <div
    class="rounded-xl border bg-card/60 p-3"
    :class="eligibility?.eligible ? 'border-emerald-500/40' : 'border-border'"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Rocket
          class="h-4 w-4"
          :class="eligibility?.eligible ? 'text-emerald-500' : 'text-muted-foreground'"
        />
        <span class="text-xs font-semibold">资本游戏资格</span>
      </div>
      <span
        class="text-xs font-semibold"
        :class="eligibility?.eligible ? 'text-emerald-500' : 'text-muted-foreground'"
      >
        {{ statusText }}
      </span>
    </div>

    <!-- 判定项明细 -->
    <ul class="mt-2 space-y-1.5">
      <li
        v-for="(c, i) in eligibility?.criteria ?? []"
        :key="i"
        class="flex items-start gap-1.5 text-xs"
      >
        <CheckCircle2
          v-if="c.met"
          class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
        />
        <XCircle v-else class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
        <span class="min-w-0">
          <span :class="c.met ? 'text-foreground' : 'text-foreground/80'">{{ c.label }}</span>
          <span class="ml-1 text-muted-foreground">{{ c.detail }}</span>
        </span>
      </li>
    </ul>

    <!-- 缺口提示 -->
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
</template>