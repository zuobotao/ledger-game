<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Dice5,
  Landmark,
  RotateCcw,
  Shield,
  TrendingUp,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { RAT_RACE_CELLS } from '@/data/board'
import type { Asset, Liability, MarketEventCard, OpportunityCard, Player } from '@/types/game'
import BankModal from '@/components/BankModal.vue'

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

const cellColorClass: Record<string, string> = {
  green: 'bg-success',
  red: 'bg-destructive',
  gold: 'bg-amber-400',
  yellow: 'bg-yellow-400',
  blue: 'bg-primary',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
}

const playersOnCell = computed(() => {
  const map: Record<number, Player[]> = {}
  for (const p of gameStore.players) {
    const list = map[p.ratRacePosition] ?? []
    list.push(p)
    map[p.ratRacePosition] = list
  }
  return map
})

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
  const p = gameStore.currentPlayer
  const card = marketCard.value
  if (!p || !card) return []
  return p.assets.filter((a) => {
    if (card.targetType === 'stock' && card.targetSymbol) {
      return a.type === 'stock' && a.symbol === card.targetSymbol
    }
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

function onRollDice() {
  gameStore.ratRaceRollDice()
}

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

function onSellAsset(asset: Asset) {
  const qty = asset.type === 'stock' ? 1 : asset.quantity
  gameStore.sellAssetToMarket(asset.id, qty)
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
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <div class="mx-auto max-w-5xl">
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 lg:gap-3">
              <div
                v-for="cell in RAT_RACE_CELLS"
                :key="cell.index"
                class="relative flex flex-col justify-between rounded-2xl border border-border bg-secondary p-2 shadow-sm transition sm:p-3"
                :class="{ 'ring-2 ring-primary': gameStore.currentPlayer?.ratRacePosition === cell.index }"
              >
                <span class="absolute right-2 top-2 text-[10px] font-mono text-muted-foreground">
                  {{ String(cell.index + 1).padStart(2, '0') }}
                </span>
                <div class="h-1.5 w-8 rounded-full" :class="cellColorClass[cell.color]" />
                <div class="mt-2 text-xs font-semibold sm:text-sm">{{ cell.name }}</div>
                <div class="mt-1 flex -space-x-1">
                  <div
                    v-for="p in playersOnCell[cell.index]"
                    :key="p.id"
                    class="h-4 w-4 rounded-full border border-background"
                    :style="{ backgroundColor: p.color }"
                    :title="p.name"
                  />
                </div>
              </div>
            </div>
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
                <div v-if="sellableAssets.length" class="space-y-2">
                  <p class="text-xs text-muted-foreground">你可以选择卖出以下资产：</p>
                  <div
                    v-for="asset in sellableAssets"
                    :key="asset.id"
                    class="flex items-center justify-between rounded-xl border border-border bg-secondary p-2"
                  >
                    <span class="text-sm">{{ asset.name }} ×{{ asset.quantity }}</span>
                    <button
                      type="button"
                      class="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      @click="onSellAsset(asset)"
                    >
                      卖出
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="mt-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted"
                  @click="gameStore.dismissMarketEvent()"
                >
                  结束
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
        <Dice5 class="h-5 w-5" />
        掷骰子
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
  </main>
</template>
