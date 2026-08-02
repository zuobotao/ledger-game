<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TrendingDown, RotateCcw, Home, AlertTriangle } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Player } from '@/types/game'
import GameSummary from '@/components/GameSummary.vue'

const router = useRouter()
const gameStore = useGameStore()

// 从 store 获取破产玩家（如果没有，使用当前玩家）
const bankruptPlayer = computed<Player | null>(() => {
  // 优先使用当前玩家
  return gameStore.currentPlayer ?? null
})

const showSummary = ref(true)

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
</script>

<template>
  <div
    class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center"
  >
    <!-- 红色径向渐变光晕背景 -->
    <div
      class="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style="
        background: radial-gradient(
          ellipse at center top,
          rgba(239, 68, 68, 0.15) 0%,
          rgba(239, 68, 68, 0.05) 35%,
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
          rgba(239, 68, 68, 0.2) 0%,
          transparent 70%
        );
        filter: blur(60px);
      "
    />

    <div v-if="!showSummary" class="relative z-10 mx-auto w-full max-w-2xl">
      <!-- 图标 -->
      <div class="mb-6 flex justify-center">
        <div
          class="relative flex h-24 w-24 items-center justify-center rounded-full"
          style="
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
            box-shadow:
              0 0 40px rgba(239, 68, 68, 0.4),
              0 10px 40px rgba(0, 0, 0, 0.3);
          "
        >
          <AlertTriangle class="h-12 w-12 text-white" />
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
      <h1 class="mb-3 text-4xl font-bold tracking-tight text-destructive sm:text-5xl md:text-6xl">
        破产
      </h1>

      <!-- 副标题 -->
      <p class="mb-10 text-lg font-medium text-foreground sm:text-xl">
        <span class="text-destructive">{{ bankruptPlayer?.name ?? '玩家' }}</span>
        资金耗尽，游戏结束
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
        v-if="showSummary && bankruptPlayer"
        :player="bankruptPlayer"
        phase="game_over"
        :total-turns="gameStore.turnNumber ?? 0"
        @close="closeSummary"
        @restart="goToSetup"
        @home="goHome"
      />
    </Teleport>
  </div>
</template>
