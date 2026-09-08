<script setup lang="ts">
/**
 * PlayerFinancials — 共享财务报表展示（v2.4.3 Phase 4）
 *
 * 按「购买详情 → 当前状态 → 收益信息 → 负债信息」结构渲染任意玩家财务，
 * 供 FinancialPanel（侧栏）与 BankPanel（银行弹窗财务报表 Tab）复用。
 * 纯展示组件：数据来自 vm.viewingPlayer / gameState，操作由父组件注入。
 */
import { computed } from 'vue'
import type { Player } from '@/types/game'
import {
  assetPnL,
  assetPnLPercent,
  formatMoney,
  netWorthOf,
  unitLabel,
} from '@/gameplay/presentation'

const props = defineProps<{
  player: Player
  /** 是否显示负债偿还操作区（由 FinancialPanel 提供操作） */
  showLiabilityActions?: boolean
}>()

const p = computed(() => props.player)

const stockValue = computed(() =>
  p.value.assets.filter((a) => a.type === 'stock').reduce((s, a) => s + (a.marketPrice ?? a.cost) * a.quantity, 0),
)
const realEstateValue = computed(() =>
  p.value.assets.filter((a) => a.type === 'real_estate').reduce((s, a) => s + (a.marketPrice ?? a.cost) * a.quantity, 0),
)
const businessValue = computed(() =>
  p.value.assets.filter((a) => a.type === 'business').reduce((s, a) => s + (a.marketPrice ?? a.cost) * a.quantity, 0),
)

const totalAssets = computed(() => p.value.cash + p.value.savings + stockValue.value + realEstateValue.value + businessValue.value)
const totalLiabilities = computed(() => p.value.liabilities.reduce((sum, loan) => sum + loan.amount, 0))
const passiveCoverage = computed(() => (p.value.totalExpenses > 0 ? (p.value.passiveIncome / p.value.totalExpenses) * 100 : 0))
const taxShare = computed(() => (p.value.totalExpenses > 0 ? (p.value.expenses.taxes / p.value.totalExpenses) * 100 : 0))
const financialSignal = computed(() => {
  if (p.value.passiveIncome >= p.value.totalExpenses && p.value.totalExpenses > 0) return '被动收入已覆盖总支出，可优先积累资产。'
  if (p.value.cashFlow > 0) return '现金流为正，可寻找增加被动收入的机会。'
  return '现金流为负，先控制支出或偿还负债。'
})

defineSlots<{
  /** 负债操作区（还贷/还清按钮） */
  'liability-actions'?: (props: { loan: { id: string; name: string; amount: number; category?: string } }) => unknown
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- 财务导航：先给结论，再看明细 -->
    <section class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-foreground">财务导航</h2>
          <p class="mt-1 text-xs text-muted-foreground">先看结果，再定位成本和机会</p>
        </div>
        <span class="rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold text-primary">当前状态</span>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div class="rounded-xl bg-background/80 p-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">净资产</div>
          <div class="mt-1 text-base font-bold tabular-nums" :class="netWorthOf(p) >= 0 ? 'text-foreground' : 'text-destructive'">
            {{ formatMoney(netWorthOf(p)) }}
          </div>
          <div class="mt-1 text-[10px] text-muted-foreground">资产 {{ formatMoney(totalAssets) }} · 负债 {{ formatMoney(totalLiabilities) }}</div>
        </div>
        <div class="rounded-xl bg-background/80 p-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">月现金流</div>
          <div class="mt-1 text-base font-bold tabular-nums" :class="p.cashFlow >= 0 ? 'text-success' : 'text-destructive'">
            {{ p.cashFlow >= 0 ? '+' : '' }}{{ formatMoney(p.cashFlow) }}
          </div>
          <div class="mt-1 text-[10px] text-muted-foreground">收入减去支出</div>
        </div>
        <div class="rounded-xl bg-background/80 p-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">被动收入覆盖</div>
          <div class="mt-1 text-base font-bold tabular-nums text-foreground">{{ passiveCoverage.toFixed(0) }}%</div>
          <div class="mt-1 text-[10px] text-muted-foreground">支出 {{ formatMoney(p.totalExpenses) }}/月</div>
        </div>
        <div class="rounded-xl bg-background/80 p-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">税负占比</div>
          <div class="mt-1 text-base font-bold tabular-nums text-foreground">{{ taxShare.toFixed(0) }}%</div>
          <div class="mt-1 text-[10px] text-muted-foreground">税金 {{ formatMoney(p.expenses.taxes) }}/月</div>
        </div>
      </div>
      <p class="mt-3 border-t border-primary/10 pt-3 text-xs text-muted-foreground">{{ financialSignal }}</p>
    </section>

    <!-- 收入 -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">收入</h3>
      <ul class="space-y-2 text-sm">
        <li class="flex justify-between">
          <span class="text-muted-foreground">工资</span>
          <span class="font-medium">{{ formatMoney(p.salary) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">被动收入</span>
          <span class="font-medium">{{ formatMoney(p.passiveIncome) }}</span>
        </li>
      </ul>
      <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
        <span>总收入</span>
        <span>{{ formatMoney(p.totalIncome) }}</span>
      </div>
    </section>

    <!-- 支出 -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">支出</h3>
      <ul class="space-y-2 text-sm">
        <li class="flex justify-between">
          <span class="text-muted-foreground">税金</span>
          <span class="font-medium">{{ formatMoney(p.expenses.taxes) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">房贷</span>
          <span class="font-medium">{{ formatMoney(p.expenses.mortgage) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">学生贷款</span>
          <span class="font-medium">{{ formatMoney(p.expenses.schoolLoan) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">车贷</span>
          <span class="font-medium">{{ formatMoney(p.expenses.carLoan) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">信用卡</span>
          <span class="font-medium">{{ formatMoney(p.expenses.creditCard) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">其他支出</span>
          <span class="font-medium">{{ formatMoney(p.expenses.other) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">子女支出</span>
          <span class="font-medium">{{ formatMoney(p.expenses.child) }}</span>
        </li>
      </ul>
      <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
        <span>总支出</span>
        <span>{{ formatMoney(p.totalExpenses) }}</span>
      </div>
    </section>

    <!-- 现金流 / 现金 -->
    <section class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">现金流</div>
        <div class="text-lg font-semibold text-success">{{ formatMoney(p.cashFlow) }}/月</div>
      </div>
      <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">现金</div>
        <div class="text-lg font-semibold">{{ formatMoney(p.cash) }}</div>
      </div>
    </section>

    <!-- 资产 -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">资产</h3>
      <ul v-if="p.assets.length" class="space-y-3">
        <li
          v-for="asset in p.assets"
          :key="asset.id"
          class="rounded-xl border border-border/60 bg-secondary/20 p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate text-sm font-medium text-foreground">{{ asset.name }}</span>
              <span
                v-if="asset.symbol"
                class="inline-flex shrink-0 items-center rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary"
              >
                {{ asset.symbol }}
              </span>
            </div>
            <span class="shrink-0 text-xs text-muted-foreground">
              {{ asset.quantity }} {{ unitLabel(asset.type) }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">成本价</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney(asset.cost) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">市价</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney(asset.marketPrice ?? asset.cost) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">总成本</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney((asset.cost ?? 0) * asset.quantity) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">总市值</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney((asset.marketPrice ?? asset.cost) * asset.quantity) }}</span>
            </div>
            <div v-if="asset.loanAmount !== undefined" class="flex justify-between">
              <span class="text-muted-foreground">贷款</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney(asset.loanAmount) }}</span>
            </div>
            <div v-if="asset.monthlyLoanPayment !== undefined" class="flex justify-between">
              <span class="text-muted-foreground">月供</span>
              <span class="font-medium tabular-nums text-foreground">{{ formatMoney(asset.monthlyLoanPayment) }}/月</span>
            </div>
            <div class="col-span-2 flex justify-between border-t border-border/50 pt-1">
              <span class="text-muted-foreground">浮动盈亏</span>
              <span
                class="font-semibold tabular-nums"
                :class="assetPnL(asset) >= 0 ? 'text-success' : 'text-destructive'"
              >
                {{ assetPnL(asset) >= 0 ? '+' : '' }}{{ formatMoney(assetPnL(asset)) }}
                <span class="text-[10px] opacity-80">
                  ({{ assetPnLPercent(asset) >= 0 ? '+' : '' }}{{ assetPnLPercent(asset).toFixed(1) }}%)
                </span>
              </span>
            </div>
          </div>
          <div
            v-if="asset.cashFlow > 0"
            class="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-xs"
          >
            <span class="text-muted-foreground">月现金流</span>
            <span class="font-medium text-success">+{{ formatMoney(asset.cashFlow * asset.quantity) }}/月</span>
          </div>
        </li>
      </ul>
      <div v-else class="text-sm text-muted-foreground">暂无资产</div>
    </section>

    <!-- 负债 -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">负债</h3>
      <ul v-if="p.liabilities.length" class="space-y-2 text-sm">
        <li
          v-for="loan in p.liabilities"
          :key="loan.id"
          class="flex flex-col gap-1"
          :data-liability-name="loan.name"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">{{ loan.name }}</span>
            <span class="font-medium">{{ formatMoney(loan.amount) }}</span>
          </div>
          <slot name="liability-actions" :loan="loan" />
        </li>
      </ul>
      <div v-else class="text-sm text-muted-foreground">无负债</div>
    </section>

    <!-- 资产构成摘要（股票/房产/企业） -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">资产构成</h3>
      <ul class="space-y-2 text-sm">
        <li class="flex justify-between">
          <span class="text-muted-foreground">股票</span>
          <span class="font-medium tabular-nums">{{ formatMoney(stockValue) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">房地产</span>
          <span class="font-medium tabular-nums">{{ formatMoney(realEstateValue) }}</span>
        </li>
        <li class="flex justify-between">
          <span class="text-muted-foreground">企业</span>
          <span class="font-medium tabular-nums">{{ formatMoney(businessValue) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
