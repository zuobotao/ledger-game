<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Landmark,
  CircleDollarSign,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { TransactionRecord, TransactionType } from '@/types/game'

const store = useGameStore()

type FilterKey = 'all' | 'income' | 'expense' | 'investment' | 'bank'
type InvestmentSubFilter = 'all' | 'buy' | 'sell'
type SoldAssetTypeFilter = 'all' | 'stock' | 'real_estate' | 'business'

const activeFilter = ref<FilterKey>('all')
const investmentSubFilter = ref<InvestmentSubFilter>('all')
const soldAssetTypeFilter = ref<SoldAssetTypeFilter>('all')

// 交易类型分类映射
const incomeTypes: TransactionType[] = ['salary', 'passive_income']
const expenseTypes: TransactionType[] = ['expense', 'doodad', 'charity', 'child', 'layoff', 'story_loss']
const investmentBuyTypes: TransactionType[] = ['stock_buy', 'real_estate_buy', 'business_buy']
const investmentSellTypes: TransactionType[] = ['stock_sell', 'real_estate_sell', 'business_sell']
const investmentTypes: TransactionType[] = [...investmentBuyTypes, ...investmentSellTypes, 'stock_split']
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
  doodad: '生活意外',
  charity: '慈善',
  charity_protect: '慈善保护',
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
  story_gain: '故事收益',
  story_loss: '故事损失',
  stock_split: '股票拆分',
  bankrupt: '破产',
}

// 资产类型中文标签
const assetTypeLabels: Record<string, string> = {
  stock: '股票',
  real_estate: '房产',
  business: '企业',
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
    // 投资子筛选
    if (investmentSubFilter.value === 'buy') {
      records = records.filter((t) => investmentBuyTypes.includes(t.type))
    } else if (investmentSubFilter.value === 'sell') {
      records = records.filter((t) => investmentSellTypes.includes(t.type))
      // 卖出资产类型筛选
      if (soldAssetTypeFilter.value !== 'all') {
        records = records.filter((t) => t.assetType === soldAssetTypeFilter.value)
      }
    }
  } else if (activeFilter.value === 'bank') {
    records = records.filter((t) => bankTypes.includes(t.type))
  }

  // 按回合倒序排列（最新的在前），同回合按时间倒序
  return [...records].sort((a, b) => {
    if (b.turnNumber !== a.turnNumber) return b.turnNumber - a.turnNumber
    return b.timestamp - a.timestamp
  })
})

// 计算卖出交易的盈亏
function getSellPnL(tx: TransactionRecord): number {
  if (tx.costBasis !== undefined) {
    return tx.amount - tx.costBasis
  }
  return 0
}

function getSellPnLPercent(tx: TransactionRecord): number {
  if (tx.costBasis !== undefined && tx.costBasis > 0) {
    return ((tx.amount - tx.costBasis) / tx.costBasis) * 100
  }
  return 0
}

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
  if (investmentSellTypes.includes(type)) return ArrowUpRight
  if (investmentBuyTypes.includes(type)) return ArrowDownRight
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
  if (investmentSellTypes.includes(type)) return 'bg-success/15 text-success'
  if (investmentBuyTypes.includes(type)) return 'bg-primary/15 text-primary'
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

// 判断是否为投资类交易（需要显示详细信息）
function isInvestmentTransaction(type: TransactionType): boolean {
  return investmentTypes.includes(type)
}

// 判断是否为卖出交易
function isSellTransaction(type: TransactionType): boolean {
  return investmentSellTypes.includes(type)
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

// 盈亏颜色
function getPnLClass(pnl: number): string {
  if (pnl > 0) return 'text-success'
  if (pnl < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

// 筛选 Tab 配置
const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'expense', label: '支出' },
  { key: 'investment', label: '投资' },
  { key: 'bank', label: '银行' },
]

// 投资子筛选 Tab
const investmentSubTabs: { key: InvestmentSubFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'buy', label: '买入' },
  { key: 'sell', label: '已卖出' },
]

// 卖出资产类型筛选
const soldAssetTypeTabs: { key: SoldAssetTypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'stock', label: '股票' },
  { key: 'real_estate', label: '房产' },
  { key: 'business', label: '企业' },
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

    <!-- Investment sub-tabs (only shown when investment tab is active) -->
    <div v-if="activeFilter === 'investment'" class="flex border-b border-border px-3 bg-secondary/20">
      <button
        v-for="tab in investmentSubTabs"
        :key="tab.key"
        class="px-3 py-2.5 text-xs font-medium transition-colors relative"
        :class="investmentSubFilter === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="investmentSubFilter = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="investmentSubFilter === tab.key"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
        />
      </button>

      <!-- Sold asset type filter (only for "已卖出" sub-tab) -->
      <div v-if="investmentSubFilter === 'sell'" class="ml-auto flex items-center gap-1">
        <button
          v-for="typeTab in soldAssetTypeTabs"
          :key="typeTab.key"
          class="px-2 py-1 text-[10px] font-medium rounded-md transition-colors"
          :class="soldAssetTypeFilter === typeTab.key
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'"
          @click="soldAssetTypeFilter = typeTab.key"
        >
          {{ typeTab.label }}
        </button>
      </div>
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
          class="px-5 py-3.5 hover:bg-secondary/30 transition-colors"
        >
          <!-- Main row -->
          <div class="flex items-center gap-3">
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
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-muted-foreground">
                  第 {{ tx.turnNumber }} 回合
                </span>
                <span class="text-xs text-muted-foreground">·</span>
                <span class="text-xs text-muted-foreground">
                  {{ typeLabels[tx.type] }}
                </span>
                <span
                  v-if="tx.assetType"
                  class="text-xs text-muted-foreground"
                >
                  · {{ assetTypeLabels[tx.assetType] ?? tx.assetType }}
                </span>
                <span
                  v-if="isInvestmentTransaction(tx.type) && tx.assetQuantity && tx.unitPrice !== undefined"
                  class="text-xs text-muted-foreground"
                >
                  · {{ tx.assetSymbol ?? '' }} {{ tx.assetQuantity }} × ${{ Math.round(tx.unitPrice).toLocaleString() }}
                </span>
              </div>
            </div>

            <!-- Amount -->
            <div
              class="text-sm font-semibold shrink-0 tabular-nums text-right"
              :class="getAmountClass(tx.amount)"
            >
              {{ formatMoney(tx.amount) }}
            </div>
          </div>

          <!-- Sell transaction P&L detail -->
          <div
            v-if="isSellTransaction(tx.type) && tx.costBasis !== undefined"
            class="mt-2 ml-13 pl-13 grid grid-cols-3 gap-2 text-xs border-t border-border/40 pt-2"
          >
            <div>
              <div class="text-muted-foreground">买入成本</div>
              <div class="font-medium text-foreground tabular-nums">${{ Math.round(tx.costBasis).toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">卖出收入</div>
              <div class="font-medium text-foreground tabular-nums">${{ Math.round(tx.amount).toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">盈亏</div>
              <div
                class="font-semibold tabular-nums"
                :class="getPnLClass(getSellPnL(tx))"
              >
                {{ getSellPnL(tx) >= 0 ? '+' : '' }}${{ Math.round(getSellPnL(tx)).toLocaleString() }}
                <span class="text-[10px] opacity-80">
                  ({{ getSellPnLPercent(tx) >= 0 ? '+' : '' }}{{ getSellPnLPercent(tx).toFixed(1) }}%)
                </span>
              </div>
            </div>
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

.ml-13 {
  margin-left: 3.25rem;
}

.pl-13 {
  padding-left: 3.25rem;
}
</style>
