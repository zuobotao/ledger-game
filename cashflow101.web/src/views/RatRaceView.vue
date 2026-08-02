<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { ArrowLeft, RotateCcw } from 'lucide-vue-next'

const router = useRouter()
const gameStore = useGameStore()

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}
</script>

<template>
  <main class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-5xl">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-foreground">老鼠赛跑</h1>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            @click="goHome"
          >
            <ArrowLeft class="h-4 w-4" />
            返回首页
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center gap-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            @click="goHome"
          >
            <RotateCcw class="h-4 w-4" />
            重新开始
          </button>
        </div>
      </header>

      <div class="rounded-[var(--radius-lg)] border border-border bg-card p-8 text-center shadow-sm">
        <p class="text-muted-foreground">棋盘与核心机制开发中</p>
        <p class="mt-2 text-sm text-muted-foreground">
          当前玩家：{{ gameStore.currentPlayer?.name ?? '无' }}
        </p>
      </div>
    </div>
  </main>
</template>
