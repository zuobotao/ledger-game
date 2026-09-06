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

defineSlots<{
  /** 负债操作区（还贷/还清按钮） */
  'liability-actions'?: (props: { loan: { id: string; name: string; amount: number; category?: string } }) => unknown
}>()
</script>

<template>
  <div class="space-y-4">
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
        <li v-for="loan in p.liabilities" :key="loan.id" class="flex flex-col gap-1">
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
