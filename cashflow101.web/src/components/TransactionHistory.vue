<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Landmark,
  CircleDollarSign,
  Receipt,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { TransactionRecord, TransactionType } from '@/types/game'

const store = useGameStore()

type FilterKey = 'all' | 'income' | 'expense' | 'investment' | 'bank'

const activeFilter = ref<FilterKey>('all')

// 交易类型分类映射
const incomeTypes: TransactionType[] = ['salary', 'passive_income']
const expenseTypes: TransactionType[] = ['expense', 'doodad', 'charity', 'child', 'layoff']
const investmentTypes: TransactionType[] = [
  'stock_buy',
  'stock_sell',
  'real_estate_buy',
  'real_estate_sell',
  'business_buy',
  'business_sell',
]
const bankTypes: TransactionType[] = [
  'bank_loan',
  'loan_repay',
  'savings_deposit',
  'savings_withdraw',
  'insurance_buy',
]

// 交易类型中文标签映射
const typeLabels: Record<TransactionType, string> = {
  salary: '工资',
  passive_income: '被动收入',
  expense: '支出',
  doodad: 'Doodad',
  charity: '慈善',
  child: '子女',
  layoff: '失业',
  stock_buy: '买入股票',
  stock_sell: '卖出股票',
  real_estate_buy: '买入房产',
  real_estate_sell: '卖出房产',
  business_buy: '买入企业',
  business_sell: '卖出企业',
  bank_loan: '银行贷款',
  loan_repay: '还款',
  savings_deposit: '存款',
  savings_withdraw: '取款',
  insurance_buy: '保险',
  other: '其他',
}

// 按筛选条件过滤当前玩家的交易记录
const filteredTransactions = computed<TransactionRecord[]>(() => {
  const playerId = store.currentPlayer?.id
  if (!playerId) return []

  let records = store.transactions.filter((t) => t.playerId === playerId)

  if (activeFilter.value === 'income') {
    records = records.filter((t) => incomeTypes.includes(t.type))
  } else if (activeFilter.value === 'expense') {
    records = records.filter((t) => expenseTypes.includes(t.type))
  } else if (activeFilter.value === 'investment') {
    records = records.filter((t) => investmentTypes.includes(t.type))
  } else if (activeFilter.value === 'bank') {
    records = records.filter((t) => bankTypes.includes(t.type))
  }

  // 按回合倒序排列（最新的在前），同回合按时间倒序
  return [...records].sort((a, b) => {
    if (b.turnNumber !== a.turnNumber) return b.turnNumber - a.turnNumber
    return b.timestamp - a.timestamp
  })
})

// 判断交易类型所属分类
function getCategory(type: TransactionType): FilterKey {
  if (incomeTypes.includes(type)) return 'income'
  if (expenseTypes.includes(type)) return 'expense'
  if (investmentTypes.includes(type)) return 'investment'
  if (bankTypes.includes(type)) return 'bank'
  return 'all'
}

// 获取交易对应的图标组件
function getIconComponent(type: TransactionType) {
  const category = getCategory(type)
  switch (category) {
    case 'income':
      return TrendingUp
    case 'expense':
      return TrendingDown
    case 'investment':
      return Briefcase
    case 'bank':
      return Landmark
    default:
      return CircleDollarSign
  }
}

// 获取图标背景色
function getIconBgClass(type: TransactionType): string {
  const category = getCategory(type)
  switch (category) {
    case 'income':
      return 'bg-success/15 text-success'
    case 'expense':
      return 'bg-destructive/15 text-destructive'
    case 'investment':
      return 'bg-primary/15 text-primary'
    case 'bank':
      return 'bg-warning/15 text-warning'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// 判断是否为股票类交易
function isStockTransaction(type: TransactionType): boolean {
  return type === 'stock_buy' || type === 'stock_sell'
}

// 格式化金额
function formatMoney(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`
}

// 金额颜色
function getAmountClass(amount: number): string {
  if (amount > 0) return 'text-success'
  if (amount < 0) return 'text-destructive'
  return 'text-foreground'
}

// 筛选 Tab 配置
const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'expense', label: '支出' },
  { key: 'investment', label: '投资' },
  { key: 'bank', label: '银行' },
]
</script>

<template>
  <div class="w-full bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-border">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
          <Receipt class="w-5 h-5 text-primary" />
        </div>
        <h2 class="text-lg font-semibold text-foreground">交易记录</h2>
      </div>
      <div class="text-xs text-muted-foreground">
        共 {{ filteredTransactions.length }} 条
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex border-b border-border px-2">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="flex-1 py-3 text-sm font-medium transition-colors relative"
        :class="activeFilter === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="activeFilter = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="activeFilter === tab.key"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>

    <!-- Transaction List -->
    <div class="overflow-y-auto max-h-[420px]">
      <!-- Empty State -->
      <div
        v-if="filteredTransactions.length === 0"
        class="flex flex-col items-center justify-center py-12 px-5"
      >
        <div class="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <CircleDollarSign class="w-8 h-8 text-muted-foreground" />
        </div>
        <p class="text-sm text-muted-foreground text-center">
          暂无交易记录
        </p>
        <p class="text-xs text-muted-foreground/70 text-center mt-1">
          开始游戏后，你的每笔交易都会显示在这里
        </p>
      </div>

      <!-- List -->
      <div v-else class="divide-y divide-border/60">
        <div
          v-for="tx in filteredTransactions"
          :key="tx.id"
          class="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors"
        >
          <!-- Icon -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="getIconBgClass(tx.type)"
          >
            <component :is="getIconComponent(tx.type)" class="w-5 h-5" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-foreground truncate">
                {{ tx.description }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-muted-foreground">
                第 {{ tx.turnNumber }} 回合
              </span>
              <span class="text-xs text-muted-foreground">·</span>
              <span class="text-xs text-muted-foreground">
                {{ typeLabels[tx.type] }}
              </span>
              <span
                v-if="isStockTransaction(tx.type) && tx.assetSymbol && tx.assetQuantity"
                class="text-xs text-muted-foreground"
              >
                · {{ tx.assetSymbol }} ×{{ tx.assetQuantity }}
              </span>
            </div>
          </div>

          <!-- Amount -->
          <div
            class="text-sm font-semibold shrink-0 tabular-nums"
            :class="getAmountClass(tx.amount)"
          >
            {{ formatMoney(tx.amount) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式，与全局主题一致 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--color-gray-600);
  border-radius: 3px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-500);
}
</style>
