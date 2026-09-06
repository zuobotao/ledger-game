<script setup lang="ts">
/**
 * FastTrackView — 单机资本游戏玩法容器（v2.4.3 w2 接线）
 *
 * 玩法 UI 全部走共享组件 <FastTrackGame>（GameplayContract），
 * 本视图只保留 Single 专属流程：
 * - 路由（home / victory / retirement）
 * - 学习模式 / 跨阶段观战（经插槽注入）
 *
 * 数据与操作统一经 SingleGameplayAdapter（本地 Engine 权威）。
 */
import { computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Lightbulb } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { createSingleGameplayAdapter } from '@/gameplay/adapters/singleGameplayAdapter'
import FastTrackGame from '@/gameplay/components/fast-track/FastTrackGame.vue'
import PhaseSwitcher from '@/components/PhaseSwitcher.vue'
import AITutorAdvice from '@/components/AITutorAdvice.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const adapter = createSingleGameplayAdapter(gameStore)
onBeforeUnmount(() => adapter.dispose())

// 是否处于观战模式
const isSpectator = computed(() => route.query.spectator === 'true')

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}

// 游戏结束（梦想达成 / 退休）后跳转
function onGameOver(payload: { reason: string }) {
  setTimeout(() => {
    const target = payload.reason === 'retirement' ? 'retirement' : 'victory'
    router.push({ name: target })
  }, 800)
}
</script>

<template>
  <div class="flex h-screen w-full flex-col overflow-hidden bg-background">
    <FastTrackGame
      :adapter="adapter"
      :spectator="isSpectator"
      @back="goHome"
      @game-over="onGameOver"
    >
      <!-- 单机专属侧栏内容：跨阶段观战切换 + 学习模式开关 -->
      <template #sidebar-extra>
        <PhaseSwitcher />
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-xs transition hover:bg-muted/50"
          :class="{ 'border-primary/40 bg-primary/10': gameStore.learningMode }"
          data-testid="learning-mode-toggle"
          @click="gameStore.toggleLearningMode()"
        >
          <span class="flex items-center gap-2">
            <Lightbulb
              class="h-4 w-4"
              :class="gameStore.learningMode ? 'text-primary' : 'text-muted-foreground'"
            />
            <span class="font-medium" :class="gameStore.learningMode ? 'text-primary' : 'text-foreground'">
              学习模式
            </span>
          </span>
          <span
            class="relative h-5 w-9 rounded-full transition-colors"
            :class="gameStore.learningMode ? 'bg-primary' : 'bg-muted'"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
              :class="gameStore.learningMode ? 'translate-x-4' : 'translate-x-0.5'"
            />
          </span>
        </button>
      </template>

      <!-- 单机专属棋盘附加内容：AI 导师（学习模式） -->
      <template #board-extra>
        <div v-if="gameStore.learningMode" class="shrink-0 px-4 pb-2 sm:px-8">
          <AITutorAdvice />
        </div>
      </template>
    </FastTrackGame>
  </div>
</template>
