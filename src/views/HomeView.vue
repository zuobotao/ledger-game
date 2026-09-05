<script setup lang="ts">
import { ref, computed } from 'vue'
import { Play, HelpCircle, History, BookOpen, RotateCcw, AlertTriangle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const store = useGameStore()

const resumeInfo = computed(() => store.resumableGame)
const showOverwriteWarning = ref(false)

function goToSetup() {
  // v2.3: 存在挂起对局时，先弹出覆盖确认
  if (resumeInfo.value) {
    showOverwriteWarning.value = true
    return
  }
  router.push({ name: 'setup' })
}

function continueGame() {
  const phase = resumeInfo.value?.phase
  const target = phase === 'fast_track' ? 'fast-track' : 'rat-race'
  router.push({ name: target })
}

function confirmNewGame() {
  showOverwriteWarning.value = false
  router.push({ name: 'setup' })
}

function goToRules() {
  router.push({ name: 'rules' })
}

function goToGuide() {
  router.push({ name: 'guide' })
}

function goToHistory() {
  router.push({ name: 'history' })
}
</script>

<template>
  <main>
    <div
      class="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center"
    >
      <span class="absolute right-6 top-6 font-mono text-xs tracking-wide text-muted-foreground"
        >v0.1</span
      >

      <div class="mx-auto max-w-2xl">
        <h1
          class="mb-4 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl"
        >
          Ledger
        </h1>
        <p class="mb-6 text-xl font-medium text-foreground sm:text-2xl">财商教育模拟游戏</p>
        <p
          class="mx-auto mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          通过模拟真实的个人财务与投资场景，学习资产负债管理，
          完成原始资本积累，练习投资决策、建立被动收入，走向财务自由。
        </p>

        <!-- v2.3: 继续游戏卡片 -->
        <div
          v-if="resumeInfo"
          data-testid="continue-game"
          class="mx-auto mb-8 max-w-md rounded-2xl border border-primary/30 bg-secondary/30 p-5 text-left"
        >
          <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <RotateCcw class="h-4 w-4" />
            继续游戏
          </div>
          <div class="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">玩家</span>
              <span class="font-medium">{{ resumeInfo.playerName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">阶段</span>
              <span class="font-medium">{{ resumeInfo.phase === 'fast_track' ? '快车道' : '老鼠圈' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">第 {{ resumeInfo.turnNumber }} 回合</span>
              <span class="font-medium">{{ resumeInfo.playerCount }} 人</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">回合玩家</span>
              <span class="font-medium">{{ resumeInfo.currentPlayerName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">现金</span>
              <span class="font-semibold">{{ formatMoney(resumeInfo.cash) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Cash Flow</span>
              <span class="font-semibold text-success">+{{ formatMoney(resumeInfo.cashFlow) }}/月</span>
            </div>
          </div>
          <button
            type="button"
            data-testid="continue-game-btn"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96]"
            @click="continueGame"
          >
            <Play class="h-4 w-4" />
            继续游戏
          </button>
        </div>

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            data-dom-id="btn-start"
            data-testid="game-start"
            class="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            @click="goToSetup"
          >
            <Play class="h-5 w-5" />
            {{ resumeInfo ? '开始新游戏' : '开始游戏' }}
          </button>
          <button
            type="button"
            @click="goToRules"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <HelpCircle class="h-5 w-5" />
            游戏规则
          </button>
          <button
            type="button"
            data-testid="guide-entry"
            @click="goToGuide"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-semibold text-foreground/80 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <BookOpen class="h-5 w-5" />
            新手简介
          </button>
        </div>

        <div class="mt-6">
          <button
            type="button"
            @click="goToHistory"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <History class="h-4 w-4" />
            历史对局
          </button>
        </div>

        <p class="mt-12 max-w-md text-xs text-muted-foreground/60">
          本游戏为财商教育模拟工具，仅供学习交流使用。
          所有场景、人物、数据均为虚构，不构成任何投资建议。
        </p>
      </div>

      <!-- v2.3: 覆盖存档确认弹窗 -->
      <div
        v-if="showOverwriteWarning"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm"
        @click.self="showOverwriteWarning = false"
      >
        <div
          data-testid="new-game-warning"
          class="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-left shadow-xl"
        >
          <div class="mb-3 flex items-start gap-3">
            <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-semibold text-foreground">开始新游戏</h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                当前游戏尚未结束。开始新游戏将覆盖当前进度。
              </p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              data-testid="new-game-cancel"
              class="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
              @click="showOverwriteWarning = false"
            >
              取消
            </button>
            <button
              type="button"
              data-testid="new-game-confirm"
              class="inline-flex h-10 items-center justify-center rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition hover:brightness-[0.95]"
              @click="confirmNewGame"
            >
              开始新游戏
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>