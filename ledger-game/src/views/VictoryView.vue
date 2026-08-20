<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, RotateCcw, Home, Sparkles } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { useGameHistoryStore } from '@/stores/gameHistory'
import type { Player } from '@/types/game'
import GameSummary from '@/components/GameSummary.vue'

const router = useRouter()
const gameStore = useGameStore()
const historyStore = useGameHistoryStore()

// 从 store 获取获胜玩家
const winner = computed<Player | null>(() => {
  if (!gameStore.winnerId) return null
  return gameStore.players.find((p) => p.id === gameStore.winnerId) ?? null
})

const showSummary = ref(true)
let historySaved = false

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function saveHistory() {
  if (historySaved) return
  historySaved = true
  if (!gameStore.mainPlayer) return
  // 异步保存，不阻塞页面交互
  historyStore.saveGame({
    result: 'victory',
    players: gameStore.players,
    winnerId: gameStore.winnerId,
    mainPlayerId: gameStore.mainPlayer.id,
    config: gameStore.config,
    totalTurns: gameStore.turnNumber ?? 0,
    ratRaceTurns: gameStore.ratRaceTurns,
    fastTrackTurns: gameStore.fastTrackTurns,
    startTime: gameStore.gameStartTime,
    transactions: gameStore.transactions ?? [],
    cardHistory: gameStore.cardHistory ?? [],
    dreamName: winner.value?.dream?.name,
  })
}

function goToSetup() {
  saveHistory()
  gameStore.resetGame()
  router.push('/setup')
}

function goHome() {
  saveHistory()
  gameStore.resetGame()
  router.push('/')
}

function closeSummary() {
  showSummary.value = false
}

onMounted(() => {
  saveHistory()
})
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
        恭喜！财务自由
      </h1>

      <!-- 副标题 -->
      <p class="mb-10 text-lg font-medium text-foreground sm:text-xl">
        <span class="text-primary">{{ winner?.name ?? '玩家' }}</span>
        成功完成原始资本积累
      </p>

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
        phase="victory"
        :total-turns="gameStore.turnNumber ?? 0"
        @close="closeSummary"
        @restart="goToSetup"
        @home="goHome"
      />
    </Teleport>
  </div>
</template>
