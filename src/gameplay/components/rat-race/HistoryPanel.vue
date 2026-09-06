<script setup lang="ts">
/**
 * HistoryPanel — 共享历史面板（v2.4.3 Phase 4）
 *
 * 交易记录 / 抽卡记录两个子 Tab，数据全部来自 GameplayViewModel（gameState 投影），
 * 不依赖具体 store；Single / Multiplayer 共用。
 */
import { computed, ref } from 'vue'
import { CreditCard, History as HistoryIcon, Receipt } from 'lucide-vue-next'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import type { TransactionRecord, TransactionType } from '@/types/game'
import { formatMoney } from '@/gameplay/presentation'

const props = defineProps<{
  adapter: GameplayAdapter
}>()

const vm = computed(() => props.adapter.viewModel.value)
const gameState = computed(() => vm.value.gameState)

const historyTab = ref<'transactions' | 'cards'>('transactions')

const transactions = computed(() => gameState.value.transactions ?? [])
const cardHistory = computed(() => gameState.value.cardHistory ?? [])

const totalCount = computed(() => transactions.value.length + cardHistory.value.length)

function playerNameOf(playerId: string): string {
  return gameState.value.players.find((p) => p.id === playerId)?.name ?? '—'
}

const TX_LABELS: Record<TransactionType, string> = {
  salary: '工资',
  passive_income: '被动收入',
  expense: '支出',
  stock_buy: '买入股票',
  stock_sell: '卖出股票',
  real_estate_buy: '买入房产',
  real_estate_sell: '卖出房产',
  business_buy: '买入企业',
  business_sell: '卖出企业',
  bank_loan: '银行贷款',
  loan_repay: '偿还贷款',
  savings_deposit: '存款',
  savings_withdraw: '取款',
  insurance_buy: '购买保险',
  doodad: '生活意外',
  charity: '慈善捐赠',
  charity_protect: '慈善保护',
  child: '子女支出',
  layoff: '失业',
  story_gain: '故事收益',
  story_loss: '故事损失',
  stock_split: '股票拆分',
  bankrupt: '破产',
  age_retire: '退休',
  unemployment_insurance_premium: '失业保险费',
  unemployment_insurance_benefit: '失业补助',
  other: '其他',
}

function txLabel(t: TransactionType): string {
  return TX_LABELS[t] ?? t
}

const ACTION_LABELS: Record<string, string> = {
  accepted: '接受',
  declined: '放弃',
  sold: '卖出',
  ignored: '忽略',
}

function cardActionLabel(action?: string): string {
  return action ? ACTION_LABELS[action] ?? action : ''
}

function txAmountClass(t: TransactionType): string {
  if (
    t === 'expense' ||
    t === 'doodad' ||
    t === 'charity' ||
    t === 'child' ||
    t === 'loan_repay' ||
    t === 'unemployment_insurance_premium' ||
    t === 'stock_buy' ||
    t === 'real_estate_buy' ||
    t === 'business_buy' ||
    t === 'insurance_buy' ||
    t === 'stock_split'
  ) {
    return 'text-destructive'
  }
  return 'text-success'
}

function txAmountText(tx: TransactionRecord): string {
  if (tx.type === 'stock_split') return '—'
  return `${tx.amount >= 0 ? '+' : ''}${formatMoney(tx.amount)}`
}

/** 抽卡记录类型徽章 */
function cardTypeLabel(type: string): string {
  switch (type) {
    case 'opportunity':
      return '机会'
    case 'market':
      return '市场'
    case 'doodad':
      return '意外'
    case 'fast_track_opportunity':
      return '资本机会'
    case 'story':
      return '故事'
    default:
      return type
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="flex items-center gap-2 text-base font-semibold">
        <HistoryIcon class="h-4 w-4 text-muted-foreground" />
        历史记录
      </h2>
      <span class="text-xs text-muted-foreground">共 {{ totalCount }} 条</span>
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

    <!-- 交易记录 -->
    <div v-if="historyTab === 'transactions'" class="space-y-2">
      <div
        v-for="tx in [...transactions].reverse()"
        :key="tx.id"
        class="flex items-start gap-2 rounded-xl border border-border/60 bg-background px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-muted-foreground">
              T{{ tx.turnNumber }}
            </span>
            <span
              class="inline-flex shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {{ txLabel(tx.type) }}
            </span>
          </div>
          <p class="mt-1 truncate text-xs text-foreground/90">{{ tx.description }}</p>
          <p class="text-[10px] text-muted-foreground">{{ playerNameOf(tx.playerId) }}</p>
        </div>
        <span class="shrink-0 text-sm font-semibold tabular-nums" :class="txAmountClass(tx.type)">
          {{ txAmountText(tx) }}
        </span>
      </div>
      <p v-if="!transactions.length" class="text-sm text-muted-foreground">暂无交易记录</p>
    </div>

    <!-- 抽卡记录 -->
    <div v-else class="space-y-2">
      <div
        v-for="c in [...cardHistory].reverse()"
        :key="c.id"
        class="flex items-start gap-2 rounded-xl border border-border/60 bg-background px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-muted-foreground">T{{ c.turnNumber }}</span>
            <span
              class="inline-flex shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500"
            >
              {{ cardTypeLabel(c.type) }}
            </span>
            <span
              v-if="c.action"
              class="inline-flex shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {{ cardActionLabel(c.action) }}
            </span>
          </div>
          <p class="mt-1 truncate text-xs font-medium text-foreground/90">{{ c.cardTitle }}</p>
          <p class="text-[10px] text-muted-foreground">{{ playerNameOf(c.playerId) }}</p>
        </div>
        <span
          v-if="c.amount !== undefined"
          class="shrink-0 text-sm font-semibold tabular-nums text-success"
        >
          {{ c.amount >= 0 ? '+' : '' }}{{ formatMoney(c.amount) }}
        </span>
      </div>
      <p v-if="!cardHistory.length" class="text-sm text-muted-foreground">暂无抽卡记录</p>
    </div>
  </div>
</template>
