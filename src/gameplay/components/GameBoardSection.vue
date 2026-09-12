<script setup lang="ts">
/**
 * GameBoardSection — 共享棋盘区（v2.4.3 Phase 4/5 内部组件）
 *
 * 统一处理：骰子动画、棋盘渲染（桌面完整 / 移动测滚）、主操作按钮、
 * 消息 toast、PendingAction 底部浮层、多人操作反馈 toast。
 *
 * 只依赖 GameplayAdapter；Single / Multiplayer 同一套渲染。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { AlertCircle, ArrowRight, Dice5, Dices, Rocket } from 'lucide-vue-next'
import { useDisplayMode } from '@/composables/useDisplayMode'
import RatRaceBoard from '@/components/RatRaceBoard.vue'
import FastTrackBoard from '@/components/FastTrackBoard.vue'
import MobileBoardScroller from '@/components/mobile/MobileBoardScroller.vue'
import type {
  MarketEventCard,
  OpportunityCard,
  StoryCard,
} from '@/types/game'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { diceValuesOf } from '@/gameplay/presentation'
import PendingActionPanel from './PendingActionPanel.vue'

const props = withDefaults(
  defineProps<{
    adapter: GameplayAdapter
    boardKind: 'rat_race' | 'fast_track'
    mobileBoardSize?: number
    cellGap?: number
  }>(),
  {
    mobileBoardSize: 520,
    cellGap: 4,
  },
)

const { isMobile } = useDisplayMode()
const vm = computed(() => props.adapter.viewModel.value)
const gameState = computed(() => vm.value.gameState)
const currentPlayer = computed(() => vm.value.currentPlayer)
const isSingle = computed(() => props.adapter.meta.mode === 'single')

// ============ 骰子动画（单机本地触发；多人由服务器快照驱动，不播放动画） ============
const showDiceAnimation = ref(false)
const suppressUI = ref(false)

async function onRollDice() {
  if (isSingle.value) {
    suppressUI.value = true
    showDiceAnimation.value = true
  }
  await props.adapter.commands.rollDice()
}

function onDiceAnimationDone() {
  showDiceAnimation.value = false
  setTimeout(() => {
    suppressUI.value = false
  }, 200)
}

function onEndTurn() {
  props.adapter.commands.endTurn()
}

// ============ 棋盘中心卡片 ============
const showBoardCard = computed(() => {
  if (suppressUI.value) return false
  const t = vm.value.pendingAction?.type
  if (props.boardKind === 'rat_race') {
    return t === 'opportunity' || t === 'market' || t === 'story'
  }
  return t === 'fast_track_opportunity'
})

const boardCardType = computed<'opportunity' | 'market' | 'story' | null>(() => {
  const t = vm.value.pendingAction?.type
  if (t === 'opportunity') return 'opportunity'
  if (t === 'market') return 'market'
  if (t === 'story') return 'story'
  return null
})

const boardCardData = computed<OpportunityCard | MarketEventCard | StoryCard | null>(() => {
  const t = vm.value.pendingAction?.type
  const card = vm.value.pendingAction?.card ?? null
  if (t === 'opportunity') return card as OpportunityCard | null
  if (t === 'market') return gameState.value.marketEvent ?? (card as MarketEventCard | null)
  if (t === 'story') return card as unknown as StoryCard | null
  return null
})

const ftBoardOpportunity = computed<OpportunityCard | null>(() =>
  vm.value.pendingAction?.type === 'fast_track_opportunity'
    ? (vm.value.pendingAction.card as OpportunityCard | null)
    : null,
)

// ============ 操作面板浮层 ============
const showActionPanel = computed(() => {
  if (suppressUI.value) return false
  return !!vm.value.pendingAction?.type
})

const disabled = computed(() => !vm.value.canAct)
const turnStatus = computed(() => gameState.value.turnStatus)
const showEndTurn = computed(() => turnStatus.value !== 'idle')
const doubleDice = computed(() => currentPlayer.value?.doubleDiceNextTurn ?? false)

// ============ 消息 toast（无待定动作时的纯消息） ============
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => vm.value.pendingAction,
  (pa) => {
    const msg = pa?.message ?? ''
    if (msg && !pa?.type && !suppressUI.value) {
      toastMessage.value = msg
      toastVisible.value = false
      nextTick(() => {
        toastVisible.value = true
        startToastTimer()
      })
    } else {
      toastVisible.value = false
      if (toastTimer) {
        clearTimeout(toastTimer)
        toastTimer = null
      }
    }
  },
  { immediate: true },
)

watch(suppressUI, (val, prev) => {
  if (prev && !val && vm.value.pendingAction?.message && !vm.value.pendingAction?.type) {
    toastMessage.value = vm.value.pendingAction.message
    toastVisible.value = false
    nextTick(() => {
      toastVisible.value = true
      startToastTimer()
    })
  }
  if (val && toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
})

function startToastTimer() {
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
    setTimeout(() => {
      if (!toastVisible.value) {
        props.adapter.commands.resolvePendingAction({ kind: 'acknowledge' })
      }
    }, 300)
  }, 3000)
}

// ============ 多人操作反馈 toast（单机由视图层 DecisionFeedbackModal 负责） ============
const feedbackText = ref('')
const feedbackVisible = ref(false)
let fbTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => vm.value.lastAction?.timestamp,
  (timestamp, previousTimestamp) => {
    if (props.adapter.meta.mode !== 'multiplayer') return
    const feedback = vm.value.lastAction
    if (timestamp && timestamp !== previousTimestamp && feedback?.title) {
      feedbackText.value = feedback.title
      feedbackVisible.value = false
      nextTick(() => {
        feedbackVisible.value = true
        if (fbTimer) clearTimeout(fbTimer)
        fbTimer = setTimeout(() => {
          feedbackVisible.value = false
        }, 4000)
      })
    }
  },
  { immediate: true },
)

const boardDiceValues = computed(() => diceValuesOf(vm.value))

function boardSlots() {
  const p = currentPlayer.value
  const base = {
    players: gameState.value.players,
    lastRoll: gameState.value.lastRoll,
    turnNumber: vm.value.turnNumber,
    currentPlayerName: p?.name ?? '',
    isRolling: showDiceAnimation.value,
    diceValues: boardDiceValues.value,
  }
  if (props.boardKind === 'rat_race') {
    return {
      ...base,
      currentPosition: p?.ratRacePosition ?? 0,
      showCard: showBoardCard.value,
      cardType: boardCardType.value,
      cardData: boardCardData.value,
    }
  }
  return {
    ...base,
    currentPosition: p?.fastTrackPosition ?? 0,
    dream: p?.dream ?? null,
  }
}
</script>

<template>
  <section class="game-board-section relative order-1 flex min-h-[38vh] flex-1 flex-col overflow-visible lg:min-h-0 lg:overflow-hidden">
    <!-- 纯消息 toast -->
    <div
      v-if="toastVisible"
      class="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2"
    >
      <div
        class="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur"
      >
        <AlertCircle class="h-3.5 w-3.5 text-primary" />
        {{ toastMessage }}
      </div>
    </div>

    <!-- 多人操作反馈 -->
    <Transition name="fb-fade">
      <div
        v-if="feedbackVisible"
        class="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2"
      >
        <div
          class="rounded-full border border-success/40 bg-background/95 px-4 py-1.5 text-xs font-semibold text-success shadow-lg backdrop-blur"
        >
          {{ feedbackText }}
        </div>
      </div>
    </Transition>

    <!-- 移动端：棋盘测滚 + 当前格自动居中 -->
    <div v-if="isMobile" class="mobile-board-pane">
      <MobileBoardScroller
        :board-size="props.mobileBoardSize"
        :active-index="props.boardKind === 'fast_track' ? currentPlayer?.fastTrackPosition ?? 0 : currentPlayer?.ratRacePosition ?? 0"
        :cell-gap="props.cellGap"
      >
        <RatRaceBoard
          v-if="boardKind === 'rat_race'"
          v-bind="boardSlots()"
          @dice-done="onDiceAnimationDone"
        />
        <FastTrackBoard
          v-else
          v-bind="boardSlots()"
          @dice-done="onDiceAnimationDone"
        />
      </MobileBoardScroller>
    </div>

    <!-- 桌面端：棋盘完整居中 -->
    <div v-else class="grid h-full w-full place-items-center overflow-hidden p-2 sm:p-4 lg:p-6">
      <RatRaceBoard
        v-if="boardKind === 'rat_race'"
        v-bind="boardSlots()"
        @dice-done="onDiceAnimationDone"
      />
      <FastTrackBoard
        v-else
        v-bind="boardSlots()"
        @dice-done="onDiceAnimationDone"
      />
    </div>

    <!-- 学习模式 / 观战附加内容（由视图层通过 slot 注入，仅 Single） -->
    <slot name="board-extra" />

    <!-- 主操作按钮 -->
    <div class="relative z-30 shrink-0 flex justify-center px-3 pb-3 sm:px-6 sm:pb-4">
      <Transition name="main-btn" mode="out-in">
        <button
          v-if="!showEndTurn"
          key="roll"
          type="button"
          data-testid="roll-dice"
          class="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
          :disabled="disabled"
          @click="onRollDice"
        >
          <Rocket v-if="boardKind === 'fast_track'" class="h-5 w-5 sm:h-6 sm:w-6" />
          <Dices v-else-if="doubleDice" class="h-5 w-5 sm:h-6 sm:w-6" />
          <Dice5 v-else class="h-5 w-5 sm:h-6 sm:w-6" />
          <span>
            {{ boardKind === 'fast_track' ? '掷双骰' : doubleDice ? '掷双骰' : '掷骰子' }}
          </span>
        </button>
        <button
          v-else
          key="end"
          type="button"
          data-testid="end-turn"
          class="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-8 text-base font-semibold text-foreground shadow-md transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
          :disabled="turnStatus === 'rolling' || disabled"
          @click="onEndTurn"
        >
          <span>结束回合</span>
          <ArrowRight class="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </Transition>
    </div>

    <!-- PendingAction 底部浮层 -->
    <Transition name="slide-up">
      <div
        v-if="showActionPanel"
        class="pointer-events-none absolute inset-y-0 left-0 right-0 z-40 flex items-end px-3 pb-3 sm:px-6 sm:pb-4"
      >
        <div
          data-testid="pending-action-scroll"
          class="pointer-events-auto mx-auto max-h-[calc(100%-1rem)] max-w-[680px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-md"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <slot name="pending-panel">
                <PendingActionPanel :vm="vm" :commands="props.adapter.commands" :disabled="disabled" />
              </slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.main-btn-enter-active,
.main-btn-leave-active {
  transition: all 0.25s ease;
}
.main-btn-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
.main-btn-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fb-fade-enter-active,
.fb-fade-leave-active {
  transition: all 0.25s ease;
}
.fb-fade-enter-from,
.fb-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.mobile-board-pane {
  position: relative;
  /* Keep the board pane from being compressed by the mobile player sidebar. */
  flex: 0 0 auto;
  min-height: 0;
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  height: min(52svh, 520px);
}

/* Mobile layout must reserve room for the board and the primary action together.
 * Without this, the flex parent shrinks the section to the board height and
 * overflow-hidden clips the roll/end-turn button behind the financial sidebar. */
@media (max-width: 1023px) {
  .game-board-section {
    flex: 0 0 auto;
    min-height: calc(min(52svh, 520px) + 4.5rem);
  }
}

@media (max-height: 500px) and (max-width: 1024px) and (orientation: landscape) {
  .game-board-section {
    flex: 0 0 100%;
    height: 100%;
    min-height: 100%;
  }

  .mobile-board-pane {
    flex: 1 1 auto;
    height: calc(100% - 4.5rem);
  }
}
</style>
