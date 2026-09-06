<script setup lang="ts">
/**
 * StatsPanel — 共享统计面板（v2.4.3 Phase 4）
 *
 * 渲染 viewingPlayer 的财务快照（FinancialSnapshot）关键指标。
 * 数据全部来自 GameplayViewModel，不依赖具体 store。
 */
import { computed } from 'vue'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { formatMoney } from '@/gameplay/presentation'

const props = defineProps<{
  adapter: GameplayAdapter
}>()

const vm = computed(() => props.adapter.viewModel.value)
const viewing = computed(() => vm.value.viewingPlayer)

const snapshots = computed(() => [...(viewing.value?.financialSnapshots ?? [])].reverse().slice(0, 24))

/** 净资产走势（简单 SVG 折线） */
const netWorthPoints = computed(() => {
  const list = [...(viewing.value?.financialSnapshots ?? [])].slice(-24)
  if (list.length < 2) return ''
  const values = list.map((s) => s.netWorth)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const w = 260
  const h = 60
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold">财务统计</h2>
      <span class="text-xs text-muted-foreground">
        {{ viewing?.financialSnapshots.length ?? 0 }} 个快照
      </span>
    </div>

    <!-- 净资产走势 -->
    <section
      v-if="netWorthPoints"
      class="rounded-2xl border border-border bg-background p-4 shadow-sm"
    >
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        净资产走势
      </h3>
      <svg viewBox="0 0 260 60" class="h-24 w-full" preserveAspectRatio="none">
        <polyline
          :points="netWorthPoints"
          fill="none"
          stroke="var(--primary)"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
    </section>

    <!-- 快照明细 -->
    <section class="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        快照明细
      </h3>
      <div class="space-y-2">
        <div
          v-for="s in snapshots"
          :key="s.turn"
          class="grid grid-cols-4 gap-2 rounded-lg border border-border/50 bg-secondary/20 px-2 py-1.5 text-xs"
        >
          <span class="text-muted-foreground">T{{ s.turn }}</span>
          <span class="text-right tabular-nums">{{ formatMoney(s.cash) }}</span>
          <span class="text-right tabular-nums text-success">{{ formatMoney(s.netWorth) }}</span>
          <span class="text-right tabular-nums">{{ formatMoney(s.monthlyCashFlow) }}/月</span>
        </div>
        <p v-if="!snapshots.length" class="text-sm text-muted-foreground">暂无快照</p>
      </div>
    </section>
  </div>
</template>
