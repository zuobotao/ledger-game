<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  Dice5,
  Dices,
  Eye,
  Landmark,
  Lightbulb,
  Shield,
  BriefcaseBusiness,
  PieChart,
  HeartHandshake,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset, Liability, MarketEventCard, OpportunityCard, StoryCard } from '@/types/game'
import BankModal from '@/components/BankModal.vue'
import RatRaceBoard from '@/components/RatRaceBoard.vue'
import TransactionHistory from '@/components/TransactionHistory.vue'
import CardHistory from '@/components/CardHistory.vue'
import QuantitySelector from '@/components/QuantitySelector.vue'
import { History, Receipt, CreditCard, BarChart2 } from 'lucide-vue-next'
import FinancialCharts from '@/components/FinancialCharts.vue'
import StockPortfolioChart from '@/components/StockPortfolioChart.vue'
import GameSummary from '@/components/GameSummary.vue'
import PlayerSwitcher from '@/components/PlayerSwitcher.vue'
import GoalProgress from '@/components/GoalProgress.vue'
import PhaseSwitcher from '@/components/PhaseSwitcher.vue'
import AITutorAdvice from '@/components/AITutorAdvice.vue'
import GameToast from '@/components/GameToast.vue'

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

const showRatRaceSummary = ref(false)
const fastTrackOfferShown = ref(false)

function enterFastTrack() {
  // 先显示总结，用户确认后再进入快车道
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

// 游戏结束后跳转
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

function confirmEnterFastTrack() {
  gameStore.enterFastTrack()
  router.push({ name: 'fast-track' })
}

function closeRatRaceSummary() {
  showRatRaceSummary.value = false
}

// 骰子动画
const showDiceAnimation = ref(false)
// 骰子动画期间抑制卡片和操作框显示
const suppressUI = ref(false)

function onRollDice() {
  // 先抑制 UI 显示，再触发骰子动画，然后执行游戏逻辑
  suppressUI.value = true
  showDiceAnimation.value = true
  gameStore.ratRaceRollDice()
}

function onDiceAnimationDone() {
  showDiceAnimation.value = false
  // 骰子动画结束后，延迟一小段时间再显示卡片和操作框，让用户先看到棋子落点
  setTimeout(() => {
    suppressUI.value = false
  }, 200)
}

// ========== 棋盘中心卡片显示相关 ==========
const showBoardCard = computed(() => {
  if (suppressUI.value) return false
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
    return gameStore.pendingAction.card as unknown as StoryCard
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
  if (!card || !player) return 1

  // 卖出卡：最大数量 = 持仓数量
  if (card.action === 'sell' && card.type === 'stock' && card.symbol) {
    const holding = gameStore.getStockHolding(card.symbol)
    return holding?.quantity ?? 0
  }

  // 计算单位成本（有首付用首付，否则用 cost）
  const unitCost = card.downPayment ?? card.cost
  if (unitCost <= 0) return 1

  // 买入卡
  if (card.maxQuantity) {
    // 受现金限制
    const maxByCash = Math.floor(player.cash / unitCost)
    return Math.max(1, Math.min(card.maxQuantity, maxByCash))
  }
  // 根据现金计算最大可购买数量
  return Math.max(1, Math.floor(player.cash / unitCost))
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

// 股票交易卡：是否为可交易的小机会股票卡（同时显示买卖）
const isStockTradeCard = computed(() => {
  const card = opportunityCard.value
  // 小机会 + 股票类型 + 非拆分/合股卡 = 交易卡
  return card?.size === 'small' && card.type === 'stock' && card.splitRatio === undefined
})

// 股票交易卡：最大可买数量
const maxBuyQuantity = computed(() => {
  const card = opportunityCard.value
  const player = gameStore.currentPlayer
  if (!card || !player || card.cost <= 0) return 0
  const maxByCash = Math.floor(player.cash / card.cost)
  if (card.maxQuantity) {
    return Math.max(0, Math.min(card.maxQuantity, maxByCash))
  }
  return Math.max(0, maxByCash)
})

// 股票交易卡：最大可卖数量
const maxSellQuantity = computed(() => {
  return currentStockHolding.value?.quantity ?? 0
})

// 股票交易卡：是否持有该股票
const hasStockHolding = computed(() => {
  return maxSellQuantity.value > 0
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

// 股票卖出机会（多人模式）
const stockSellQty = ref(1)
const stockSellAsset = computed(() => {
  const state = gameStore.stockSellOpportunityState
  const responder = gameStore.stockSellResponder
  if (!state || !responder) return null
  return responder.assets.find(
    (a) => a.type === 'stock' && a.symbol === state.symbol,
  ) ?? null
})
const stockSellHasMoreHolders = computed(() => {
  const state = gameStore.stockSellOpportunityState
  if (!state) return false
  return state.phase !== 'done' && state.respondedIds.length < gameStore.players.length - 1
})

const opportunityQuantity = ref(1)
const buyQuantity = ref(1)
const sellQuantity = ref(1)
const tradeMode = ref<'buy' | 'sell'>('buy')
const showBankModal = ref(false)
const repayInputs = ref<Record<string, number>>({})
const sidePanelTab = ref<'balance' | 'history' | 'stats'>('balance')
const showPlayerSwitcher = ref(false)
const historyTab = ref<'transactions' | 'cards'>('transactions')

// 侧边栏显示的玩家（可以切换查看其他玩家）
const displayPlayer = computed(() => gameStore.viewingPlayer)

const canBuyInsurance = computed(() => {
  const p = gameStore.currentPlayer
  if (!p || p.phase !== 'rat_race' || p.hasInsurance) return false
  const cost = p.totalExpenses * 6
  return p.cash >= cost && gameStore.turnStatus === 'idle' && !p.isAI
})

const hasAnyInsurance = computed(() => {
  const p = gameStore.currentPlayer
  return p?.hasInsurance || p?.hasUnemploymentInsurance || false
})

const showInsuranceButton = computed(() => {
  const p = gameStore.currentPlayer
  if (!p || p.phase !== 'rat_race' || p.isAI) return false
  // 至少有一个保险可操作（未买的可买，已买的可管理）
  return true
})

const bankInitialTab = ref<'deposit' | 'loan' | 'repay' | 'assets' | 'statement' | 'insurance'>('deposit')

function openBankInsuranceTab() {
  bankInitialTab.value = 'insurance'
  showBankModal.value = true
}

// 当前玩家是否是 AI
const isCurrentPlayerAI = computed(() => {
  return gameStore.currentPlayer?.isAI ?? false
})

// 是否禁用人类操作（AI 回合、观战模式或 AI 正在处理市场事件）
const disableHumanActions = computed(() => {
  if (isSpectator.value) return true
  if (gameStore.isAIThinking) return true
  if (gameStore.pendingAction.type === 'market' && gameStore.marketEventState) {
    const responder = gameStore.marketResponder
    return responder?.isAI ?? false
  }
  if (gameStore.pendingAction.type === 'stock_sell_opportunity' && gameStore.stockSellOpportunityState) {
    const responder = gameStore.stockSellResponder
    return responder?.isAI ?? false
  }
  return isCurrentPlayerAI.value
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
  buyQuantity.value = 1
  sellQuantity.value = 1
  tradeMode.value = 'buy'
}

function onTradeBuy() {
  if (!opportunityCard.value) return
  gameStore.tradeBuyStock(buyQuantity.value)
  // 重置买入数量为 1
  buyQuantity.value = 1
  // 卖出数量也重置（因为持仓可能变化）
  sellQuantity.value = 1
}

function onTradeSell() {
  if (!opportunityCard.value) return
  gameStore.tradeSellStock(sellQuantity.value)
  // 重置卖出数量为 1
  sellQuantity.value = 1
  // 买入数量也重置（因为现金可能变化）
  buyQuantity.value = 1
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

// 计算资产浮动盈亏金额
function getAssetPnL(asset: Asset): number {
  const marketValue = (asset.marketPrice ?? asset.cost) * asset.quantity
  const costValue = asset.cost * asset.quantity
  return marketValue - costValue
}

// 计算资产浮动盈亏百分比
function getAssetPnLPercent(asset: Asset): number {
  const costValue = asset.cost * asset.quantity
  if (costValue === 0) return 0
  const pnl = getAssetPnL(asset)
  return (pnl / costValue) * 100
}

function onSellAsset(asset: Asset) {
  const qty = getSellQuantity(asset.id, asset.quantity)
  gameStore.sellAssetToMarket(asset.id, qty)
  // 重置数量
  delete sellQuantities.value[asset.id]
}

function onSellStockFromOpportunity() {
  const state = gameStore.stockSellOpportunityState
  if (!state) return
  gameStore.sellStockFromOpportunity(state.symbol, state.price, stockSellQty.value)
  stockSellQty.value = 1
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

// 操作型 pending action（底部浮层，需要用户操作）
// 骰子动画期间抑制显示，等动画结束后再弹出
const showActionPanel = computed(() => {
  if (suppressUI.value) return false
  return !!gameStore.pendingAction.type
})
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
            原始资本积累
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
        <!-- 状态徽章（紧凑版） -->
        <span
          v-if="gameStore.currentPlayer?.isUnemployed"
          class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
        >
          <BriefcaseBusiness class="h-3 w-3" />
          失业
        </span>
        <span
          v-if="gameStore.currentPlayer?.doubleDiceNextTurn"
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary animate-pulse"
        >
          <Dices class="h-3 w-3" />
          双骰
        </span>
        <span
          v-if="gameStore.currentPlayer?.charityProtection"
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
          title="慈善保护：下次遭遇裁员时免疫"
        >
          <HeartHandshake class="h-3 w-3" />
          慈善保护
        </span>
        <span
          v-if="gameStore.currentPlayer?.hasUnemploymentInsurance"
          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
          title="失业保险：失业期间领取全额工资"
        >
          <Shield class="h-3 w-3" />
          失业险
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
          @click="bankInitialTab = 'deposit'; showBankModal = true"
        >
          <Landmark class="h-5 w-5" />
        </button>
        <!-- 财务报表（切换到左侧面板财务 Tab） -->
        <button
          type="button"
          class="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-muted"
          title="财务报表"
          @click="sidePanelTab = 'balance'"
        >
          <PieChart class="h-5 w-5" />
        </button>
        <!-- 保险（打开银行保险Tab） -->
        <button
          v-if="showInsuranceButton"
          type="button"
          :class="[
            'flex h-9 w-9 items-center justify-center rounded-full transition',
            hasAnyInsurance
              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
              : 'bg-success/20 text-success hover:bg-success/30',
          ]"
          :title="hasAnyInsurance ? '保险管理' : '购买保险'"
          @click="openBankInsuranceTab"
        >
          <Shield class="h-5 w-5" />
        </button>
        <!-- 进入资本游戏（仅在可进入时显示） -->
        <button
          v-if="gameStore.canCurrentPlayerEnterFastTrack"
          type="button"
          class="hidden sm:inline-flex h-9 items-center gap-1 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20"
          @click="enterFastTrack"
        >
          进入资本游戏
          <ArrowRight class="h-3.5 w-3.5" />
        </button>
      </div>
    </header>

    <!-- Game area -->
    <div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <!-- Left side panel -->
      <aside
        class="order-2 flex max-h-[35vh] min-h-0 shrink-0 flex-col overflow-y-auto border-t border-border bg-secondary/30 lg:max-h-none lg:order-1 lg:w-80 lg:overflow-hidden lg:border-t-0 lg:border-r xl:w-96"
      >
        <!-- Panel tabs -->
        <div v-if="gameStore.players.length > 1" class="px-4 pt-3 lg:px-5">
          <PlayerSwitcher v-model:show="showPlayerSwitcher" />
        </div>

        <!-- 目标进度 -->
        <div class="px-4 pt-3 lg:px-5">
          <GoalProgress phase="rat_race" />
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

        <div class="flex border-b border-border px-4 pt-3 lg:px-5">
          <button
            type="button"
            class="relative flex-1 cursor-pointer pb-3 text-sm font-medium transition-colors"
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
          <!-- Balance sheet tab -->
          <div v-if="sidePanelTab === 'balance' && displayPlayer" class="space-y-4">
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
              <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">储蓄</div>
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
                    {{ asset.quantity }} {{ getUnitLabel(asset.type) }}
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
                      :class="getAssetPnL(asset) >= 0 ? 'text-success' : 'text-destructive'"
                    >
                      {{ getAssetPnL(asset) >= 0 ? '+' : '' }}{{ formatMoney(getAssetPnL(asset)) }}
                      <span class="text-[10px] opacity-80">
                        ({{ getAssetPnLPercent(asset) >= 0 ? '+' : '' }}{{ getAssetPnLPercent(asset).toFixed(1) }}%)
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

          <!-- 股票投资组合 -->
          <section
            v-if="displayPlayer?.assets.some(a => a.type === 'stock')"
            class="rounded-2xl border border-border bg-background p-4 shadow-sm"
          >
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">股票组合</h3>
            <StockPortfolioChart v-if="displayPlayer" :player-id="displayPlayer.id" />
          </section>

          <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">负债</h3>
            <ul v-if="displayPlayer.liabilities.length" class="space-y-2 text-sm">
              <li
                v-for="loan in displayPlayer.liabilities"
                :key="loan.id"
                class="flex flex-col gap-1"
              >
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">{{ loan.name }}</span>
                  <span class="font-medium">{{ formatMoney(loan.amount) }}</span>
                </div>
                <div v-if="gameStore.currentPlayer?.id === displayPlayer.id" class="flex items-center gap-2">
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

      <!-- Board -->
      <section class="relative order-1 flex flex-1 flex-col overflow-hidden min-h-0">
        <!-- 消息提示（纯消息类，不需要确认） -->
        <GameToast :suppress="suppressUI" />

        <div class="grid h-full w-full place-items-center overflow-hidden p-2 sm:p-4 lg:p-6">
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
              @dice-done="onDiceAnimationDone"
            />
        </div>

        <!-- AI 导师建议 -->
        <div v-if="gameStore.learningMode" class="shrink-0 px-4 pb-2 sm:px-8">
          <AITutorAdvice />
        </div>

        <!-- 主操作按钮（棋盘下方） -->
        <div class="relative z-30 shrink-0 flex justify-center px-3 pb-3 sm:px-6 sm:pb-4">
          <Transition name="main-btn" mode="out-in">
            <!-- 掷骰子（idle 状态） -->
            <button
              v-if="gameStore.turnStatus === 'idle'"
              key="roll"
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
              :disabled="isCurrentPlayerAI"
              @click="onRollDice"
            >
              <Dices v-if="gameStore.currentPlayer?.doubleDiceNextTurn" class="h-5 w-5 sm:h-6 sm:w-6" />
              <Dice5 v-else class="h-5 w-5 sm:h-6 sm:w-6" />
              <span>
                {{ gameStore.currentPlayer?.doubleDiceNextTurn ? '掷双骰' : '掷骰子' }}
              </span>
            </button>
            <!-- 结束回合（resolving 状态） -->
            <button
              v-else
              key="end"
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-8 text-base font-semibold text-foreground shadow-md transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:px-10 sm:text-lg"
              :disabled="gameStore.turnStatus === 'rolling' || isCurrentPlayerAI"
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
                    :disabled="disableHumanActions"
                    class="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    确认
                  </button>
                </div>

                <!-- 股票交易卡：Tab 切换买卖，一次只能执行一种操作 -->
                <div v-else-if="isStockTradeCard" class="stock-trade-panel">
                  <!-- 当前持仓信息 -->
                  <div class="mb-3 rounded-xl border border-border bg-secondary/30 p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {{ opportunityCard.symbol }}
                      </span>
                      <span class="text-sm font-semibold text-foreground">
                        市价 {{ formatMoney(opportunityCard.cost) }}
                      </span>
                    </div>
                    <div class="mt-1 flex items-center justify-between text-xs">
                      <span class="text-muted-foreground">当前持仓：</span>
                      <span class="font-medium text-foreground">
                        {{ hasStockHolding ? `${currentStockHolding?.quantity} 股` : '未持有' }}
                      </span>
                    </div>
                    <div v-if="hasStockHolding" class="flex items-center justify-between text-xs">
                      <span class="text-muted-foreground">成本价：</span>
                      <span class="font-medium text-foreground">
                        {{ formatMoney(currentStockHolding?.cost ?? 0) }}
                      </span>
                    </div>
                    <div v-if="hasStockHolding" class="flex items-center justify-between text-xs">
                      <span class="text-muted-foreground">浮动盈亏：</span>
                      <span
                        class="font-semibold"
                        :class="(opportunityCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0) >= 0 ? 'text-success' : 'text-destructive'"
                      >
                        {{ (opportunityCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0) >= 0 ? '+' : '' }}
                        {{ formatMoney((opportunityCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0)) }}
                      </span>
                    </div>
                  </div>

                  <!-- 买卖 Tab 切换 -->
                  <div class="mb-3 flex rounded-xl bg-secondary/50 p-1">
                    <button
                      type="button"
                      class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
                      :class="tradeMode === 'buy'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'"
                      @click="tradeMode = 'buy'"
                    >
                      买入
                    </button>
                    <button
                      type="button"
                      class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
                      :class="tradeMode === 'sell'
                        ? 'bg-success text-success-foreground shadow-sm'
                        : hasStockHolding
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'text-muted-foreground/40 cursor-not-allowed'"
                      :disabled="!hasStockHolding"
                      @click="hasStockHolding && (tradeMode = 'sell')"
                    >
                      卖出
                    </button>
                  </div>

                  <!-- 买入面板 -->
                  <div v-if="tradeMode === 'buy'" class="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="text-sm font-semibold text-primary">买入</span>
                      <span class="text-xs text-muted-foreground">
                        买入价 {{ formatMoney(opportunityCard.cost) }}/股
                      </span>
                    </div>
                    <QuantitySelector
                      v-if="maxBuyQuantity > 0"
                      v-model="buyQuantity"
                      :max-quantity="maxBuyQuantity"
                      :unit-price="opportunityCard.cost"
                      mode="buy"
                      :available-cash="gameStore.currentPlayer?.cash"
                      asset-type="stock"
                      unit-label="股"
                      class="mb-2"
                    />
                    <div v-else class="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      现金不足，无法买入
                    </div>
                    <button
                      type="button"
                      :disabled="maxBuyQuantity === 0 || buyQuantity <= 0 || disableHumanActions"
                      class="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      @click="onTradeBuy"
                    >
                      确认买入 {{ buyQuantity }} 股 · {{ formatMoney(opportunityCard.cost * buyQuantity) }}
                    </button>
                  </div>

                  <!-- 卖出面板 -->
                  <div v-else class="rounded-xl border border-success/30 bg-success/5 p-3">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="text-sm font-semibold text-success">卖出</span>
                      <span class="text-xs text-muted-foreground">
                        卖出价 {{ formatMoney(opportunityCard.cost) }}/股
                      </span>
                    </div>
                    <QuantitySelector
                      v-model="sellQuantity"
                      :max-quantity="maxSellQuantity"
                      :unit-price="opportunityCard.cost"
                      mode="sell"
                      asset-type="stock"
                      unit-label="股"
                      class="mb-2"
                    />
                    <button
                      type="button"
                      :disabled="maxSellQuantity === 0 || sellQuantity <= 0 || disableHumanActions"
                      class="w-full rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      @click="onTradeSell"
                    >
                      确认卖出 {{ sellQuantity }} 股 · {{ formatMoney(opportunityCard.cost * sellQuantity) }}
                    </button>
                  </div>

                  <!-- 放弃按钮 -->
                  <button
                    type="button"
                    :disabled="disableHumanActions"
                    class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    @click="onDeclineOpportunity"
                  >
                    放弃
                  </button>
                </div>

                <!-- 非交易卡的原有逻辑（非股票类、非拆分/合股的股票卡） -->

                <!-- 股票卖出卡：无持仓提示 -->
                <div v-else-if="isOpportunitySell && maxOpportunityQuantity === 0" class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  你当前没有 {{ opportunityCard.symbol }} 股票，无法卖出。
                </div>

                <!-- 数量选择器（股票类且有有效最大数量时显示，拆分/合股卡和交易卡除外） -->
                <QuantitySelector
                  v-if="opportunityCard.type === 'stock' && maxOpportunityQuantity > 0 && opportunityCard.splitRatio === undefined && !isStockTradeCard"
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

                <!-- 价格信息（非股票类） -->
                <div v-if="opportunityCard.type !== 'stock'" class="mb-3 space-y-2 rounded-lg bg-muted px-3 py-2">
                  <!-- 有首付模式（房地产/企业） -->
                  <template v-if="opportunityCard.downPayment !== undefined && opportunityCard.totalValue !== undefined">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">总价：</span>
                      <span class="text-sm font-medium text-foreground">
                        {{ formatMoney(opportunityCard.totalValue * opportunityQuantity) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">首付：</span>
                      <span class="text-base font-bold text-primary">
                        {{ formatMoney(opportunityCard.downPayment * opportunityQuantity) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">贷款：</span>
                      <span class="text-sm font-medium text-amber-500">
                        {{ formatMoney((opportunityCard.totalValue - opportunityCard.downPayment) * opportunityQuantity) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">月现金流：</span>
                      <span class="text-sm font-bold text-success">
                        +{{ formatMoney(opportunityCard.cashFlow * opportunityQuantity) }}
                      </span>
                    </div>
                  </template>
                  <!-- 全额支付模式（其他类） -->
                  <template v-else>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">总价：</span>
                      <span class="text-base font-bold text-foreground">
                        {{ formatMoney(opportunityCard.cost * opportunityQuantity) }}
                      </span>
                    </div>
                  </template>
                </div>

                <!-- 操作按钮（拆分/合股卡和交易卡除外） -->
                <div v-if="opportunityCard.splitRatio === undefined && !isStockTradeCard" class="flex gap-2">
                  <button
                    v-if="!isOpportunitySell"
                    type="button"
                    :disabled="(gameStore.currentPlayer ? gameStore.currentPlayer.cash < (opportunityCard.downPayment ?? opportunityCard.cost) * opportunityQuantity : true) || disableHumanActions"
                    class="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    {{ opportunityCard.downPayment !== undefined ? '支付首付' : '买入' }}
                  </button>
                  <button
                    v-else
                    type="button"
                    :disabled="maxOpportunityQuantity === 0 || opportunityQuantity <= 0 || disableHumanActions"
                    class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    卖出
                  </button>
                  <button
                    type="button"
                    :disabled="disableHumanActions"
                    class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
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

                <div v-if="sellableAssets.length" class="space-y-3">
                  <p class="text-xs text-muted-foreground">可以选择卖出以下资产：</p>
                  <div
                    v-for="asset in sellableAssets"
                    :key="asset.id"
                    class="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm"
                  >
                    <!-- 资产信息头部 -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-foreground">{{ asset.name }}</span>
                          <span
                            v-if="asset.symbol"
                            class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary"
                          >
                            {{ asset.symbol }}
                          </span>
                        </div>
                        <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">持有数量</span>
                            <span class="font-medium text-foreground">{{ asset.quantity }} {{ getUnitLabel(asset.type) }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">卖出单价</span>
                            <span class="font-medium text-success">{{ formatMoney(getMarketPrice(asset)) }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">成本价</span>
                            <span class="font-medium text-foreground">{{ formatMoney(asset.cost) }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">预计总收入</span>
                            <span class="font-bold text-success">{{ formatMoney(getMarketPrice(asset) * getSellQuantity(asset.id, asset.quantity)) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 数量选择器（数量>1时显示） -->
                    <QuantitySelector
                      v-if="asset.quantity > 1"
                      :model-value="getSellQuantity(asset.id, asset.quantity)"
                      @update:model-value="(v: number) => setSellQuantity(asset.id, v)"
                      :max-quantity="asset.quantity"
                      :unit-price="getMarketPrice(asset)"
                      mode="sell"
                      :asset-type="asset.type as 'stock' | 'real_estate' | 'business' | 'other'"
                      :unit-label="getUnitLabel(asset.type)"
                      :show-quick-buttons="asset.quantity > 2"
                    />

                    <!-- 卖出按钮（醒目） -->
                    <button
                      type="button"
                      :disabled="disableHumanActions"
                      class="w-full rounded-full bg-success py-2.5 text-sm font-semibold text-success-foreground shadow-sm shadow-success/20 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  :disabled="disableHumanActions"
                  class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                  @click="gameStore.dismissMarketEvent()"
                >
                  {{ gameStore.marketEventState && gameStore.marketEventState.respondedIds.length < gameStore.players.length - 1 ? '下一位玩家' : '结束' }}
                </button>
              </div>

              <!-- ========== 股票卖出机会操作区（多人模式） ========== -->
              <div
                v-if="gameStore.pendingAction.type === 'stock_sell_opportunity' && gameStore.stockSellOpportunityState"
                class="card-action-panel"
              >
                <!-- 多玩家提示 -->
                <div class="mb-3 flex items-center justify-between rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block h-3 w-3 rounded-full"
                      :style="{ backgroundColor: gameStore.stockSellResponder?.color }"
                    />
                    <span class="font-medium text-teal-400">
                      {{ gameStore.stockSellResponder?.name }} 操作中
                    </span>
                  </div>
                  <span class="text-muted-foreground">
                    所有持有玩家轮询
                  </span>
                </div>

                <div v-if="stockSellAsset" class="space-y-3">
                  <p class="text-xs text-muted-foreground">你可以选择卖出持有的 {{ stockSellAsset.symbol }} 股票：</p>
                  <div class="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
                    <!-- 资产信息头部 -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-foreground">{{ stockSellAsset.name }}</span>
                          <span class="inline-flex items-center rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-teal-400">
                            {{ stockSellAsset.symbol }}
                          </span>
                        </div>
                        <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">持有数量</span>
                            <span class="font-medium text-foreground">{{ stockSellAsset.quantity }} 股</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">卖出单价</span>
                            <span class="font-medium text-success">{{ formatMoney(gameStore.stockSellOpportunityState.price) }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">成本价</span>
                            <span class="font-medium text-foreground">{{ formatMoney(stockSellAsset.cost) }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-muted-foreground">预计总收入</span>
                            <span class="font-bold text-success">{{ formatMoney(gameStore.stockSellOpportunityState.price * stockSellQty) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 数量选择器 -->
                    <QuantitySelector
                      v-if="stockSellAsset.quantity > 1"
                      :model-value="stockSellQty"
                      @update:model-value="(v: number) => stockSellQty = v"
                      :max-quantity="stockSellAsset.quantity"
                      :unit-price="gameStore.stockSellOpportunityState.price"
                      mode="sell"
                      asset-type="stock"
                      unit-label="股"
                      :show-quick-buttons="stockSellAsset.quantity > 2"
                    />

                    <!-- 卖出按钮 -->
                    <button
                      type="button"
                      :disabled="disableHumanActions"
                      class="w-full rounded-full bg-teal-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      @click="onSellStockFromOpportunity"
                    >
                      卖出 {{ stockSellQty }} 股 · 可得 {{ formatMoney(gameStore.stockSellOpportunityState.price * stockSellQty) }}
                    </button>
                  </div>
                </div>
                <div v-else class="text-xs text-muted-foreground">
                  你不持有该股票，无法卖出。
                </div>
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                  @click="gameStore.dismissStockSellOpportunity()"
                >
                  {{ stockSellHasMoreHolders ? '下一位玩家' : '结束' }}
                </button>
              </div>

              <!-- Charity -->
              <div v-if="gameStore.pendingAction.type === 'charity'" class="mt-3 flex gap-2">
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  @click="gameStore.acceptCharity()"
                >
                  捐赠
                </button>
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                  @click="gameStore.declineCharity()"
                >
                  放弃
                </button>
              </div>

              <!-- Need loan -->
              <div v-if="gameStore.pendingAction.type === 'need_loan'" class="mt-3 flex gap-2">
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  @click="gameStore.confirmLoanForPending()"
                >
                  申请贷款
                </button>
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
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
                class="mt-3 flex justify-end"
              >
                <button
                  type="button"
                  :disabled="disableHumanActions"
                  class="rounded-full bg-secondary px-5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
                  @click="
                    gameStore.pendingAction.type === 'doodad'
                      ? gameStore.dismissDoodad()
                      : gameStore.pendingAction.type === 'story'
                        ? gameStore.dismissStoryCard()
                        : gameStore.pendingAction.type === 'bankrupt'
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

    <!-- Bank modal -->
    <BankModal :show="showBankModal" :initial-tab="bankInitialTab" @close="showBankModal = false" />

    <!-- 老鼠圈结束总结 -->
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


/* 卡片操作面板样式 */
.card-action-panel {
  width: 100%;
}
</style>
