<script setup lang="ts">
/**
 * PendingActionPanel — 共享事件处理面板（v2.4.3 Phase 6）
 *
 * 统一渲染全部 13 种 pendingAction 类型的「卡片信息 + 决策操作」：
 * Opportunity / Market / Doodad / Baby(并入Doodad) / Charity / Layoff /
 * Story / fast_track_opportunity / fast_track_dream / fast_track_stock_trading /
 * stock_sell_opportunity / need_loan / bankrupt。
 *
 * 只依赖 GameplayViewModel + GameplayCommands，不 import 任何 store。
 */
import { computed, ref, watch } from 'vue'
import type {
  Asset,
  MarketEventCard,
  OpportunityCard,
  StoryCard,
} from '@/types/game'
import { evaluateOpportunity } from '@/engine/opportunityEvaluator'
import { TRADABLE_STOCKS } from '@/data/cards'
import QuantitySelector from '@/components/QuantitySelector.vue'
import {
  formatMoney,
  marketPriceFor,
  marketResponderOf,
  maxBankLoan,
  projectPendingAction,
  stockSellAssetOf,
  unitLabel,
} from '@/gameplay/presentation'
import type {
  CommandResult,
  GameplayCommands,
  GameplayViewModel,
} from '@/gameplay/types'

const props = defineProps<{
  vm: GameplayViewModel
  commands: GameplayCommands
  disabled?: boolean
}>()

const pa = computed(() => props.vm.pendingAction)
const presentation = computed(() => projectPendingAction(props.vm))
const card = computed(() => pa.value?.card ?? null)
const player = computed(() => props.vm.viewingPlayer)
const gameState = computed(() => props.vm.gameState)

const localError = ref('')
async function run(cmd: Promise<CommandResult>) {
  const r = await cmd
  if (!r.ok) localError.value = r.message
}

const disabled = computed(() => props.disabled ?? false)

// ==================== 老鼠圈机会卡 ====================

const oppCard = computed<OpportunityCard | null>(() =>
  pa.value?.type === 'opportunity' ? (card.value as OpportunityCard | null) : null,
)

const isStockTradeCard = computed(() => {
  const c = oppCard.value
  return Boolean(c && c.size === 'small' && c.type === 'stock' && c.splitRatio === undefined)
})

const isOppSell = computed(() => {
  const c = oppCard.value
  return Boolean(c && c.type === 'stock' && c.action === 'sell')
})

const maxOppQty = computed(() => {
  const c = oppCard.value
  if (!c || !player.value) return 1
  if (c.action === 'sell' && c.type === 'stock' && c.symbol) {
    return stockHoldingOf(c.symbol)?.quantity ?? 0
  }
  const unitCost = c.downPayment ?? c.cost
  if (unitCost <= 0) return 1
  // 房产和企业一次机会只能买一份，界面约束必须与引擎一致。
  if (c.type === 'real_estate' || c.type === 'business') return 1
  if (c.maxQuantity) {
    return Math.max(1, Math.min(c.maxQuantity, Math.floor(player.value.cash / unitCost)))
  }
  return Math.max(1, Math.floor(player.value.cash / unitCost))
})

const oppUnitLabel = computed(() => unitLabel(oppCard.value?.type ?? 'other'))

const oppQty = ref(1)
const buyQty = ref(1)
const sellQty = ref(1)
const tradeMode = ref<'buy' | 'sell'>('buy')

const oppBuyPreview = computed(() => {
  const c = oppCard.value
  if (!c || c.type === 'stock' || c.action === 'sell' || !player.value) return null
  const qty = oppQty.value
  const unitCost = c.downPayment ?? c.cost
  const cost = unitCost * qty
  return {
    cost,
    cashAfter: player.value.cash - cost,
    cashFlowAfter: player.value.cashFlow + (c.cashFlow ?? 0) * qty,
    affordable: player.value.cash >= cost,
    shortfall: Math.max(0, cost - player.value.cash),
  }
})

const participation = computed(() => {
  const c = oppCard.value
  if (!c || !player.value) return null
  return evaluateOpportunity(player.value, c, maxBankLoan(player.value))
})

const participationHintText = computed(() => {
  const ev = participation.value
  if (!ev || ev.participation === 'full') return ''
  if (ev.participation === 'finance') {
    return `自有资金还差 $${Math.round(ev.gap).toLocaleString()}，可通过银行贷款融资买下这个机会（注意月供）。`
  }
  return `机会仍然存在，只是当前还差 $${Math.round(ev.gap).toLocaleString()} 才能完整参与。提升被动收入或储蓄后再来，不必强求现在买下。`
})

function stockHoldingOf(symbol: string): Asset | undefined {
  return player.value.assets.find((a) => a.type === 'stock' && a.symbol === symbol)
}

const currentStockHolding = computed(() => {
  const c = oppCard.value
  if (!c || c.type !== 'stock' || !c.symbol) return null
  return stockHoldingOf(c.symbol) ?? null
})

const sellAvgCost = computed(() => currentStockHolding.value?.cost ?? 0)
const sellPerShareGain = computed(() => (oppCard.value?.cost ?? 0) - sellAvgCost.value)
const sellRealizedGain = computed(() => sellPerShareGain.value * sellQty.value)
const sellRemainingCost = computed(() => sellAvgCost.value * (maxSellQuantity.value - sellQty.value))

const maxBuyQuantity = computed(() => {
  const c = oppCard.value
  if (!c || !player.value || c.cost <= 0) return 0
  const maxByCash = Math.floor(player.value.cash / c.cost)
  if (c.maxQuantity) return Math.max(0, Math.min(c.maxQuantity, maxByCash))
  return Math.max(0, maxByCash)
})

const maxSellQuantity = computed(() => currentStockHolding.value?.quantity ?? 0)
const hasStockHolding = computed(() => maxSellQuantity.value > 0)

function onTradeBuy() {
  if (!oppCard.value) return
  run(props.commands.resolvePendingAction({ kind: 'trade', symbol: oppCard.value.symbol ?? '', quantity: buyQty.value, isBuy: true }))
  buyQty.value = 1
  sellQty.value = 1
}

function onTradeSell() {
  if (!oppCard.value) return
  run(props.commands.resolvePendingAction({ kind: 'trade', symbol: oppCard.value.symbol ?? '', quantity: sellQty.value, isBuy: false }))
  sellQty.value = 1
  buyQty.value = 1
}

function onBuyOpportunity() {
  run(props.commands.buyOpportunity({ quantity: oppQty.value }))
  oppQty.value = 1
}

function onDeclineOpportunity() {
  run(props.commands.resolvePendingAction({ kind: 'decline_opportunity' }))
  oppQty.value = 1
  buyQty.value = 1
  sellQty.value = 1
  tradeMode.value = 'buy'
}

// ==================== 快车道机会卡 ====================

const ftOppCard = computed<OpportunityCard | null>(() =>
  pa.value?.type === 'fast_track_opportunity' ? (card.value as OpportunityCard | null) : null,
)
const ftQty = ref(1)
const ftBuyError = ref('')

function onBuyFtOpportunity() {
  run(props.commands.resolvePendingAction({ kind: 'fast_track_opportunity', accepted: true, quantity: ftQty.value }))
    .then(() => { ftQty.value = 1 })
}

function onDeclineFtOpportunity() {
  run(props.commands.resolvePendingAction({ kind: 'fast_track_opportunity', accepted: false }))
  ftQty.value = 1
}

// ==================== 快车道梦想 ====================

const ftDreamPending = computed(() => pa.value?.type === 'fast_track_dream')
const dream = computed(() => player.value.dream ?? null)

function onBuyDream() {
  run(props.commands.resolvePendingAction({ kind: 'fast_track_dream', accepted: true }))
}

function onSkipDream() {
  run(props.commands.resolvePendingAction({ kind: 'fast_track_dream', accepted: false }))
}

// ==================== 快车道股票交易 ====================

const ftTradingPending = computed(() => pa.value?.type === 'fast_track_stock_trading')
const ftTradeMode = ref<'buy' | 'sell'>('buy')
const ftTradeSymbol = ref('')
const ftTradeQty = ref(1)

watch(ftTradingPending, (val) => {
  if (val && TRADABLE_STOCKS.length > 0 && !ftTradeSymbol.value) {
    ftTradeSymbol.value = TRADABLE_STOCKS[0]!.symbol
  }
  if (!val) {
    ftTradeQty.value = 1
  }
})

const stockPrices = computed(() => gameState.value.stockPrices ?? {})
function priceOf(symbol: string): number {
  return stockPrices.value[symbol] ?? 0
}
function holdingOf(symbol: string): Asset | undefined {
  return player.value.assets.find((a) => a.type === 'stock' && a.symbol === symbol)
}
function maxBuyOf(symbol: string): number {
  const price = priceOf(symbol)
  if (price <= 0) return 0
  return Math.floor(player.value.cash / price)
}
function maxSellOf(symbol: string): number {
  return holdingOf(symbol)?.quantity ?? 0
}

function onFtTrade() {
  const sym = ftTradeSymbol.value
  if (!sym) return
  run(props.commands.resolvePendingAction({
    kind: 'fast_track_trade',
    symbol: sym,
    quantity: ftTradeQty.value,
    isBuy: ftTradeMode.value === 'buy',
  }))
  ftTradeQty.value = 1
}

function onCloseFtTrading() {
  run(props.commands.resolvePendingAction({ kind: 'acknowledge' }))
  ftTradeQty.value = 1
}

// ==================== 市场风云 ====================

const marketCard = computed<MarketEventCard | null>(() => {
  if (pa.value?.type === 'market') {
    return gameState.value.marketEvent ?? (card.value as MarketEventCard | null)
  }
  return null
})
const marketState = computed(() => gameState.value.marketEventState ?? null)
const responder = computed(() => marketResponderOf(props.vm))

const sellableAssets = computed(() => {
  const p = responder.value
  const c = marketCard.value
  if (!p || !c) return []
  return p.assets.filter((a) => {
    if (c.targetType === 'stock' && c.targetSymbol) return a.type === 'stock' && a.symbol === c.targetSymbol
    if (c.targetType === 'all') return true
    return a.type === c.targetType
  })
})

const sellQuantities = ref<Record<string, number>>({})
function getSellQuantity(assetId: string, defaultQty = 1): number {
  return sellQuantities.value[assetId] ?? defaultQty
}
function setSellQuantity(assetId: string, val: number) {
  sellQuantities.value[assetId] = val
}

function onSellMarketAsset(asset: Asset) {
  const qty = getSellQuantity(asset.id, asset.quantity)
  run(props.commands.resolvePendingAction({ kind: 'market', sells: [{ assetId: asset.id, quantity: qty }] }))
  delete sellQuantities.value[asset.id]
}

function onDismissMarket() {
  run(props.commands.resolvePendingAction({ kind: 'market', sells: [] }))
}

const marketDismissLabel = computed(() => {
  const st = marketState.value
  if (st && st.respondedIds.length < gameState.value.players.length - 1) return '下一位玩家'
  return '结束'
})

// ==================== 股票卖出机会 ====================

const ssoCard = computed<OpportunityCard | null>(() =>
  pa.value?.type === 'stock_sell_opportunity' ? (card.value as OpportunityCard | null) : null,
)
const ssoAsset = computed(() => stockSellAssetOf(props.vm, ssoCard.value?.symbol))
const ssoQty = ref(1)
const ssoPrice = computed(() => ssoCard.value?.cost ?? 0)

function onSellStockFromOpportunity() {
  if (!ssoCard.value || !ssoAsset.value) return
  run(props.commands.resolvePendingAction({
    kind: 'stock_sell',
    assetId: ssoAsset.value.id,
    quantity: ssoQty.value,
    price: ssoPrice.value,
  }))
  ssoQty.value = 1
}

function onDismissStockSell() {
  run(props.commands.resolvePendingAction({ kind: 'stock_sell', assetId: '', quantity: 1, price: 0, skip: true }))
  ssoQty.value = 1
}

// ==================== 其他事件 ====================

function onCharity(accepted: boolean) {
  run(props.commands.resolvePendingAction({ kind: 'charity', accepted }))
}

function onLoanDecision(accept: boolean) {
  run(props.commands.resolvePendingAction({ kind: 'loan_decision', accept }))
}

function onDismissGeneric() {
  const t = pa.value?.type
  if (t === 'doodad') run(props.commands.resolvePendingAction({ kind: 'doodad' }))
  else if (t === 'story') run(props.commands.resolvePendingAction({ kind: 'story' }))
  else if (t === 'bankrupt') run(props.commands.resolvePendingAction({ kind: 'bankrupt' }))
  else run(props.commands.resolvePendingAction({ kind: 'acknowledge' }))
}

const genericDismissLabel = computed(() => (pa.value?.type === 'bankrupt' ? '继续游戏' : '知道了'))

// 事件是否需要在面板显示卡片信息头
const showCardHeader = computed(() => {
  const t = pa.value?.type
  return t === 'opportunity' || t === 'fast_track_opportunity' || t === 'market' || t === 'stock_sell_opportunity'
})

const typeBadge = computed(() => {
  const map: Record<string, string> = {
    opportunity: '机会',
    market: '市场风云',
    doodad: '生活意外',
    charity: '慈善捐赠',
    layoff: '失业',
    story: '故事',
    need_loan: '贷款需求',
    fast_track_opportunity: '资本机会',
    fast_track_dream: '梦想',
    fast_track_stock_trading: '股票交易',
    stock_sell_opportunity: '卖出机会',
    bankrupt: '破产重整',
  }
  return pa.value?.type ? (map[pa.value.type] ?? pa.value.type) : ''
})
</script>

<template>
  <div class="pending-action-panel w-full" data-testid="pending-action-panel">
    <!-- 统一卡片信息头 -->
    <template v-if="showCardHeader && presentation">
      <div class="mb-2 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-base font-semibold text-foreground">{{ presentation.name }}</div>
          <div v-if="presentation.description" class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {{ presentation.description }}
          </div>
        </div>
        <span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
          {{ typeBadge }}
        </span>
      </div>
    </template>

    <p v-else-if="pa?.message" class="text-sm font-medium text-foreground">{{ pa.message }}</p>

    <p v-if="localError" class="mt-2 text-xs font-medium text-destructive">{{ localError }}</p>

    <!-- ========== 老鼠圈机会卡 ========== -->
    <template v-if="oppCard">
      <!-- 拆分/合股卡：自动生效，仅确认 -->
      <div v-if="oppCard.splitRatio !== undefined">
        <div class="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <template v-if="oppCard.splitRatio > 1">拆分比例：1 拆 {{ oppCard.splitRatio }}</template>
          <template v-else>合股比例：{{ Math.round(1 / oppCard.splitRatio) }} 合 1</template>
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
          你当前不持有 {{ oppCard.symbol }} 股票。
        </div>
        <button
          type="button"
          :disabled="disabled"
          data-testid="opportunity-confirm"
          class="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          @click="onBuyOpportunity"
        >
          确认
        </button>
      </div>

      <!-- 股票交易卡：Tab 切换买卖 -->
      <div v-else-if="isStockTradeCard" class="stock-trade-panel">
        <div class="mb-3 rounded-xl border border-border bg-secondary/30 p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{{ oppCard.symbol }}</span>
            <span class="text-sm font-semibold text-foreground">市价 {{ formatMoney(oppCard.cost) }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-xs">
            <span class="text-muted-foreground">当前持仓：</span>
            <span class="font-medium text-foreground">{{ hasStockHolding ? `${currentStockHolding?.quantity} 股` : '未持有' }}</span>
          </div>
          <div v-if="hasStockHolding" class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">成本价：</span>
            <span class="font-medium text-foreground">{{ formatMoney(currentStockHolding?.cost ?? 0) }}</span>
          </div>
          <div v-if="hasStockHolding" class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">浮动盈亏：</span>
            <span
              class="font-semibold"
              :class="(oppCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0) >= 0 ? 'text-success' : 'text-destructive'"
            >
              {{ (oppCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0) >= 0 ? '+' : '' }}
              {{ formatMoney((oppCard.cost - (currentStockHolding?.cost ?? 0)) * (currentStockHolding?.quantity ?? 0)) }}
            </span>
          </div>
          <div class="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            股票不产生固定月现金流，买入后结果取决于后续价格变化。
          </div>
        </div>

        <div class="mb-3 flex rounded-xl bg-secondary/50 p-1">
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
            :class="tradeMode === 'buy' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="tradeMode = 'buy'"
          >
            买入
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
            :class="tradeMode === 'sell'
              ? 'bg-success text-success-foreground shadow-sm'
              : hasStockHolding ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40 cursor-not-allowed'"
            :disabled="!hasStockHolding"
            @click="hasStockHolding && (tradeMode = 'sell')"
          >
            卖出
          </button>
        </div>

        <div v-if="tradeMode === 'buy'" class="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-semibold text-primary">买入</span>
            <span class="text-xs text-muted-foreground">买入价 {{ formatMoney(oppCard.cost) }}/股</span>
          </div>
          <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>本次买入增加月现金流</span>
            <span class="font-semibold text-success">+{{ formatMoney(oppCard.cashFlow * buyQty) }}/月</span>
          </div>
          <QuantitySelector
            v-if="maxBuyQuantity > 0"
            v-model="buyQty"
            :max-quantity="maxBuyQuantity"
            :unit-price="oppCard.cost"
            mode="buy"
            :available-cash="player.cash"
            asset-type="stock"
            unit-label="股"
            class="mb-2"
          />
          <div v-else class="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div>现金不足，无法买入</div>
            <div class="mt-0.5 font-semibold">还差 {{ formatMoney(oppCard.cost * 1 - (player.cash ?? 0)) }}</div>
          </div>
          <button
            type="button"
            :disabled="maxBuyQuantity === 0 || buyQty <= 0 || disabled"
            data-testid="opportunity-stock-buy"
            class="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="onTradeBuy"
          >
            确认买入 {{ buyQty }} 股 · {{ formatMoney(oppCard.cost * buyQty) }}
          </button>
        </div>

        <div v-else class="rounded-xl border border-success/30 bg-success/5 p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-semibold text-success">卖出</span>
            <span class="text-xs text-muted-foreground">卖出价 {{ formatMoney(oppCard.cost) }}/股</span>
          </div>
          <QuantitySelector
            v-model="sellQty"
            :max-quantity="maxSellQuantity"
            :unit-price="oppCard.cost"
            mode="sell"
            asset-type="stock"
            unit-label="股"
            class="mb-2"
          />
          <div class="mb-3 space-y-1 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">买入均价</span>
              <span class="font-medium tabular-nums">{{ formatMoney(sellAvgCost) }}/股</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">卖出价</span>
              <span class="font-medium tabular-nums">{{ formatMoney(oppCard.cost ?? 0) }}/股</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">本次收益</span>
              <span class="font-semibold tabular-nums" :class="sellRealizedGain >= 0 ? 'text-success' : 'text-destructive'">
                {{ sellRealizedGain >= 0 ? '+' : '' }}{{ formatMoney(sellRealizedGain) }}
              </span>
            </div>
            <div class="flex justify-between pt-1 border-t border-border/50">
              <span class="text-muted-foreground">剩余成本</span>
              <span class="font-medium tabular-nums">{{ formatMoney(sellRemainingCost) }}</span>
            </div>
          </div>
          <button
            type="button"
            :disabled="maxSellQuantity === 0 || sellQty <= 0 || disabled"
            data-testid="opportunity-stock-sell"
            class="w-full rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="onTradeSell"
          >
            确认卖出 {{ sellQty }} 股 · {{ formatMoney(oppCard.cost * sellQty) }}
          </button>
        </div>

        <button
          type="button"
          :disabled="disabled"
          data-testid="opportunity-decline"
          class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          @click="onDeclineOpportunity"
        >
          放弃
        </button>
      </div>

      <!-- 非交易卡 -->
      <template v-else>
        <div v-if="isOppSell && maxOppQty === 0" class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          你当前没有 {{ oppCard.symbol }} 股票，无法卖出。
        </div>

        <QuantitySelector
          v-if="oppCard.type === 'stock' && maxOppQty > 0 && oppCard.splitRatio === undefined && !isStockTradeCard"
          v-model="oppQty"
          :max-quantity="maxOppQty"
          :unit-price="oppCard.cost"
          :mode="isOppSell ? 'sell' : 'buy'"
          :available-cash="player.cash"
          asset-type="stock"
          unit-label="股"
          class="mb-3"
        />
        <div v-else-if="oppCard.type !== 'stock'" class="mb-3 flex items-center gap-3">
          <label class="text-sm font-medium text-foreground">购买数量：</label>
          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="oppQty <= 1"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              @click="oppQty = Math.max(1, oppQty - 1)"
            >
              <span class="text-lg font-bold">−</span>
            </button>
            <input
              v-model.number="oppQty"
              type="number"
              min="1"
              :max="maxOppQty"
              class="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              :disabled="oppQty >= maxOppQty"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              @click="oppQty = Math.min(maxOppQty, oppQty + 1)"
            >
              <span class="text-lg font-bold">+</span>
            </button>
          </div>
          <span class="text-xs text-muted-foreground">最多 {{ maxOppQty }} {{ oppUnitLabel }}</span>
        </div>

        <div v-if="oppCard.type !== 'stock'" class="mb-3 space-y-2 rounded-lg bg-muted px-3 py-2">
          <template v-if="oppCard.downPayment !== undefined && oppCard.totalValue !== undefined">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">总价：</span>
              <span class="text-sm font-medium text-foreground">{{ formatMoney(oppCard.totalValue * oppQty) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">首付：</span>
              <span class="text-base font-bold text-primary">{{ formatMoney(oppCard.downPayment * oppQty) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">贷款：</span>
              <span class="text-sm font-medium text-amber-500">{{ formatMoney((oppCard.totalValue - oppCard.downPayment) * oppQty) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">月现金流：</span>
              <span class="text-sm font-bold text-success">+{{ formatMoney(oppCard.cashFlow * oppQty) }}</span>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">总价：</span>
              <span class="text-base font-bold text-foreground">{{ formatMoney(oppCard.cost * oppQty) }}</span>
            </div>
          </template>
        </div>

        <div
          v-if="!isOppSell && oppCard.type !== 'stock' && oppBuyPreview"
          class="mb-3 space-y-2 rounded-xl border p-3"
          :class="oppBuyPreview.affordable ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/10'"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">当前现金：</span>
            <span class="font-medium text-foreground">{{ formatMoney(player.cash ?? 0) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">购买后现金：</span>
            <span class="font-medium" :class="oppBuyPreview.cashAfter < 0 ? 'text-destructive' : 'text-foreground'">{{ formatMoney(oppBuyPreview.cashAfter) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">购买后月现金流：</span>
            <span class="font-bold text-success">+{{ formatMoney(oppBuyPreview.cashFlowAfter) }}/月</span>
          </div>
          <div
            v-if="!oppBuyPreview.affordable"
            class="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-sm font-semibold text-destructive"
          >
            <span>现金不足，无法买入</span>
            <span>还差 {{ formatMoney(oppBuyPreview.shortfall) }}</span>
          </div>
          <div v-else class="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-sm font-semibold text-success">
            ✓ 现金充足，可支付首付
          </div>
        </div>

        <div
          v-if="participationHintText"
          class="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-600"
        >
          {{ participationHintText }}
        </div>

        <div class="flex gap-2">
          <button
            v-if="!isOppSell"
            data-testid="opportunity-buy"
            type="button"
            :disabled="(player ? player.cash < (oppCard.downPayment ?? oppCard.cost) * oppQty : true) || disabled"
            class="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            @click="onBuyOpportunity"
          >
            {{ oppCard.downPayment !== undefined ? '支付首付' : '买入' }}
          </button>
          <button
            v-else
            data-testid="opportunity-sell"
            type="button"
            :disabled="maxOppQty === 0 || oppQty <= 0 || disabled"
            class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
            @click="onBuyOpportunity"
          >
            卖出
          </button>
          <button
            data-testid="opportunity-decline"
            type="button"
            :disabled="disabled"
            class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
            @click="onDeclineOpportunity"
          >
            放弃
          </button>
        </div>
      </template>
    </template>

    <!-- ========== 快车道机会卡 ========== -->
    <template v-else-if="ftOppCard">
      <div v-if="ftOppCard.type === 'stock' && ftOppCard.maxQuantity" class="mb-3 flex items-center gap-3">
        <label class="text-sm font-medium text-foreground">购买数量：</label>
        <div class="flex items-center gap-1">
          <button
            type="button"
            :disabled="ftQty <= 1"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            @click="ftQty = Math.max(1, ftQty - 1)"
          >
            <span class="text-lg font-bold">−</span>
          </button>
          <input
            v-model.number="ftQty"
            type="number"
            min="1"
            :max="ftOppCard.maxQuantity"
            class="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            :disabled="ftQty >= (ftOppCard.maxQuantity ?? 1)"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            @click="ftQty = Math.min(ftOppCard.maxQuantity ?? 1, ftQty + 1)"
          >
            <span class="text-lg font-bold">+</span>
          </button>
        </div>
        <span class="text-xs text-muted-foreground">最多 {{ ftOppCard.maxQuantity }} 股</span>
      </div>

      <div class="mb-3 space-y-2 rounded-lg bg-muted px-3 py-2">
        <template v-if="ftOppCard.downPayment !== undefined && ftOppCard.totalValue !== undefined">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">总价：</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(ftOppCard.totalValue * ftQty) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">首付：</span>
            <span class="text-base font-bold text-primary">{{ formatMoney(ftOppCard.downPayment * ftQty) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">贷款：</span>
            <span class="text-sm font-medium text-amber-500">{{ formatMoney((ftOppCard.totalValue - ftOppCard.downPayment) * ftQty) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">月现金流：</span>
            <span class="text-sm font-bold text-success">+{{ formatMoney(ftOppCard.cashFlow * ftQty) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">总价：</span>
            <span class="text-base font-bold text-foreground">{{ formatMoney(ftOppCard.cost * ftQty) }}</span>
          </div>
        </template>
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          :disabled="(player ? player.cash < (ftOppCard.downPayment ?? ftOppCard.cost) * ftQty : true) || disabled"
          class="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          @click="onBuyFtOpportunity"
        >
          {{ ftOppCard.downPayment !== undefined ? '支付首付' : '买入' }}
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
          @click="onDeclineFtOpportunity"
        >
          放弃
        </button>
      </div>
      <p v-if="ftBuyError" class="mt-2 text-xs font-medium text-destructive">{{ ftBuyError }}</p>
    </template>

    <!-- ========== 快车道梦想 ========== -->
    <div v-else-if="ftDreamPending" class="dream-action-panel">
      <div class="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-amber-400">{{ dream?.name }}</span>
        </div>
        <div class="mt-1 text-sm text-amber-300/80">
          价格：<span class="font-bold">{{ formatMoney(dream?.price ?? 0) }}</span>
        </div>
        <div class="mt-1 text-xs text-muted-foreground">
          当前现金：
          <span :class="(player.cash ?? 0) >= (dream?.price ?? 0) ? 'text-success' : 'text-destructive'">
            {{ formatMoney(player.cash ?? 0) }}
          </span>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="(player ? player.cash < (dream?.price ?? Infinity) : true) || disabled"
          class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
          @click="onBuyDream"
        >
          购买梦想
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
          @click="onSkipDream"
        >
          暂不购买
        </button>
      </div>
    </div>

    <!-- ========== 快车道股票交易 ========== -->
    <div v-else-if="ftTradingPending" class="stock-trading-panel mt-3">
      <div class="mb-3 flex rounded-full bg-secondary p-1">
        <button
          type="button"
          class="flex-1 rounded-full py-1.5 text-sm font-medium transition"
          :class="ftTradeMode === 'buy' ? 'bg-background text-success shadow-sm' : 'text-muted-foreground'"
          @click="ftTradeMode = 'buy'"
        >
          买入
        </button>
        <button
          type="button"
          class="flex-1 rounded-full py-1.5 text-sm font-medium transition"
          :class="ftTradeMode === 'sell' ? 'bg-background text-destructive shadow-sm' : 'text-muted-foreground'"
          @click="ftTradeMode = 'sell'"
        >
          卖出
        </button>
      </div>

      <div class="mb-3 space-y-2">
        <button
          v-for="stock in TRADABLE_STOCKS"
          :key="stock.symbol"
          type="button"
          class="w-full rounded-xl border p-3 text-left transition"
          :class="ftTradeSymbol === stock.symbol ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/50'"
          @click="ftTradeSymbol = stock.symbol; ftTradeQty = 1"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold text-foreground">{{ stock.symbol }}</div>
              <div class="text-xs text-muted-foreground">{{ stock.name }} · {{ stock.sector }}</div>
            </div>
            <div class="text-right">
              <div class="text-base font-bold text-primary">${{ priceOf(stock.symbol) }}</div>
              <div v-if="holdingOf(stock.symbol)" class="text-xs text-muted-foreground">持有 {{ holdingOf(stock.symbol)?.quantity }} 股</div>
              <div v-else class="text-xs text-muted-foreground">未持有</div>
            </div>
          </div>
        </button>
      </div>

      <div v-if="ftTradeSymbol" class="mb-3 flex items-center gap-3">
        <label class="text-sm font-medium text-foreground">数量：</label>
        <div class="flex items-center gap-1">
          <button
            type="button"
            :disabled="ftTradeQty <= 1"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:opacity-40"
            @click="ftTradeQty = Math.max(1, ftTradeQty - 1)"
          >
            <span class="text-lg font-bold">−</span>
          </button>
          <input
            v-model.number="ftTradeQty"
            type="number"
            min="1"
            class="h-9 w-20 rounded-md border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            :disabled="ftTradeMode === 'buy' ? ftTradeQty >= maxBuyOf(ftTradeSymbol) : ftTradeQty >= maxSellOf(ftTradeSymbol)"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-muted disabled:opacity-40"
            @click="ftTradeQty = Math.min(ftTradeMode === 'buy' ? maxBuyOf(ftTradeSymbol) : maxSellOf(ftTradeSymbol), ftTradeQty + 10)"
          >
            <span class="text-sm font-bold">+10</span>
          </button>
        </div>
        <span class="text-xs text-muted-foreground">
          最多 {{ ftTradeMode === 'buy' ? maxBuyOf(ftTradeSymbol) : maxSellOf(ftTradeSymbol) }} 股
        </span>
      </div>

      <div v-if="ftTradeSymbol" class="mb-3 rounded-lg bg-muted px-3 py-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">{{ ftTradeMode === 'buy' ? '总支出' : '总收入' }}：</span>
          <span class="text-base font-bold" :class="ftTradeMode === 'buy' ? 'text-destructive' : 'text-success'">
            {{ formatMoney(priceOf(ftTradeSymbol) * ftTradeQty) }}
          </span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <span class="text-xs text-muted-foreground">当前现金：</span>
          <span class="text-xs font-medium text-foreground">{{ formatMoney(player.cash ?? 0) }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          v-if="ftTradeMode === 'buy'"
          type="button"
          :disabled="!ftTradeSymbol || ftTradeQty <= 0 || ftTradeQty > maxBuyOf(ftTradeSymbol) || disabled"
          class="flex-1 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-40"
          @click="onFtTrade"
        >
          确认买入
        </button>
        <button
          v-else
          type="button"
          :disabled="!ftTradeSymbol || ftTradeQty <= 0 || ftTradeQty > maxSellOf(ftTradeSymbol) || disabled"
          class="flex-1 rounded-full bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-40"
          @click="onFtTrade"
        >
          确认卖出
        </button>
        <button
          v-if="vm.network.mode === 'single'"
          type="button"
          :disabled="disabled"
          class="rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
          @click="onCloseFtTrading"
        >
          完成
        </button>
      </div>
    </div>

    <!-- ========== 市场风云 ========== -->
    <div v-else-if="marketCard" class="market-action-panel mt-3">
      <div
        v-if="marketState"
        class="mb-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs"
      >
        <div class="flex items-center gap-2">
          <span class="inline-block h-3 w-3 rounded-full" :style="{ backgroundColor: responder?.color }" />
          <span class="font-medium text-primary">{{ responder?.name }} 操作中</span>
        </div>
        <span class="text-muted-foreground">{{ marketState.respondedIds.length }}/{{ gameState.players.length }} 玩家</span>
      </div>

      <div v-if="sellableAssets.length" class="space-y-3">
        <p class="text-xs text-muted-foreground">可以选择卖出以下资产：</p>
        <div
          v-for="asset in sellableAssets"
          :key="asset.id"
          class="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm"
        >
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
                  <span class="font-medium text-foreground">{{ asset.quantity }} {{ unitLabel(asset.type) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">卖出单价</span>
                  <span class="font-medium text-success">{{ formatMoney(marketPriceFor(asset, marketCard)) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">成本价</span>
                  <span class="font-medium text-foreground">{{ formatMoney(asset.cost) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">预计总收入</span>
                  <span class="font-bold text-success">{{ formatMoney(marketPriceFor(asset, marketCard) * getSellQuantity(asset.id, asset.quantity)) }}</span>
                </div>
              </div>
            </div>
          </div>

          <QuantitySelector
            v-if="asset.quantity > 1"
            :model-value="getSellQuantity(asset.id, asset.quantity)"
            @update:model-value="(v: number) => setSellQuantity(asset.id, v)"
            :max-quantity="asset.quantity"
            :unit-price="marketPriceFor(asset, marketCard)"
            mode="sell"
            :asset-type="asset.type as 'stock' | 'real_estate' | 'business' | 'other'"
            :unit-label="unitLabel(asset.type)"
            :show-quick-buttons="asset.quantity > 2"
          />

          <button
            :data-testid="`market-sell-${asset.id}`"
            type="button"
            :disabled="disabled"
            class="w-full rounded-full bg-success py-2.5 text-sm font-semibold text-success-foreground shadow-sm shadow-success/20 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            @click="onSellMarketAsset(asset)"
          >
            卖出 {{ getSellQuantity(asset.id, asset.quantity) }} {{ unitLabel(asset.type) }} · 可得 {{ formatMoney(marketPriceFor(asset, marketCard) * getSellQuantity(asset.id, asset.quantity)) }}
          </button>
        </div>
      </div>
      <div v-else class="text-xs text-muted-foreground">无可卖出的相关资产。</div>

      <button
        data-testid="market-dismiss"
        type="button"
        :disabled="disabled"
        class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
        @click="onDismissMarket"
      >
        {{ marketDismissLabel }}
      </button>
    </div>

    <!-- ========== 股票卖出机会 ========== -->
    <div v-else-if="ssoCard" class="card-action-panel">
      <div v-if="ssoAsset" class="space-y-3">
        <p class="text-xs text-muted-foreground">你可以选择卖出持有的 {{ ssoAsset.symbol }} 股票：</p>
        <div class="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">{{ ssoAsset.name }}</span>
                <span class="inline-flex items-center rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-teal-400">
                  {{ ssoAsset.symbol }}
                </span>
              </div>
              <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">持有数量</span>
                  <span class="font-medium text-foreground">{{ ssoAsset.quantity }} 股</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">卖出单价</span>
                  <span class="font-medium text-success">{{ formatMoney(ssoPrice) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">成本价</span>
                  <span class="font-medium text-foreground">{{ formatMoney(ssoAsset.cost) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">预计总收入</span>
                  <span class="font-bold text-success">{{ formatMoney(ssoPrice * ssoQty) }}</span>
                </div>
              </div>
            </div>
          </div>

          <QuantitySelector
            v-if="ssoAsset.quantity > 1"
            v-model="ssoQty"
            :max-quantity="ssoAsset.quantity"
            :unit-price="ssoPrice"
            mode="sell"
            asset-type="stock"
            unit-label="股"
            :show-quick-buttons="ssoAsset.quantity > 2"
          />

          <button
            type="button"
            :disabled="disabled"
            class="w-full rounded-full bg-teal-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            @click="onSellStockFromOpportunity"
          >
            卖出 {{ ssoQty }} 股 · 可得 {{ formatMoney(ssoPrice * ssoQty) }}
          </button>
        </div>
      </div>
      <div v-else class="text-xs text-muted-foreground">你不持有该股票，无法卖出。</div>
      <button
        type="button"
        :disabled="disabled"
        class="mt-3 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40"
        @click="onDismissStockSell"
      >
        结束
      </button>
    </div>

    <!-- ========== 慈善 ========== -->
    <div v-else-if="pa?.type === 'charity'" class="mt-3 flex gap-2">
      <button
        data-testid="charity-accept"
        type="button"
        :disabled="disabled"
        class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
        @click="onCharity(true)"
      >
        捐赠
      </button>
      <button
        data-testid="charity-decline"
        type="button"
        :disabled="disabled"
        class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
        @click="onCharity(false)"
      >
        放弃
      </button>
    </div>

    <!-- ========== 贷款需求 ========== -->
    <div v-else-if="pa?.type === 'need_loan'" class="mt-3 flex gap-2">
      <button
        data-testid="loan-take"
        type="button"
        :disabled="disabled"
        class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
        @click="onLoanDecision(true)"
      >
        申请贷款
      </button>
      <button
        data-testid="loan-decline"
        type="button"
        :disabled="disabled"
        class="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
        @click="onLoanDecision(false)"
      >
        取消
      </button>
    </div>

    <!-- ========== Doodad / Layoff / Story / Generic ========== -->
    <div
      v-else-if="
        pa?.type === 'doodad' ||
        pa?.type === 'layoff' ||
        pa?.type === 'story' ||
        pa?.type === 'bankrupt' ||
        (pa?.message && pa.type !== 'fast_track_stock_trading')
      "
      class="mt-3 flex justify-end"
    >
      <button
        data-testid="known-dismiss"
        type="button"
        class="rounded-full bg-secondary px-5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
        :disabled="disabled"
        @click="onDismissGeneric"
      >
        {{ genericDismissLabel }}
      </button>
    </div>
  </div>
</template>
