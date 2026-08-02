<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, RotateCcw, Home, Sparkles, Calendar } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { START_AGE, RETIREMENT_AGE } from '@/types/game'
import type { Player } from '@/types/game'
import GameSummary from '@/components/GameSummary.vue'

const router = useRouter()
const gameStore = useGameStore()

// 退休排名
const ranking = computed(() => {
  const activePlayers = gameStore.players.filter((p) => !p.isBankrupt)
  return [...activePlayers].sort((a, b) => {
    const netA = calcNetWorth(a)
    const netB = calcNetWorth(b)
    return netB - netA
  })
})

function calcNetWorth(p: Player): number {
  const assetValue = p.assets.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const liabilityValue = p.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return p.cash + p.savings + assetValue - liabilityValue
}

const winner = computed<Player | null>(() => {
  return ranking.value[0] ?? null
})

const showSummary = ref(true)

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function formatMoneyCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

function goToSetup() {
  gameStore.resetGame()
  router.push('/setup')
}

function goHome() {
  gameStore.resetGame()
  router.push('/')
}

function closeSummary() {
  showSummary.value = false
}

const yearsPlayed = computed(() => RETIREMENT_AGE - START_AGE)
</script>

<template>
  <div
    class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center"
  >
    <!-- 金色径向渐变光晕背景 -->
    <div
      class="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style="
        background: radial-gradient(
          ellipse at center top,
          rgba(251, 191, 36, 0.15) 0%,
          rgba(251, 191, 36, 0.05) 35%,
          transparent 70%
        );
      "
    />
    <div
      class="pointer-events-none absolute left-1/2 top-20 -z-0 h-96 w-96 -translate-x-1/2 rounded-full"
      aria-hidden="true"
      style="
        background: radial-gradient(
          circle,
          rgba(251, 191, 36, 0.2) 0%,
          transparent 70%
        );
        filter: blur(60px);
      "
    />

    <div v-if="!showSummary" class="relative z-10 mx-auto w-full max-w-2xl">
      <!-- 奖杯图标 -->
      <div class="mb-6 flex justify-center">
        <div
          class="relative flex h-24 w-24 items-center justify-center rounded-full"
          style="
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
            box-shadow:
              0 0 40px rgba(251, 191, 36, 0.4),
              0 10px 40px rgba(0, 0, 0, 0.3);
          "
        >
          <Trophy class="h-12 w-12 text-white" />
          <!-- 光晕效果 -->
          <div
            class="absolute inset-0 rounded-full"
            style="
              background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.3) 0%,
                transparent 50%
              );
            "
          />
        </div>
      </div>

      <!-- 主标题 -->
      <h1
        class="mb-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        style="
          background: linear-gradient(135deg, #fbbf24 0%, #fde68a 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        "
      >
        退休结算
      </h1>

      <!-- 副标题 -->
      <p class="mb-2 text-lg font-medium text-foreground sm:text-xl">
        <span class="text-primary">{{ winner?.name ?? '玩家' }}</span>
        以最高净资产成为冠军
      </p>
      <p class="mb-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Calendar class="h-4 w-4" />
        {{ yearsPlayed }} 年投资旅程结束
      </p>

      <!-- 排名列表 -->
      <div class="mx-auto mb-10 w-full max-w-md">
        <div class="flex flex-col gap-2">
          <div
            v-for="(player, index) in ranking"
            :key="player.id"
            class="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3"
            :class="{
              'border-amber-500/50 bg-amber-500/10': index === 0,
            }"
          >
            <div class="w-8 text-center">
              <Trophy v-if="index === 0" class="mx-auto h-5 w-5 text-amber-400" />
              <span v-else class="text-lg font-bold text-muted-foreground">{{ index + 1 }}</span>
            </div>
            <div class="flex flex-1 items-center gap-2">
              <span
                class="h-3 w-3 rounded-full"
                :style="{ backgroundColor: player.color }"
              />
              <span class="text-sm font-medium">{{ player.name }}</span>
            </div>
            <div
              class="text-sm font-bold"
              :class="calcNetWorth(player) >= 0 ? 'text-success' : 'text-destructive'"
            >
              {{ formatMoneyCompact(calcNetWorth(player)) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮组 -->
      <div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <button
          type="button"
          class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          @click="goToSetup"
        >
          <RotateCcw class="h-5 w-5" />
          再来一局
        </button>
        <button
          type="button"
          class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary px-8 text-base font-semibold text-secondary-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          @click="goHome"
        >
          <Home class="h-5 w-5" />
          返回首页
        </button>
      </div>
    </div>

    <!-- 游戏结束明细总结 -->
    <Teleport to="body">
      <GameSummary
        v-if="showSummary && winner"
        :player="winner"
        phase="retirement"
        :total-turns="gameStore.turnNumber ?? 0"
        :total-months="gameStore.gameMonth ?? 0"
        @close="closeSummary"
        @restart="goToSetup"
        @home="goHome"
      />
    </Teleport>
  </div>
</template>
