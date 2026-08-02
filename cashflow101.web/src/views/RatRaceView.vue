<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Dice5,
  Dices,
  Landmark,
  Shield,
  TrendingUp,
  BriefcaseBusiness,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset, Liability, MarketEventCard, OpportunityCard, StoryCard } from '@/types/game'
import BankModal from '@/components/BankModal.vue'
import DiceRoller from '@/components/DiceRoller.vue'
import RatRaceBoard from '@/components/RatRaceBoard.vue'
import TransactionHistory from '@/components/TransactionHistory.vue'
import CardHistory from '@/components/CardHistory.vue'
import QuantitySelector from '@/components/QuantitySelector.vue'
import { History, Receipt, CreditCard, BarChart2 } from 'lucide-vue-next'
import FinancialCharts from '@/components/FinancialCharts.vue'
import StockPortfolioChart from '@/components/StockPortfolioChart.vue'

const router = useRouter()
const gameStore = useGameStore()

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function goHome() {
  gameStore.resetGame()
  router.push({ name: 'home' })
}

function enterFastTrack() {
  gameStore.enterFastTrack()
  router.push({ name: 'fast-track' })
}

// 骰子动画
const showDiceAnimation = ref(false)

function onRollDice() {
  // 先触发动画，动画结束后 store 已经计算好了结果
  showDiceAnimation.value = true
  gameStore.ratRaceRollDice()
}

function onDiceAnimationDone() {
  showDiceAnimation.value = false
}

// ========== 棋盘中心卡片显示相关 ==========
const showBoardCard = computed(() => {
  return (
    gameStore.pendingAction.type === 'opportunity' ||
    gameStore.pendingAction.type === 'market' ||
    gameStore.pendingAction.type === 'story'
  )
})

const boardCardType = computed<'opportunity' | 'market' | 'story' | null>(() => {
  if (gameStore.pendingAction.type === 'opportunity') return 'opportunity'
  if (gameStore.pendingAction.type === 'market') return 'market'
  if (gameStore.pendingAction.type === 'story') return 'story'
  return null
})

const boardCardData = computed<OpportunityCard | MarketEventCard | StoryCard | null>(() => {
  if (gameStore.pendingAction.type === 'opportunity' && gameStore.pendingAction.card) {
    return gameStore.pendingAction.card as OpportunityCard
  }
  if (gameStore.pendingAction.type === 'market') {
    return gameStore.marketEvent ?? (gameStore.pendingAction.card as MarketEventCard) ?? null
  }
  if (gameStore.pendingAction.type === 'story' && gameStore.pendingAction.card) {
    return gameStore.pendingAction.card as StoryCard
  }
  return null
})

// ========== 机会卡相关 ==========
const opportunityCard = computed<OpportunityCard | null>(() => {
  if (gameStore.pendingAction.type === 'opportunity' && gameStore.pendingAction.card) {
    return gameStore.pendingAction.card as OpportunityCard
  }
  return null
})

const maxOpportunityQuantity = computed(() => {
  const card = opportunityCard.value
  const player = gameStore.currentPlayer
  if (!card || !player || card.cost <= 0) return 1

  // 卖出卡：最大数量 = 持仓数量
  if (card.action === 'sell' && card.type === 'stock' && card.symbol) {
    const holding = gameStore.getStockHolding(card.symbol)
    return holding?.quantity ?? 0
  }

  // 买入卡
  if (card.maxQuantity) {
    // 受现金限制
    const maxByCash = Math.floor(player.cash / card.cost)
    return Math.max(1, Math.min(card.maxQuantity, maxByCash))
  }
  // 根据现金计算最大可购买数量
  return Math.max(1, Math.floor(player.cash / card.cost))
})

const isOpportunitySell = computed(() => {
  const card = opportunityCard.value
  return card?.type === 'stock' && card.action === 'sell'
})

const currentStockHolding = computed(() => {
  const card = opportunityCard.value
  if (!card || card.type !== 'stock' || !card.symbol) return null
  return gameStore.getStockHolding(card.symbol)
})

// ========== 市场卡相关 ==========
const marketCard = computed<MarketEventCard | null>(() => {
  if (gameStore.pendingAction.type === 'market') {
    return gameStore.marketEvent ?? (gameStore.pendingAction.card as MarketEventCard)
  }
  return null
})

const sellableAssets = computed(() => {
  const p = gameStore.marketResponder
  const card = marketCard.value
  if (!p || !card) return []
  return p.assets.filter((a) => {
    if (card.targetType === 'stock' && card.targetSymbol) {
      return a.type === 'stock' && a.symbol === card.targetSymbol
    }
    if (card.targetType === 'all') return true
    return a.type === card.targetType
  })
})

const opportunityQuantity = ref(1)
const showBankModal = ref(false)
const repayInputs = ref<Record<string, number>>({})
const sidePanelTab = ref<'balance' | 'history' | 'stats'>('balance')
const historyTab = ref<'transactions' | 'cards'>('transactions')

const canBuyInsurance = computed(() => {
  const p = gameStore.currentPlayer
  if (!p || gameStore.phase !== 'rat_race' || p.hasInsurance) return false
  const cost = p.totalExpenses * 6
  return p.cash >= cost && gameStore.turnStatus === 'idle'
})

function onEndTurn() {
  gameStore.moveToNextPlayer()
}

function onBuyOpportunity() {
  gameStore.buyOpportunity(opportunityQuantity.value)
  opportunityQuantity.value = 1
}

function onDeclineOpportunity() {
  gameStore.declineOpportunity()
  opportunityQuantity.value = 1
}

const sellQuantities = ref<Record<string, number>>({})

function getSellQuantity(assetId: string, defaultQty: number = 1): number {
  return sellQuantities.value[assetId] ?? defaultQty
}

function setSellQuantity(assetId: string, val: number) {
  sellQuantities.value[assetId] = val
}

function getUnitLabel(assetType: string): string {
  switch (assetType) {
    case 'stock': return '股'
    case 'real_estate': return '套'
    case 'business': return '家'
    default: return '份'
  }
}

function changeSellQty(assetId: string, delta: number) {
  const asset = sellableAssets.value.find((a) => a.id === assetId)
  if (!asset) return
  const current = sellQuantities.value[assetId] ?? 1
  const next = Math.max(1, Math.min(asset.quantity, current + delta))
  sellQuantities.value[assetId] = next
}

function getMarketPrice(asset: Asset): number {
  const card = marketCard.value
  if (!card) return asset.cost
  if (card.targetType === 'stock' && card.targetSymbol && asset.symbol === card.targetSymbol) {
    return card.fixedPrice ?? asset.cost
  }
  return asset.cost * card.multiplier
}

function onSellAsset(asset: Asset) {
  const qty = getSellQuantity(asset.id)
  gameStore.sellAssetToMarket(asset.id, qty)
  // 重置数量
  delete sellQuantities.value[asset.id]
}

function onRepayLoan(loan: Liability) {
  const amount = repayInputs.value[loan.id] ?? loan.amount
  gameStore.repayBankLoan(loan.id, amount)
}

function onPayoffLiability(loan: Liability) {
  gameStore.payoffLiability(loan.id)
}

function onAcknowledge() {
  gameStore.acknowledgeMessage()
}

// 判断 pending action 浮层是否应该显示
// 当有卡片在棋盘中心显示时，浮层仍然显示操作按钮
const showPendingPanel = computed(() => {
  return gameStore.pendingAction.type || gameStore.pendingAction.message
})
</script>

<template>
  <main class="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
    <!-- Top bar -->
    <header
      class="shrink-0 flex items-center justify-between gap-4 border-b border-border bg-secondary/50 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TrendingUp class="h-5 w-5" />
        </div>
        <h1 class="text-lg font-semibold tracking-tight sm:text-xl">老鼠赛跑</h1>
      </div>
      <div class="flex items-center gap-2 sm:gap-4">
        <span
          v-if="gameStore.currentPlayer"
          class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium sm:text-sm"
        >
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{ backgroundColor: gameStore.currentPlayer.color }"
          />
          当前玩家：{{ gameStore.currentPlayer.name }}
        </span>
        <!-- 失业状态徽章 -->
        <span
          v-if="gameStore.currentPlayer?.isUnemployed"
          class="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive sm:text-sm"
        >
          <BriefcaseBusiness class="h-3.5 w-3.5" />
          失业中 (剩{{ gameStore.currentPlayer.unemploymentTurns }}回合)
        </span>
        <!-- 双骰 buff 徽章 -->
        <span
          v-if="gameStore.currentPlayer?.doubleDiceNextTurn"
          class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary animate-pulse sm:text-sm"
        >
          <Dices class="h-3.5 w-3.5" />
          下次双骰
        </span>
        <button
          type="button"
          :disabled="!gameStore.canCurrentPlayerEnterFastTrack"
          class="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-5 sm:text-sm"
          @click="enterFastTrack"
        >
          进入快车道
          <ArrowRight class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-[var(--radius-md)] px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary sm:px-3 sm:text-sm"
          @click="goHome"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">返回首页</span>
        </button>
      </div>
    </header>

    <!-- Game area -->
    <div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <!-- Left side panel -->
      <aside
        class="order-2 flex shrink-0 flex-col overflow-hidden border-t border-border bg-secondary/30 lg:order-1 lg:w-80 lg:border-t-0 lg:border-r xl:w-96"
      >
        <!-- Panel tabs -->
        <div class="flex border-b border-border px-4 pt-3 lg:px-5">
          <button
            class="relative flex-1 pb-3 text-sm font-medium transition-colors"
            :class="sidePanelTab === 'balance' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
            @click="sidePanelTab = 'balance'"
          >
            <span class="flex items-center justify-center gap-1.5">
              <Receipt class="h-4 w-4" />
              财务
            </span>
            <span
              v-if="sidePanelTab === 'balance'"
              class="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary"
            />
          </button>
          <button
            class="relative flex-1 pb-3 text-sm font-medium transition-colors"
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
            class="relative flex-1 pb-3 text-sm font-medium transition-colors"
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
          <!-- Balance sheet tab -->
          <div v-if="sidePanelTab === 'balance' && gameStore.currentPlayer" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">财务报表</h2>
            <span class="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              {{ gameStore.currentPlayer.career.name }}
            </span>
          </div>

          <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">收入</h3>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between">
                <span class="text-muted-foreground">工资</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.salary) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">被动收入</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.passiveIncome) }}</span>
              </li>
            </ul>
            <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>总收入</span>
              <span>{{ formatMoney(gameStore.currentPlayer.totalIncome) }}</span>
            </div>
          </section>

          <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">支出</h3>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between">
                <span class="text-muted-foreground">税金</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.taxes) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">房贷</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.mortgage) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">学生贷款</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.schoolLoan) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">车贷</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.carLoan) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">信用卡</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.creditCard) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">其他支出</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.other) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-muted-foreground">子女支出</span>
                <span class="font-medium">{{ formatMoney(gameStore.currentPlayer.expenses.child) }}</span>
              </li>
            </ul>
            <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>总支出</span>
              <span>{{ formatMoney(gameStore.currentPlayer.totalExpenses) }}</span>
            </div>
          </section>

          <section class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">现金流</div>
              <div class="text-lg font-semibold text-success">{{ formatMoney(gameStore.currentPlayer.cashFlow) }}</div>
            </div>
            <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">储蓄</div>
              <div class="text-lg font-semibold">{{ formatMoney(gameStore.currentPlayer.cash) }}</div>
            </div>
          </section>

          <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">资产</h3>
            <ul v-if="gameStore.currentPlayer.assets.length" class="space-y-2 text-sm">
              <li
                v-for="asset in gameStore.currentPlayer.assets"
                :key="asset.id"
                class="flex items-center justify-between"
              >
                <span class="text-muted-foreground">{{ asset.name }} ×{{ asset.quantity }}</span>
                <span class="font-medium">+{{ formatMoney(asset.cashFlow * asset.quantity) }}/月</span>
              </li>
            </ul>
            <div v-else class="text-sm text-muted-foreground">暂无资产</div>
          </section>

          <!-- 股票投资组合 -->
          <section
            v-if="gameStore.currentPlayer?.assets.some(a => a.type === 'stock')"
            class="rounded-2xl border border-border bg-background p-4 shadow-sm"
          >
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">股票组合</h3>
            <StockPortfolioChart v-if="gameStore.currentPlayer" :player-id="gameStore.currentPlayer.id" />
          </section>

          <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">负债</h3>
            <ul v-if="gameStore.currentPlayer.liabilities.length" class="space-y-2 text-sm">
              <li
                v-for="loan in gameStore.currentPlayer.liabilities"
                :key="loan.id"
                class="flex flex-col gap-1"
              >
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">{{ loan.name }}</span>
                  <span class="font-medium">{{ formatMoney(loan.amount) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <template v-if="loan.category === 'bank_loan'">
                    <input
                      v-model.number="repayInputs[loan.id]"
                      type="number"
                      :placeholder="`最多 ${formatMoney(loan.amount)}`"
                      class="h-8 w-24 rounded-md border border-input px-2 text-sm"
                    />
                    <button
                      type="button"
                      class="rounded-md bg-secondary px-2 py-1 text-xs font-semibold hover:bg-muted"
                      @click="onRepayLoan(loan)"
                    >
                      还贷
                    </button>
                  </template>
                  <button
                    v-else
                    type="button"
                    class="rounded-md bg-secondary px-2 py-1 text-xs font-semibold hover:bg-muted"
                    @click="onPayoffLiability(loan)"
                  >
                    还清
                  </button>
                </div>
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
                class="relative flex-1 pb-2 text-xs font-medium transition-colors"
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
                class="relative flex-1 pb-2 text-xs font-medium transition-colors"
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
                {{ gameStore.currentPlayer?.financialSnapshots.length ?? 0 }} 个快照
              </span>
            </div>
            <FinancialCharts v-if="gameStore.currentPlayer" :player-id="gameStore.currentPlayer.id" />
          </div>
        </div>
      </aside>

      <!-- Board -->
      <section class="relative order-1 flex flex-1 flex-col overflow-hidden">
        <div class="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6">
          <div class="h-full w-full max-h-full max-w-[680px]">
            <RatRaceBoard
              :players="gameStore.players"
              :current-position="gameStore.currentPlayer?.ratRacePosition ?? 0"
              :last-roll="gameStore.lastRoll"
              :turn-number="gameStore.turnNumber"
              :current-player-name="gameStore.currentPlayer?.name ?? ''"
              :is-rolling="showDiceAnimation"
              :dice-values="gameStore.lastDiceValues"
              :show-card="showBoardCard"
              :card-type="boardCardType"
              :card-data="boardCardData"
            />
          </div>
        </div>

        <!-- Pending action floating panel -->
        <Transition name="slide-up">
          <div
            v-if="showPendingPanel"
            class="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 sm:px-6 sm:pb-4"
          >
            <div class="pointer-events-auto mx-auto max-w-[680px] rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-md">
          <div class="flex items-start gap-3">
            <AlertCircle v-if="!showBoardCard" class="mt-0.5 h-5 w-5 text-primary" />
            <div class="flex-1">
              <!-- 非卡片类 pending action 显示消息 -->
              <p v-if="!showBoardCard" class="text-sm font-medium">{{ gameStore.pendingAction.message }}</p>

              <!-- ========== 机会卡操作区（卡片内容显示在棋盘中心，这里只放操作控件） ========== -->
              <div v-if="opportunityCard" class="card-action-panel">
                <!-- 股票拆分/合股卡：自动生效，仅显示确认按钮 -->
                <div v-if="opportunityCard.splitRatio !== undefined">
                  <div class="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                    <template v-if="opportunityCard.splitRatio > 1">
                      拆分比例：1 拆 {{ opportunityCard.splitRatio }}
                    </template>
                    <template v-else>
                      合股比例：{{ Math.round(1 / opportunityCard.splitRatio) }} 合 1
                    </template>
                  </div>
                  <div v-if="currentStockHolding" class="mb-3 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">当前持仓：</span>
                      <span class="font-medium">{{ currentStockHolding.quantity }} 股</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">当前市价：</span>
                      <span class="font-medium">{{ formatMoney(currentStockHolding.marketPrice ?? currentStockHolding.cost) }}</span>
                    </div>
                  </div>
                  <div v-else class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    你当前不持有 {{ opportunityCard.symbol }} 股票。
                  </div>
                  <button
                    type="button"
                    class="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    @click="onBuyOpportunity"
                  >
                    确认
                  </button>
                </div>

                <!-- 股票卖出卡：无持仓提示 -->
                <div v-else-if="isOpportunitySell && maxOpportunityQuantity === 0" class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  你当前没有 {{ opportunityCard.symbol }} 股票，无法卖出。
                </div>

                <!-- 数量选择器（股票类且有有效最大数量时显示，拆分/合股卡除外） -->
                <QuantitySelector
                  v-if="opportunityCard.type === 'stock' && maxOpportunityQuantity > 0 && opportunityCard.splitRatio === undefined"
                  v-model="opportunityQuantity"
                  :max-quantity="maxOpportunityQuantity"
                  :unit-price="opportunityCard.cost"
                  :mode="isOpportunitySell ? 'sell' : 'buy'"
                  :available-cash="gameStore.currentPlayer?.cash"
                  asset-type="stock"
                  unit-label="股"
                  class="mb-3"
                />

                <!-- 非股票类数量选择器（保留原简单样式） -->
                <div v-else-if="opportunityCard.type !== 'stock'" class="mb-3 flex items-center gap-3">
                  <label class="text-sm font-medium text-foreground">购买数量：</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      :disabled="opportunityQuantity <= 1"
                      class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      @click="opportunityQuantity = Math.max(1, opportunityQuantity - 1)"
                    >
                      <span class="text-lg font-bold">−</span>
                    </button>
                    <input
                      v-model.number="opportunityQuantity"
                      type="number"
                      min="1"
                      :max="maxOpportunityQuantity"
                      class="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      :disabled="opportunityQuantity >= maxOpportunityQuantity"
                      class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      @click="opportunityQuantity = Math.min(maxOpportunityQuantity, opportunityQuantity + 1)"
                    >
                      <span class="text-lg font-bold">+</span>
                    </button>
                  </div>
                  <span v-if="maxOpportunityQuantity > 1" class="text-xs text-muted-foreground">
                    最多 {{ maxOpportunityQuantity }} 份
                  </span>
                </div>

                <!-- 总价显示（非股票类） -->
                <div v-if="opportunityCard.type !== 'stock'" class="mb-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span class="text-sm text-muted-foreground">总价：</span>
                  <span class="text-base font-bold text-foreground">
                    {{ formatMoney(opportunityCard.cost * opportunityQuantity) }}
                  </span>
                </div>

                <!-- 操作按钮（拆分/合股卡除外） -->
                <div v-if="opportunityCard.splitRatio === undefined" class="flex gap-2">
                  <button
                    v-if="!isOpportunitySell"
                    type="button"
                    :disabled="gameStore.currentPlayer ? gameStore.currentPlayer.cash < opportunityCard.cost * opportunityQuantity : true"
                    class="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    买入
                  </button>
                  <button
                    v-else
                    type="button"
                    :disabled="maxOpportunityQuantity === 0 || opportunityQuantity <= 0"
                    class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    卖出
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                    @click="onDeclineOpportunity"
                  >
                    放弃
                  </button>
                </div>
              </div>

              <!-- ========== 市场卡操作区 ========== -->
              <div v-if="marketCard && gameStore.pendingAction.type === 'market'" class="card-action-panel">
                <!-- 多玩家提示 -->
                <div
                  v-if="gameStore.marketEventState"
                  class="mb-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block h-3 w-3 rounded-full"
                      :style="{ backgroundColor: gameStore.marketResponder?.color }"
                    />
                    <span class="font-medium text-primary">
                      {{ gameStore.marketResponder?.name }} 操作中
                    </span>
                  </div>
                  <span class="text-muted-foreground">
                    {{ gameStore.marketEventState.respondedIds.length }}/{{ gameStore.players.length }} 玩家
                  </span>
                </div>

                <div v-if="sellableAssets.length" class="space-y-2">
                  <p class="text-xs text-muted-foreground">可以选择卖出以下资产：</p>
                  <div
                    v-for="asset in sellableAssets"
                    :key="asset.id"
                    class="space-y-2 rounded-xl border border-border bg-secondary/50 p-3"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">{{ asset.name }} ×{{ asset.quantity }}</span>
                      <span class="text-xs text-success">
                        单价 {{ formatMoney(getMarketPrice(asset)) }}
                      </span>
                    </div>
                    <!-- 数量选择器（所有资产类型，数量>1时显示） -->
                    <QuantitySelector
                      v-if="asset.quantity > 1"
                      :model-value="getSellQuantity(asset.id, asset.quantity)"
                      @update:model-value="(v: number) => setSellQuantity(asset.id, v)"
                      :max-quantity="asset.quantity"
                      :unit-price="getMarketPrice(asset)"
                      mode="sell"
                      :asset-type="asset.type as 'stock' | 'real_estate' | 'business' | 'other'"
                      :unit-label="getUnitLabel(asset.type)"
                      :show-quick-buttons="asset.quantity > 10"
                    />
                    <!-- 数量=1时：简单显示 -->
                    <div v-else class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">
                        可得：<span class="font-semibold text-success">{{ formatMoney(getMarketPrice(asset)) }}</span>
                      </span>
                    </div>
                    <!-- 卖出按钮 -->
                    <button
                      type="button"
                      class="w-full rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      @click="onSellAsset(asset)"
                    >
                      卖出 {{ getSellQuantity(asset.id, asset.quantity) }} {{ getUnitLabel(asset.type) }} · 可得 {{ formatMoney(getMarketPrice(asset) * getSellQuantity(asset.id, asset.quantity)) }}
                    </button>
                  </div>
                </div>
                <div v-else class="text-xs text-muted-foreground">
                  无可卖出的相关资产。
                </div>
                <button
                  type="button"
                  class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  @click="gameStore.dismissMarketEvent()"
                >
                  {{ gameStore.marketEventState && gameStore.marketEventState.respondedIds.length < gameStore.players.length - 1 ? '下一位玩家' : '结束' }}
                </button>
              </div>

              <!-- Charity -->
              <div v-if="gameStore.pendingAction.type === 'charity'" class="mt-3 flex gap-2">
                <button
                  type="button"
                  class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  @click="gameStore.acceptCharity()"
                >
                  捐赠
                </button>
                <button
                  type="button"
                  class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
                  @click="gameStore.declineCharity()"
                >
                  放弃
                </button>
              </div>

              <!-- Need loan -->
              <div v-if="gameStore.pendingAction.type === 'need_loan'" class="mt-3 flex gap-2">
                <button
                  type="button"
                  class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  @click="gameStore.confirmLoanForPending()"
                >
                  申请贷款
                </button>
                <button
                  type="button"
                  class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
                  @click="gameStore.declineLoanForPending()"
                >
                  取消
                </button>
              </div>

              <!-- Doodad / Layoff / Story / Generic -->
              <div
                v-if="
                  gameStore.pendingAction.type === 'doodad' ||
                  gameStore.pendingAction.type === 'layoff' ||
                  gameStore.pendingAction.type === 'story' ||
                  (![
                    'opportunity',
                    'market',
                    'charity',
                  ].includes(gameStore.pendingAction.type || '') &&
                    gameStore.pendingAction.message)
                "
                class="mt-3"
              >
                <button
                  type="button"
                  class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
                  @click="
                    gameStore.pendingAction.type === 'doodad'
                      ? gameStore.dismissDoodad()
                      : gameStore.pendingAction.type === 'story'
                        ? gameStore.dismissStoryCard()
                        : onAcknowledge()
                  "
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

    <!-- Bottom action bar -->
    <footer
      class="shrink-0 border-t border-border bg-secondary/50 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4"
    >
      <!-- Info row -->
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-background"
            :style="{ backgroundColor: gameStore.currentPlayer?.color }"
          />
          <span class="text-sm font-medium text-foreground">
            {{ gameStore.currentPlayer?.name }}
          </span>
          <span class="text-xs text-muted-foreground">
            · {{ gameStore.turnStatus === 'idle' ? '等待掷骰子' : gameStore.turnStatus === 'rolling' ? '掷骰中...' : '操作中' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-muted"
            :title="'银行'"
            @click="showBankModal = true"
          >
            <Landmark class="h-5 w-5" />
          </button>
          <button
            v-if="canBuyInsurance"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success transition hover:bg-success/30"
            :title="'买保险'"
            @click="gameStore.buyInsurance()"
          >
            <Shield class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Main action button -->
      <Transition name="main-btn" mode="out-in">
        <!-- Roll dice button (idle state) -->
        <button
          v-if="gameStore.turnStatus === 'idle'"
          key="roll"
          type="button"
          class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          @click="onRollDice"
        >
          <Dices v-if="gameStore.currentPlayer?.doubleDiceNextTurn" class="h-6 w-6" />
          <Dice5 v-else class="h-6 w-6" />
          {{ gameStore.currentPlayer?.doubleDiceNextTurn ? '掷 双 骰' : '掷 骰 子' }}
        </button>

        <!-- End turn button (resolving state) -->
        <button
          v-else
          key="end"
          type="button"
          class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-base font-semibold text-foreground transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="gameStore.turnStatus === 'rolling'"
          @click="onEndTurn"
        >
          结 束 回 合
          <ArrowRight class="h-5 w-5" />
        </button>
      </Transition>
    </footer>

    <!-- Bank modal -->
    <BankModal :show="showBankModal" @close="showBankModal = false" />

    <!-- Dice roller animation (fullscreen fallback, can be removed later) -->
    <DiceRoller
      :show="showDiceAnimation"
      :values="gameStore.lastDiceValues"
      @done="onDiceAnimationDone"
    />
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

/* 卡片操作面板样式 */
.card-action-panel {
  width: 100%;
}
</style>
