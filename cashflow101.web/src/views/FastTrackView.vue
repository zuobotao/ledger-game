<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Banknote, Gem, Rocket, RotateCcw, Target } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { FAST_TRACK_CELLS } from '@/data/board'
import type { OpportunityCard } from '@/types/game'

const router = useRouter()
const gameStore = useGameStore()

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}

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

function cellIcon(type: string) {
  switch (type) {
    case 'cashflow':
      return Banknote
    case 'opportunity':
    case 'investment':
      return Gem
    case 'doodad':
      return RotateCcw
    case 'dream':
      return Target
    default:
      return Target
  }
}

function cellBgClass(type: string): string {
  switch (type) {
    case 'cashflow':
      return 'bg-success text-success-foreground border-transparent'
    case 'opportunity':
      return 'bg-primary text-primary-foreground border-transparent'
    case 'investment':
      return 'bg-secondary text-secondary-foreground'
    case 'doodad':
      return 'bg-destructive text-destructive-foreground border-transparent'
    case 'dream':
      return 'bg-accent text-accent-foreground border-transparent'
    default:
      return 'bg-background'
  }
}

function onRollDice() {
  gameStore.fastTrackRollDice()
}

function onBuyFtOpportunity() {
  gameStore.buyOpportunity(ftQuantity.value)
  ftQuantity.value = 1
}

function onDeclineFtOpportunity() {
  gameStore.declineOpportunity()
  ftQuantity.value = 1
}

function onBuyDream() {
  const ok = gameStore.buyDream()
  if (ok) {
    router.push({ name: 'home' })
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
</script>

<template>
  <main class="flex min-h-screen flex-col bg-background text-foreground">
    <header
      class="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"
    >
      <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">快车道</h1>
      <div class="flex items-center gap-3 sm:gap-4">
        <span
          v-if="gameStore.currentPlayer"
          class="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium sm:text-sm"
        >
          <Rocket class="h-4 w-4 text-primary" />
          {{ gameStore.currentPlayer.name }}
        </span>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          @click="goHome"
        >
          <ArrowLeft class="h-4 w-4" />
          返回首页
        </button>
      </div>
    </header>

    <section class="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:gap-8 sm:px-6">
      <!-- Track -->
      <div class="no-scrollbar flex w-full max-w-5xl gap-2 overflow-x-auto pb-4 sm:gap-3">
        <div
          v-for="cell in FAST_TRACK_CELLS"
          :key="cell.index"
          class="relative flex h-24 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-background text-center shadow-sm sm:h-28 sm:w-24"
          :class="[
            cellBgClass(cell.type),
            { 'ring-2 ring-primary': gameStore.currentPlayer?.fastTrackPosition === cell.index },
          ]"
        >
          <component :is="cellIcon(cell.type)" class="h-5 w-5 sm:h-6 sm:w-6" />
          <span class="text-[10px] font-semibold leading-tight sm:text-xs">{{ cell.name }}</span>
          <div
            v-if="gameStore.currentPlayer?.fastTrackPosition === cell.index"
            class="absolute -top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-background shadow-md"
            :style="{ backgroundColor: gameStore.currentPlayer.color }"
          >
            {{ gameStore.currentPlayer.name.slice(0, 1) }}
          </div>
        </div>
      </div>

      <!-- Dream card -->
      <article
        v-if="gameStore.currentPlayer?.dream"
        class="flex w-full max-w-sm items-center justify-between rounded-2xl border border-border bg-background p-5 shadow-md"
      >
        <div>
          <div class="text-xs uppercase tracking-wider text-muted-foreground">目标</div>
          <h2 class="mt-1 text-lg font-semibold">{{ gameStore.currentPlayer.dream.name }}</h2>
          <div class="mt-1 text-2xl font-bold text-primary">
            {{ formatMoney(gameStore.currentPlayer.dream.price) }}
          </div>
        </div>
        <Target class="h-10 w-10 text-primary" />
      </article>

      <!-- Summary -->
      <div class="flex flex-wrap justify-center gap-3 sm:gap-4">
        <div class="rounded-2xl bg-muted px-5 py-3 text-sm font-semibold">
          月现金流：{{ formatMoney((gameStore.currentPlayer?.cashFlow ?? 0) * 100) }}
        </div>
        <div class="rounded-2xl bg-muted px-5 py-3 text-sm font-semibold">
          现金：{{ formatMoney(gameStore.currentPlayer?.cash ?? 0) }}
        </div>
      </div>

      <!-- Pending action -->
      <div
        v-if="gameStore.pendingAction.message"
        class="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-md"
      >
        <p class="text-sm font-medium">{{ gameStore.pendingAction.message }}</p>

        <div v-if="ftOpportunityCard" class="mt-3 rounded-xl border border-border bg-secondary p-3">
          <div class="text-xs uppercase tracking-wider text-muted-foreground">
            {{ ftOpportunityCard.size === 'big' ? '大机会' : '小机会' }}
          </div>
          <div class="text-base font-semibold">{{ ftOpportunityCard.title }}</div>
          <p class="text-sm text-muted-foreground">{{ ftOpportunityCard.description }}</p>
          <div class="mt-2 flex gap-4 text-sm">
            <span>价格：<span class="font-medium">{{ formatMoney(ftOpportunityCard.cost) }}</span></span>
            <span>月现金流：<span class="font-medium text-success">{{ formatMoney(ftOpportunityCard.cashFlow) }}</span></span>
          </div>
          <div v-if="ftOpportunityCard.type === 'stock'" class="mt-2 flex items-center gap-2">
            <label class="text-sm">数量：</label>
            <input
              v-model.number="ftQuantity"
              type="number"
              min="1"
              :max="ftOpportunityCard.maxQuantity"
              class="h-8 w-20 rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              :disabled="gameStore.currentPlayer ? gameStore.currentPlayer.cash < ftOpportunityCard.cost * ftQuantity : true"
              class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
              @click="onBuyFtOpportunity"
            >
              买入
            </button>
            <button
              type="button"
              class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
              @click="onDeclineFtOpportunity"
            >
              放弃
            </button>
          </div>
        </div>

        <div v-if="ftDreamPending" class="mt-3 flex gap-2">
          <button
            type="button"
            :disabled="gameStore.currentPlayer ? (gameStore.currentPlayer.cash < (gameStore.currentPlayer.dream?.price ?? Infinity)) : true"
            class="rounded-full bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
            @click="onBuyDream"
          >
            购买梦想
          </button>
          <button
            type="button"
            class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
            @click="onAcknowledge"
          >
            暂不购买
          </button>
        </div>

        <div
          v-if="!ftOpportunityCard && !ftDreamPending"
          class="mt-3"
        >
          <button
            type="button"
            class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
            @click="onAcknowledge"
          >
            知道了
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 sm:gap-4">
        <button
          type="button"
          :disabled="gameStore.turnStatus !== 'idle'"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          @click="onRollDice"
        >
          <Rocket class="h-5 w-5" />
          掷双骰
        </button>
        <button
          type="button"
          :disabled="gameStore.turnStatus === 'idle'"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-success px-6 text-sm font-semibold text-success-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          @click="onEndTurn"
        >
          <RotateCcw class="h-5 w-5" />
          结束回合
        </button>
      </div>
    </section>

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
  </main>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
