<script setup lang="ts">
/**
 * FinancialPanel — 共享财务报表面板（v2.4.3 Phase 4）
 *
 * 侧栏「财务」Tab 内容：PlayerFinancials + 负债偿还操作。
 * 只依赖 GameplayAdapter；操作仅在「查看自己 && 可以行动」时出现。
 */
import { computed, ref } from 'vue'
import type { Liability } from '@/types/game'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import { formatMoney } from '@/gameplay/presentation'
import PlayerFinancials from '@/gameplay/components/PlayerFinancials.vue'

const props = defineProps<{
  adapter: GameplayAdapter
  /** 是否显示负债偿还操作（银行弹窗的财务报表 Tab 传 false） */
  showActions?: boolean
}>()

const vm = computed(() => props.adapter.viewModel.value)
const viewing = computed(() => vm.value.viewingPlayer)
const isMultiplayer = computed(() => props.adapter.meta.mode === 'multiplayer')

/** 仅在自己回合查看自己时可操作 */
const canOperate = computed(
  () =>
    props.showActions !== false &&
    vm.value.canAct &&
    vm.value.viewingPlayer.id === vm.value.currentPlayer.id,
)

interface LoanView {
  id: string
  name: string
  amount: number
  category?: string
}

const repayInputs = ref<Record<string, number>>({})
const localError = ref('')

async function onRepayLoan(loan: LoanView) {
  localError.value = ''
  const amount = repayInputs.value[loan.id] ?? loan.amount
  const r = await props.adapter.commands.repayLoan({ liabilityId: loan.id, amount })
  if (!r.ok) localError.value = r.message
  else delete repayInputs.value[loan.id]
}

async function onPayoffLiability(loan: LoanView) {
  if (isMultiplayer.value) return
  localError.value = ''
  const r = await props.adapter.commands.repayLiability({ liabilityId: loan.id })
  if (!r.ok) localError.value = r.message
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold">财务报表</h2>
      <span class="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {{ viewing?.career.name }}
      </span>
    </div>

    <PlayerFinancials v-if="viewing" :player="viewing" :show-liability-actions="canOperate">
      <template #liability-actions="{ loan }">
        <div v-if="canOperate" class="flex items-center gap-2">
          <template v-if="loan.category === 'bank_loan'">
            <input
              v-model.number="repayInputs[loan.id]"
              type="number"
              :placeholder="`最多 ${formatMoney(loan.amount)}`"
              class="h-8 w-24 rounded-md border border-input px-2 text-sm"
              data-testid="bank-loan-repay-input"
            />
            <button
              type="button"
              class="rounded-md bg-secondary px-2 py-1 text-xs font-semibold hover:bg-muted"
              data-testid="bank-loan-repay-button"
              @click="onRepayLoan(loan)"
            >
              还贷
            </button>
          </template>
          <button
            v-else-if="!isMultiplayer"
            type="button"
            class="rounded-md bg-secondary px-2 py-1 text-xs font-semibold hover:bg-muted"
            @click="onPayoffLiability(loan)"
          >
            还清
          </button>
        </div>
      </template>
    </PlayerFinancials>

    <p v-if="localError" class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {{ localError }}
    </p>
  </div>
</template>
