<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bot,
  Calendar,
  Dices,
  Eye,
  Landmark,
  Lightbulb,
  PieChart,
  Rocket,
  Target,
  History,
  Receipt,
  CreditCard,
  BarChart2,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset, OpportunityCard } from '@/types/game'
import FastTrackBoard from '@/components/FastTrackBoard.vue'
import BankModal from '@/components/BankModal.vue'
import TransactionHistory from '@/components/TransactionHistory.vue'
import CardHistory from '@/components/CardHistory.vue'
import FinancialCharts from '@/components/FinancialCharts.vue'
import PlayerSwitcher from '@/components/PlayerSwitcher.vue'
import GoalProgress from '@/components/GoalProgress.vue'
import PhaseSwitcher from '@/components/PhaseSwitcher.vue'
import AITutorAdvice from '@/components/AITutorAdvice.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

// 是否处于观战模式
const isSpectator = computed(() => route.query.spectator === 'true')

const ageDisplay = computed(() => {
  const age = gameStore.currentPlayerAge
  return `${age.years}岁${age.months}月`
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}

// ========== 骰子动画 ==========
const showDiceAnimation = ref(false)
// 骰子动画期间抑制卡片和操作框显示
const suppressUI = ref(false)

function onRollDice() {
  suppressUI.value = true
  showDiceAnimation.value = true
  gameStore.fastTrackRollDice()
}

function onDiceAnimationDone() {
  showDiceAnimation.value = false
  // 骰子动画结束后，延迟一小段时间再显示卡片和操作框
  setTimeout(() => {
    suppressUI.value = false
  }, 200)
}

// ========== 棋盘中心卡片显示 ==========
const showBoardOpportunity = computed(() => {
  if (suppressUI.value) return false
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
const showPlayerSwitcher = ref(false)

// 侧边栏显示的玩家（可以切换查看其他玩家）
const displayPlayer = computed(() => gameStore.viewingPlayer)
const sidePanelTab = ref<'finance' | 'history' | 'stats'>('finance')
const historyTab = ref<'transactions' | 'cards'>('transactions')

// 快车道财务面板工具函数
function getFtUnitLabel(assetType: string): string {
  switch (assetType) {
    case 'stock': return '股'
    case 'real_estate': return '套'
    case 'business': return '家'
    default: return '份'
  }
}

function getFtAssetPnL(asset: Asset): number {
  const marketValue = (asset.marketPrice ?? asset.cost) * asset.quantity
  const costValue = asset.cost * asset.quantity
  return marketValue - costValue
}

function getFtAssetPnLPercent(asset: Asset): number {
  const costValue = asset.cost * asset.quantity
  if (costValue === 0) return 0
  const pnl = getFtAssetPnL(asset)
  return (pnl / costValue) * 100
}

// 当前玩家是否是 AI
const isCurrentPlayerAI = computed(() => {
  return gameStore.currentPlayer?.isAI ?? false
})

// 是否禁用人类操作
const disableHumanActions = computed(() => {
  return isSpectator.value || gameStore.isAIThinking || isCurrentPlayerAI.value
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

// 操作型 pending action（底部浮层，需要用户操作）
const showActionPanel = computed(() => {
  if (suppressUI.value) return false
  return !!gameStore.pendingAction.type
})

// 纯消息型提示（棋盘上方，不需要点击确认，结束回合自动消失）
const showMessageToast = computed(() => {
  if (suppressUI.value) return false
  return !gameStore.pendingAction.type && !!gameStore.pendingAction.message
})

// 获胜后自动跳转到胜利页面
watch(
  () => gameStore.winnerId,
  (id) => {
    if (id) {
      setTimeout(() => {
        const target = gameStore.gameEndReason === 'retirement' ? 'retirement' : 'victory'
        router.push({ name: target })
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
          <h1 class="text-base font-semibold flex items-center gap-2">
            资本游戏
            <span
              v-if="isSpectator"
              class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400"
            >
              <Eye class="h-3 w-3" />
              观战模式
            </span>
          </h1>
          <p class="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar class="h-3 w-3" />
            {{ ageDisplay }} · 第 {{ gameStore.turnNumber }} 回合
          </p>
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
          class="flex shrink-0 flex-col overflow-hidden border-r border-border bg-secondary/30 w-72 sm:w-80 lg:w-96"
        >
          <!-- Player switcher (multiplayer) -->
          <div v-if="gameStore.players.length > 1" class="px-4 pt-3 lg:px-5">
            <PlayerSwitcher v-model:show="showPlayerSwitcher" />
          </div>

          <!-- 目标进度 -->
          <div class="px-4 pt-3 lg:px-5">
            <GoalProgress phase="fast_track" />
          </div>

          <!-- 跨阶段观战切换 -->
          <div class="px-4 pt-3 lg:px-5">
            <PhaseSwitcher />
          </div>

          <!-- 学习模式开关 -->
          <div class="px-4 pt-3 lg:px-5">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-xs transition hover:bg-muted/50"
              :class="{ 'border-primary/40 bg-primary/10': gameStore.learningMode }"
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
          </div>

          <!-- Panel tabs -->
          <div class="flex border-b border-border px-4 pt-3 lg:px-5">
            <button
              type="button"
              class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
              :class="sidePanelTab === 'finance' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="sidePanelTab = 'finance'"
            >
              <span class="flex items-center justify-center gap-1.5">
                <Receipt class="h-4 w-4" />
                财务
              </span>
              <span
                v-if="sidePanelTab === 'finance'"
                class="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary"
              />
            </button>
            <button
              type="button"
              class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
              :class="sidePanelTab === 'history' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="sidePanelTab = 'history'"
            >
              <span class="flex items-center justify-center gap-1.5">
                <History class="h-4 w-4" />
                历史
              </span>
              <span
                v-if="sidePanelTab === 'history'"
                class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
              />
            </button>
            <button
              type="button"
              class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
              :class="sidePanelTab === 'stats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="sidePanelTab = 'stats'"
            >
              <span class="flex items-center justify-center gap-1.5">
                <BarChart2 class="h-4 w-4" />
                统计
              </span>
              <span
                v-if="sidePanelTab === 'stats'"
                class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
              />
            </button>
          </div>

          <!-- Panel content -->
          <div class="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
            <!-- Finance tab -->
            <div v-if="sidePanelTab === 'finance' && displayPlayer" class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-semibold">财务报表</h2>
                <span class="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {{ displayPlayer.career.name }}
                </span>
              </div>

              <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">收入</h3>
                <ul class="space-y-2 text-sm">
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">工资</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.salary) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">被动收入</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.passiveIncome) }}</span>
                  </li>
                </ul>
                <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                  <span>总收入</span>
                  <span>{{ formatMoney(displayPlayer.totalIncome) }}</span>
                </div>
              </section>

              <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">支出</h3>
                <ul class="space-y-2 text-sm">
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">税金</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.taxes) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">房贷</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.mortgage) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">学生贷款</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.schoolLoan) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">车贷</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.carLoan) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">信用卡</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.creditCard) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">其他支出</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.other) }}</span>
                  </li>
                  <li class="flex justify-between">
                    <span class="text-muted-foreground">子女支出</span>
                    <span class="font-medium">{{ formatMoney(displayPlayer.expenses.child) }}</span>
                  </li>
                </ul>
                <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                  <span>总支出</span>
                  <span>{{ formatMoney(displayPlayer.totalExpenses) }}</span>
                </div>
              </section>

              <section class="grid grid-cols-2 gap-3">
                <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">现金流</div>
                  <div class="text-lg font-semibold text-success">{{ formatMoney(displayPlayer.cashFlow) }}</div>
                </div>
                <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">现金</div>
                  <div class="text-lg font-semibold">{{ formatMoney(displayPlayer.cash) }}</div>
                </div>
              </section>

              <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">资产</h3>
                <ul v-if="displayPlayer.assets.length" class="space-y-3">
                  <li
                    v-for="asset in displayPlayer.assets"
                    :key="asset.id"
                    class="rounded-xl border border-border/60 bg-secondary/20 p-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-sm font-medium text-foreground truncate">{{ asset.name }}</span>
                        <span
                          v-if="asset.symbol"
                          class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary shrink-0"
                        >
                          {{ asset.symbol }}
                        </span>
                      </div>
                      <span class="text-xs text-muted-foreground shrink-0">
                        {{ asset.quantity }} {{ getFtUnitLabel(asset.type) }}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">成本价</span>
                        <span class="font-medium text-foreground tabular-nums">{{ formatMoney(asset.cost) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">市价</span>
                        <span class="font-medium text-foreground tabular-nums">{{ formatMoney(asset.marketPrice ?? asset.cost) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">总成本</span>
                        <span class="font-medium text-foreground tabular-nums">{{ formatMoney(asset.cost * asset.quantity) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">总市值</span>
                        <span class="font-medium text-foreground tabular-nums">{{ formatMoney((asset.marketPrice ?? asset.cost) * asset.quantity) }}</span>
                      </div>
                      <div class="flex justify-between col-span-2 pt-1 border-t border-border/50">
                        <span class="text-muted-foreground">浮动盈亏</span>
                        <span
                          class="font-semibold tabular-nums"
                          :class="getFtAssetPnL(asset) >= 0 ? 'text-success' : 'text-destructive'"
                        >
                          {{ getFtAssetPnL(asset) >= 0 ? '+' : '' }}{{ formatMoney(getFtAssetPnL(asset)) }}
                          <span class="text-[10px] opacity-80">
                            ({{ getFtAssetPnLPercent(asset) >= 0 ? '+' : '' }}{{ getFtAssetPnLPercent(asset).toFixed(1) }}%)
                          </span>
                        </span>
                      </div>
                    </div>
                    <div v-if="asset.cashFlow > 0" class="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border/50">
                      <span class="text-muted-foreground">月现金流</span>
                      <span class="font-medium text-success">+{{ formatMoney(asset.cashFlow * asset.quantity) }}/月</span>
                    </div>
                  </li>
                </ul>
                <div v-else class="text-sm text-muted-foreground">暂无资产</div>
              </section>

              <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">负债</h3>
                <ul v-if="displayPlayer.liabilities.length" class="space-y-2 text-sm">
                  <li
                    v-for="loan in displayPlayer.liabilities"
                    :key="loan.id"
                    class="flex items-center justify-between"
                  >
                    <span class="text-muted-foreground">{{ loan.name }}</span>
                    <span class="font-medium">{{ formatMoney(loan.amount) }}</span>
                  </li>
                </ul>
                <div v-else class="text-sm text-muted-foreground">无负债</div>
              </section>
            </div>

            <!-- History tab -->
            <div v-else-if="sidePanelTab === 'history'" class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-semibold">历史记录</h2>
                <span class="text-xs text-muted-foreground">
                  共 {{ gameStore.transactions.length + gameStore.cardHistory.length }} 条
                </span>
              </div>

              <!-- History sub-tabs -->
              <div class="flex border-b border-border">
                <button
                  type="button"
                  class="relative flex-1 cursor-pointer pb-2 text-xs font-medium transition-colors"
                  :class="historyTab === 'transactions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                  @click="historyTab = 'transactions'"
                >
                  <span class="flex items-center justify-center gap-1">
                    <Receipt class="h-3.5 w-3.5" />
                    交易记录
                  </span>
                  <span
                    v-if="historyTab === 'transactions'"
                    class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  />
                </button>
                <button
                  type="button"
                  class="relative flex-1 cursor-pointer pb-2 text-xs font-medium transition-colors"
                  :class="historyTab === 'cards' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                  @click="historyTab = 'cards'"
                >
                  <span class="flex items-center justify-center gap-1">
                    <CreditCard class="h-3.5 w-3.5" />
                    抽卡记录
                  </span>
                  <span
                    v-if="historyTab === 'cards'"
                    class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  />
                </button>
              </div>

              <TransactionHistory v-if="historyTab === 'transactions'" />
              <CardHistory v-else />
            </div>

            <!-- Stats tab -->
            <div v-else-if="sidePanelTab === 'stats'" class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-semibold">财务统计</h2>
                <span class="text-xs text-muted-foreground">
                  {{ displayPlayer?.financialSnapshots.length ?? 0 }} 个快照
                </span>
              </div>
              <FinancialCharts v-if="displayPlayer" :player-id="displayPlayer.id" />
            </div>
          </div>
        </aside>
      </Transition>

      <!-- Board -->
      <section class="relative flex flex-1 flex-col overflow-hidden min-h-0">
        <!-- 消息提示（纯消息类，不需要确认） -->
        <Transition name="fade-down">
          <div
            v-if="showMessageToast"
            class="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full border border-border bg-background/90 backdrop-blur-md shadow-lg text-sm font-medium text-foreground max-w-[90%] text-center"
          >
            {{ gameStore.pendingAction.message }}
          </div>
        </Transition>

        <div class="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6 min-h-0">
          <div class="h-full w-full max-h-full max-w-[560px] min-h-0">
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

        <!-- AI 导师建议 -->
        <div v-if="gameStore.learningMode" class="shrink-0 px-4 pb-2 sm:px-8">
          <AITutorAdvice />
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

        <!-- Pending action 操作面板（仅操作型，需要用户选择） -->
        <Transition name="slide-up">
          <div
            v-if="showActionPanel"
            class="pointer-events-none absolute bottom-0 left-0 right-0 z-40 px-3 pb-3 sm:px-6 sm:pb-4"
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
                    class="mt-3 flex justify-end"
                  >
                    <button
                      type="button"
                      :disabled="disableHumanActions"
                      class="rounded-full bg-secondary px-5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                      @click="
                        gameStore.pendingAction.type === 'bankrupt'
                          ? gameStore.resolveBankruptcy()
                          : onAcknowledge()
                      "
                    >
                      {{ gameStore.pendingAction.type === 'bankrupt' ? '继续游戏' : '知道了' }}
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

.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.25s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
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
