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
  RotateCcw,
  Shield,
  TrendingUp,
  BriefcaseBusiness,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset, Liability, MarketEventCard, OpportunityCard } from '@/types/game'
import BankModal from '@/components/BankModal.vue'
import DiceRoller from '@/components/DiceRoller.vue'
import RatRaceBoard from '@/components/RatRaceBoard.vue'

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
  if (card.maxQuantity) return card.maxQuantity
  // 根据现金计算最大可购买数量
  return Math.max(1, Math.floor(player.cash / card.cost))
})

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

function getSellQuantity(assetId: string): number {
  return sellQuantities.value[assetId] ?? 1
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
  const qty = asset.type === 'stock' ? getSellQuantity(asset.id) : asset.quantity
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
      <!-- Financial sheet -->
      <aside
        class="order-2 shrink-0 overflow-y-auto border-t border-border bg-secondary/30 px-4 py-4 lg:order-1 lg:w-80 lg:border-t-0 lg:border-r lg:px-5 xl:w-96"
      >
        <div v-if="gameStore.currentPlayer" class="space-y-4">
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
      </aside>

      <!-- Board -->
      <section class="order-1 flex flex-1 flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <div class="mx-auto max-w-[680px]">
            <RatRaceBoard
              :players="gameStore.players"
              :current-position="gameStore.currentPlayer?.ratRacePosition ?? 0"
              :last-roll="gameStore.lastRoll"
              :turn-number="gameStore.turnNumber"
              :current-player-name="gameStore.currentPlayer?.name ?? ''"
            />
          </div>
        </div>

        <!-- Pending action toast / modal area -->
        <div
          v-if="gameStore.pendingAction.type || gameStore.pendingAction.message"
          class="mx-4 mb-4 rounded-2xl border border-border bg-background p-4 shadow-md lg:mx-6"
        >
          <div class="flex items-start gap-3">
            <AlertCircle class="mt-0.5 h-5 w-5 text-primary" />
            <div class="flex-1">
              <p class="text-sm font-medium">{{ gameStore.pendingAction.message }}</p>

              <!-- Opportunity card -->
              <div v-if="opportunityCard" class="mt-3 rounded-xl border border-border bg-secondary p-3">
                <div class="text-xs uppercase tracking-wider text-muted-foreground">
                  {{ opportunityCard.size === 'big' ? '大机会' : '小机会' }} · {{ opportunityCard.type }}
                </div>
                <div class="text-base font-semibold">{{ opportunityCard.title }}</div>
                <p class="text-sm text-muted-foreground">{{ opportunityCard.description }}</p>
                <div class="mt-2 flex items-center gap-4 text-sm">
                  <span>价格：<span class="font-medium">{{ formatMoney(opportunityCard.cost) }}</span></span>
                  <span>月现金流：<span class="font-medium text-success">{{ formatMoney(opportunityCard.cashFlow) }}</span></span>
                </div>
                <div class="mt-3 flex items-center gap-3">
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
                <div class="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span class="text-sm text-muted-foreground">总价：</span>
                  <span class="text-base font-bold text-foreground">
                    {{ formatMoney(opportunityCard.cost * opportunityQuantity) }}
                  </span>
                </div>
                <div class="mt-3 flex gap-2">
                  <button
                    type="button"
                    :disabled="gameStore.currentPlayer ? gameStore.currentPlayer.cash < opportunityCard.cost * opportunityQuantity : true"
                    class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    @click="onBuyOpportunity"
                  >
                    买入
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
                    @click="onDeclineOpportunity"
                  >
                    放弃
                  </button>
                </div>
              </div>

              <!-- Market event -->
              <div v-if="marketCard && gameStore.pendingAction.type === 'market'" class="mt-3">
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
                    class="space-y-2 rounded-xl border border-border bg-secondary p-3"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">{{ asset.name }} ×{{ asset.quantity }}</span>
                      <span class="text-xs text-success">
                        单价 {{ formatMoney(getMarketPrice(asset)) }}
                      </span>
                    </div>
                    <!-- 数量选择器（仅股票类） -->
                    <div
                      v-if="asset.type === 'stock' && asset.quantity > 1"
                      class="flex items-center justify-between"
                    >
                      <span class="text-xs text-muted-foreground">卖出数量：</span>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          :disabled="getSellQuantity(asset.id) <= 1"
                          class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-sm font-bold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          @click="changeSellQty(asset.id, -1)"
                        >
                          −
                        </button>
                        <span class="w-8 text-center text-sm font-semibold">
                          {{ getSellQuantity(asset.id) }}
                        </span>
                        <button
                          type="button"
                          :disabled="getSellQuantity(asset.id) >= asset.quantity"
                          class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-sm font-bold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          @click="changeSellQty(asset.id, 1)"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">
                        可得：<span class="font-semibold text-success">{{ formatMoney(getMarketPrice(asset) * getSellQuantity(asset.id)) }}</span>
                      </span>
                      <button
                        type="button"
                        class="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        @click="onSellAsset(asset)"
                      >
                        卖出
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="text-xs text-muted-foreground">
                  无可卖出的相关资产。
                </div>
                <button
                  type="button"
                  class="mt-3 w-full rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
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

              <!-- Doodad / Layoff / Generic -->
              <div
                v-if="
                  gameStore.pendingAction.type === 'doodad' ||
                  gameStore.pendingAction.type === 'layoff' ||
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
                  @click="gameStore.pendingAction.type === 'doodad' ? gameStore.dismissDoodad() : onAcknowledge()"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Bottom action bar -->
    <footer
      class="shrink-0 flex items-center justify-center gap-2 border-t border-border bg-secondary/50 px-4 py-3 backdrop-blur-sm sm:gap-3 sm:px-6 sm:py-4"
    >
      <button
        type="button"
        :disabled="gameStore.turnStatus !== 'idle'"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:px-6"
        @click="onRollDice"
      >
        <Dices v-if="gameStore.currentPlayer?.doubleDiceNextTurn" class="h-5 w-5" />
        <Dice5 v-else class="h-5 w-5" />
        {{ gameStore.currentPlayer?.doubleDiceNextTurn ? '掷双骰' : '掷骰子' }}
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-muted sm:h-12 sm:px-6"
        @click="showBankModal = true"
      >
        <Landmark class="h-5 w-5" />
        银行
      </button>
      <button
        v-if="canBuyInsurance"
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-success px-4 text-sm font-semibold text-success-foreground shadow-sm hover:opacity-90 sm:h-12 sm:px-6"
        @click="gameStore.buyInsurance()"
      >
        <Shield class="h-5 w-5" />
        买保险
      </button>
      <button
        type="button"
        :disabled="gameStore.turnStatus === 'idle'"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-transparent px-4 text-sm font-semibold text-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:h-12"
        @click="onEndTurn"
      >
        <RotateCcw class="h-5 w-5" />
        结束回合
      </button>
    </footer>

    <!-- Bank modal -->
    <BankModal :show="showBankModal" @close="showBankModal = false" />

    <!-- Dice roller animation -->
    <DiceRoller
      :show="showDiceAnimation"
      :values="gameStore.lastDiceValues"
      @done="onDiceAnimationDone"
    />
  </main>
</template>
