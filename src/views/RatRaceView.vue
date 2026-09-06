<script setup lang="ts">
/**
 * RatRaceView — 单机老鼠圈玩法容器（v2.4.3 w2 接线）
 *
 * 玩法 UI 全部走共享组件 <RatRaceGame>（GameplayContract），
 * 本视图只保留 Single 专属流程：
 * - 路由（home / fast-track / victory / retirement）
 * - 进入资本阶段的总结确认（GameSummary）
 * - 学习模式 / 跨阶段观战（经插槽注入）
 * - 回合总结（TurnSummary）
 *
 * 数据与操作统一经 SingleGameplayAdapter（本地 Engine 权威）。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Lightbulb } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { createSingleGameplayAdapter } from '@/gameplay/adapters/singleGameplayAdapter'
import RatRaceGame from '@/gameplay/components/rat-race/RatRaceGame.vue'
import GameSummary from '@/components/GameSummary.vue'
import PhaseSwitcher from '@/components/PhaseSwitcher.vue'
import AITutorAdvice from '@/components/AITutorAdvice.vue'
import TurnSummary from '@/components/TurnSummary.vue'

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

// ============ 进入资本阶段总结（单机专属确认流程） ============
const showRatRaceSummary = ref(false)
const fastTrackOfferShown = ref(false)

function enterFastTrack() {
  // 先显示总结，用户确认后再进入资本游戏
  showRatRaceSummary.value = true
}

// 被动收入达标后自动弹出进入资本游戏提示
watch(
  () => gameStore.canCurrentPlayerEnterFastTrack,
  (canEnter) => {
    if (canEnter && !fastTrackOfferShown.value && !gameStore.currentPlayer?.isAI) {
      fastTrackOfferShown.value = true
      showRatRaceSummary.value = true
    }
  },
  { immediate: true },
)

async function confirmEnterFastTrack() {
  await adapter.commands.resolvePendingAction({ kind: 'enter_fast_track' })
  router.push({ name: 'fast-track' })
}

function closeRatRaceSummary() {
  showRatRaceSummary.value = false
}

// 游戏结束（退休 / 破产清算）后跳转
watch(
  () => gameStore.winnerId,
  (id) => {
    if (id) {
      setTimeout(() => {
        const target = gameStore.gameEndReason === 'retirement' ? 'retirement' : 'victory'
        router.push({ name: target })
      }, 800)
    }
  },
)
</script>

<template>
  <div class="flex h-screen w-full flex-col overflow-hidden bg-background">
    <RatRaceGame
      :adapter="adapter"
      :spectator="isSpectator"
      @back="goHome"
      @enter-fast-track="enterFastTrack"
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
    </RatRaceGame>

    <!-- 老鼠圈结束总结（进入资本阶段确认） -->
    <Teleport to="body">
      <GameSummary
        v-if="showRatRaceSummary && gameStore.currentPlayer"
        :player="gameStore.currentPlayer"
        phase="rat_race_end"
        :total-turns="gameStore.turnNumber"
        :rat-race-turns="gameStore.turnNumber"
        @close="closeRatRaceSummary"
        @restart="confirmEnterFastTrack"
        @home="goHome"
      />
    </Teleport>

    <!-- 回合总结 -->
    <TurnSummary />
  </div>
</template>
