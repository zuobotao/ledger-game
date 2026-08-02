<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bot,
  Dices,
  Landmark,
  PieChart,
  Rocket,
  Target,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { OpportunityCard } from '@/types/game'
import FastTrackBoard from '@/components/FastTrackBoard.vue'
import BankModal from '@/components/BankModal.vue'
import FinancialStatement from '@/components/FinancialStatement.vue'

const router = useRouter()
const gameStore = useGameStore()

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}

// ========== 骰子动画 ==========
const showDiceAnimation = ref(false)

function onRollDice() {
  showDiceAnimation.value = true
  gameStore.fastTrackRollDice()
}

function onDiceAnimationDone() {
  showDiceAnimation.value = false
}

// ========== 棋盘中心卡片显示 ==========
const showBoardOpportunity = computed(() => {
  return gameStore.pendingAction.type === 'fast_track_opportunity'
})

const boardOpportunityCard = computed<OpportunityCard | null>(() => {
  if (
    gameStore.pendingAction.type === 'fast_track_opportunity' &&
    gameStore.pendingAction.card
  ) {
    return gameStore.pendingAction.card as OpportunityCard
  }
  return null
})

// ========== 机会卡相关 ==========
const ftOpportunityCard = computed<OpportunityCard | null>(() => {
  if (
    gameStore.pendingAction.type === 'fast_track_opportunity' &&
    gameStore.pendingAction.card
  ) {
    return gameStore.pendingAction.card as OpportunityCard
  }
  return null
})

const ftDreamPending = computed(() => gameStore.pendingAction.type === 'fast_track_dream')

const ftQuantity = ref(1)
const ftBuyError = ref('')
const showBankModal = ref(false)
const showFinancialPanel = ref(false)

// 当前玩家是否是 AI
const isCurrentPlayerAI = computed(() => {
  return gameStore.currentPlayer?.isAI ?? false
})

// 是否禁用人类操作
const disableHumanActions = computed(() => {
  return gameStore.isAIThinking || isCurrentPlayerAI.value
})

function onBuyFtOpportunity() {
  const card = ftOpportunityCard.value
  const player = gameStore.currentPlayer
  if (!card || !player) return
  const cost = card.cost * ftQuantity.value
  if (player.cash < cost) {
    ftBuyError.value = `现金不足，还差 ${formatMoney(cost - player.cash)}`
    return
  }
  ftBuyError.value = ''
  const ok = gameStore.buyOpportunity(ftQuantity.value)
  if (!ok) {
    ftBuyError.value = '购买失败，请稍后再试'
    return
  }
  ftQuantity.value = 1
}

function onDeclineFtOpportunity() {
  gameStore.declineOpportunity()
  ftQuantity.value = 1
  ftBuyError.value = ''
}

function onBuyDream() {
  const ok = gameStore.buyDream()
  if (ok) {
    router.push({ name: 'victory' })
  }
}

function onEndTurn() {
  gameStore.moveToNextPlayer()
}

function onAcknowledge() {
  gameStore.acknowledgeMessage()
}

const winner = computed(() => {
  if (!gameStore.winnerId) return null
  return gameStore.players.find((p) => p.id === gameStore.winnerId)
})

// 判断 pending action 浮层是否应该显示
const showPendingPanel = computed(() => {
  return gameStore.pendingAction.type || gameStore.pendingAction.message
})

// 获胜后自动跳转到胜利页面
watch(
  () => gameStore.winnerId,
  (id) => {
    if (id) {
      setTimeout(() => {
        router.push({ name: 'victory' })
      }, 500)
    }
  },
)
</script>

<template>
  <main class="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
    <!-- Top bar -->
    <header
      class="shrink-0 flex h-14 items-center justify-between gap-2 border-b border-border bg-secondary/50 px-3 py-2.5 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-6 sm:py-3"
    >
      <!-- 左侧：返回 + 阶段 + 回合 -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          title="返回首页"
          @click="goHome"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <div class="hidden sm:block">
          <h1 class="text-base font-semibold">资本游戏</h1>
          <p class="text-xs text-muted-foreground">第 {{ gameStore.turnNumber }} 回合</p>
        </div>
      </div>

      <!-- 中间：当前玩家 -->
      <div class="flex items-center gap-2">
        <span
          v-if="gameStore.currentPlayer"
          class="h-3 w-3 rounded-full"
          :style="{ backgroundColor: gameStore.currentPlayer.color }"
        />
        <Bot v-if="isCurrentPlayerAI" class="h-4 w-4 text-primary" />
        <span class="text-sm font-medium">
          {{ gameStore.currentPlayer?.name ?? '—' }}
        </span>
        <!-- AI 思考中提示 -->
        <span
          v-if="gameStore.isAIThinking"
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary animate-pulse"
        >
          <Bot class="h-3 w-3" />
          AI 思考中...
        </span>
        <!-- 梦想徽章 -->
        <span
          v-if="gameStore.currentPlayer?.dream"
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
        >
          <Target class="h-3 w-3" />
          {{ gameStore.currentPlayer.dream.name }}
        </span>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- 银行 -->
        <button
          type="button"
          :disabled="isCurrentPlayerAI"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          title="银行"
          @click="showBankModal = true"
        >
          <Landmark class="h-5 w-5" />
        </button>
        <!-- 财务报表 -->
        <button
          type="button"
          :disabled="isCurrentPlayerAI"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          title="财务报表"
          @click="showFinancialPanel = !showFinancialPanel"
        >
          <PieChart class="h-5 w-5" />
        </button>
      </div>
    </header>

    <!-- Game area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧财务面板（可折叠） -->
      <Transition name="side-panel">
        <aside
          v-if="showFinancialPanel"
          class="shrink-0 w-72 overflow-y-auto border-r border-border bg-secondary/30 px-4 py-4 sm:w-80"
        >
          <FinancialStatement v-if="gameStore.currentPlayer" />
        </aside>
      </Transition>

      <!-- Board -->
      <section class="relative flex flex-1 flex-col overflow-hidden">
        <div class="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6">
          <div class="h-full w-full max-h-full max-w-[560px]">
            <FastTrackBoard
              :players="gameStore.players"
              :current-position="gameStore.currentPlayer?.fastTrackPosition ?? 0"
              :last-roll="gameStore.lastRoll"
              :turn-number="gameStore.turnNumber ?? 0"
              :current-player-name="gameStore.currentPlayer?.name ?? ''"
              :is-rolling="showDiceAnimation"
              :dice-values="gameStore.lastDiceValues"
              :dream="gameStore.currentPlayer?.dream ?? null"
              :show-opportunity="showBoardOpportunity"
              :opportunity-card="boardOpportunityCard"
              @dice-done="onDiceAnimationDone"
            />
          </div>
        </div>

        <!-- 主操作按钮（棋盘下方） -->
        <div class="shrink-0 flex justify-center px-3 pb-3 sm:px-6 sm:pb-4">
          <Transition name="main-btn" mode="out-in">
            <!-- 掷骰子（idle 状态） -->
            <button
              v-if="gameStore.turnStatus === 'idle'"
              key="roll"
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
              :disabled="disableHumanActions"
              @click="onRollDice"
            >
              <Rocket class="h-5 w-5 sm:h-6 sm:w-6" />
              <span>掷双骰</span>
            </button>
            <!-- 结束回合（resolving 状态） -->
            <button
              v-else
              key="end"
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-8 text-base font-semibold text-foreground shadow-md transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
              :disabled="gameStore.turnStatus === 'rolling' || disableHumanActions"
              @click="onEndTurn"
            >
              <span>结束回合</span>
              <ArrowRight class="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </Transition>
        </div>

        <!-- Pending action floating panel -->
        <Transition name="slide-up">
          <div
            v-if="showPendingPanel"
            class="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 sm:px-6 sm:pb-4"
          >
            <div class="pointer-events-auto mx-auto max-w-[560px] rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-md">
              <div class="flex items-start gap-3">
                <AlertCircle v-if="!showBoardOpportunity" class="mt-0.5 h-5 w-5 text-primary" />
                <div class="flex-1">
                  <!-- 非卡片类 pending action 显示消息 -->
                  <p v-if="!showBoardOpportunity" class="text-sm font-medium">
                    {{ gameStore.pendingAction.message }}
                  </p>

                  <!-- ========== 快车道机会卡操作区 ========== -->
                  <div v-if="ftOpportunityCard" class="card-action-panel">
                    <!-- 数量选择器（股票类） -->
                    <div
                      v-if="ftOpportunityCard.type === 'stock' && ftOpportunityCard.maxQuantity"
                      class="mb-3 flex items-center gap-3"
                    >
                      <label class="text-sm font-medium text-foreground">购买数量：</label>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          :disabled="ftQuantity <= 1"
                          class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          @click="ftQuantity = Math.max(1, ftQuantity - 1)"
                        >
                          <span class="text-lg font-bold">−</span>
                        </button>
                        <input
                          v-model.number="ftQuantity"
                          type="number"
                          min="1"
                          :max="ftOpportunityCard.maxQuantity"
                          class="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          :disabled="ftQuantity >= (ftOpportunityCard.maxQuantity ?? 1)"
                          class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          @click="
                            ftQuantity = Math.min(ftOpportunityCard.maxQuantity ?? 1, ftQuantity + 1)
                          "
                        >
                          <span class="text-lg font-bold">+</span>
                        </button>
                      </div>
                      <span class="text-xs text-muted-foreground">
                        最多 {{ ftOpportunityCard.maxQuantity }} 股
                      </span>
                    </div>

                    <!-- 总价显示 -->
                    <div class="mb-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      <span class="text-sm text-muted-foreground">总价：</span>
                      <span class="text-base font-bold text-foreground">
                        {{ formatMoney(ftOpportunityCard.cost * ftQuantity) }}
                      </span>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="flex gap-2">
                      <button
                        type="button"
                        :disabled="
                          (gameStore.currentPlayer
                            ? gameStore.currentPlayer.cash <
                              ftOpportunityCard.cost * ftQuantity
                            : true) || disableHumanActions
                        "
                        class="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                        @click="onBuyFtOpportunity"
                      >
                        买入
                      </button>
                      <button
                        type="button"
                        :disabled="disableHumanActions"
                        class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                        @click="onDeclineFtOpportunity"
                      >
                        放弃
                      </button>
                    </div>
                    <p v-if="ftBuyError" class="mt-2 text-xs font-medium text-destructive">
                      {{ ftBuyError }}
                    </p>
                  </div>

                  <!-- ========== 梦想购买操作区 ========== -->
                  <div v-if="ftDreamPending" class="dream-action-panel">
                    <div class="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <div class="flex items-center gap-2">
                        <Target class="h-5 w-5 text-amber-400" />
                        <span class="font-semibold text-amber-400">
                          {{ gameStore.currentPlayer?.dream?.name }}
                        </span>
                      </div>
                      <div class="mt-1 text-sm text-amber-300/80">
                        价格：
                        <span class="font-bold">
                          {{ formatMoney(gameStore.currentPlayer?.dream?.price ?? 0) }}
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-muted-foreground">
                        当前现金：
                        <span
                          :class="
                            (gameStore.currentPlayer?.cash ?? 0) >=
                            (gameStore.currentPlayer?.dream?.price ?? 0)
                              ? 'text-success'
                              : 'text-destructive'
                          "
                        >
                          {{ formatMoney(gameStore.currentPlayer?.cash ?? 0) }}
                        </span>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        :disabled="
                          gameStore.currentPlayer
                            ? gameStore.currentPlayer.cash <
                              (gameStore.currentPlayer.dream?.price ?? Infinity)
                            : true || disableHumanActions
                        "
                        class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
                        @click="onBuyDream"
                      >
                        购买梦想
                      </button>
                      <button
                        type="button"
                        :disabled="disableHumanActions"
                        class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                        @click="onAcknowledge"
                      >
                        暂不购买
                      </button>
                    </div>
                  </div>

                  <!-- Doodad / Generic -->
                  <div
                    v-if="
                      !ftOpportunityCard &&
                      !ftDreamPending &&
                      gameStore.pendingAction.message
                    "
                    class="mt-3"
                  >
                    <button
                      type="button"
                      :disabled="disableHumanActions"
                      class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                      @click="onAcknowledge"
                    >
                      知道了
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </section>
    </div>

    <!-- Winner overlay -->
    <div
      v-if="winner"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-md rounded-3xl bg-background p-8 text-center shadow-2xl">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground">
          <Target class="h-8 w-8" />
        </div>
        <h2 class="mt-4 text-2xl font-bold">{{ winner.name }} 获胜！</h2>
        <p class="mt-2 text-muted-foreground">
          成功购买了梦想：{{ winner.dream?.name }}
        </p>
        <button
          type="button"
          class="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground hover:opacity-90"
          @click="goHome"
        >
          回到首页
        </button>
      </div>
    </div>

    <!-- Bank modal -->
    <BankModal :show="showBankModal" @close="showBankModal = false" />
  </main>
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

.side-panel-enter-active,
.side-panel-leave-active {
  transition: all 0.3s ease;
}

.side-panel-enter-from,
.side-panel-leave-to {
  opacity: 0;
  width: 0;
  margin-left: 0;
  padding-left: 0;
  padding-right: 0;
  border-right-width: 0;
}

.card-action-panel {
  width: 100%;
}

.dream-action-panel {
  width: 100%;
}
</style>
