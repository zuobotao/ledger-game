<script setup lang="ts">
/**
 * BankPanel — 共享银行面板（v2.4.3 Phase 4）
 *
 * Tabs：存款 / 贷款 / 保险 / 财务报表。
 * 只依赖 GameplayAdapter + 纯引擎工具（maxBankLoan 等），不 import store。
 */
import { computed, ref, watch } from 'vue'
import { Landmark, PiggyBank, HandCoins, Shield, PieChart } from 'lucide-vue-next'
import type { Liability } from '@/types/game'
import { UNEMPLOYMENT_INSURANCE_RATE } from '@/types/game'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import type { BankPanelTab } from '@/gameplay/types'
import { formatMoney, maxBankLoan } from '@/gameplay/presentation'
import PlayerFinancials from '@/gameplay/components/PlayerFinancials.vue'

const props = defineProps<{
  adapter: GameplayAdapter
  initialTab?: BankPanelTab
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const vm = computed(() => props.adapter.viewModel.value)
const viewing = computed(() => vm.value.viewingPlayer)
const isMultiplayer = computed(() => props.adapter.meta.mode === 'multiplayer')

const tab = ref<BankPanelTab>('deposit')
watch(
  () => props.initialTab,
  (t) => {
    if (t) tab.value = t
  },
  { immediate: true },
)

const commands = computed(() => props.adapter.commands)
const localError = ref('')
const localSuccess = ref('')

async function run(cmd: Promise<{ ok: boolean; message?: string }>) {
  localError.value = ''
  localSuccess.value = ''
  const r = await cmd
  if (!r.ok) localError.value = r.message ?? '操作失败'
  else localSuccess.value = '操作成功'
}

function clearFeedback() {
  localError.value = ''
  localSuccess.value = ''
}

// ============ 存款 / 取款 ============
const depositAmount = ref(0)
const withdrawAmount = ref(0)

const availableFunds = computed(() => (viewing.value?.cash ?? 0) + (viewing.value?.savings ?? 0))

async function onDeposit() {
  const v = Math.floor(depositAmount.value)
  if (v <= 0) {
    localError.value = '请输入有效金额'
    return
  }
  await run(commands.value.depositSavings({ amount: v }))
  if (!localError.value) depositAmount.value = 0
}

async function onWithdraw() {
  const v = Math.floor(withdrawAmount.value)
  if (v <= 0) {
    localError.value = '请输入有效金额'
    return
  }
  await run(commands.value.withdrawSavings({ amount: v }))
  if (!localError.value) withdrawAmount.value = 0
}

// ============ 贷款 ============
const maxLoan = computed(() => (viewing.value ? maxBankLoan(viewing.value) : 0))
const loanAmount = ref(0)
const bankLoans = computed<Liability[]>(
  () => viewing.value?.liabilities.filter((l) => l.category === 'bank_loan') ?? [],
)
const repayInputs = ref<Record<string, number>>({})

async function onTakeLoan() {
  const v = Math.floor(loanAmount.value)
  if (v <= 0) {
    localError.value = '请输入贷款金额'
    return
  }
  await run(commands.value.takeLoan({ amount: v }))
  if (!localError.value) loanAmount.value = 0
}

async function onRepayLoan(loan: Liability) {
  const amount = repayInputs.value[loan.id] ?? loan.amount
  await run(commands.value.repayLoan({ liabilityId: loan.id, amount }))
  if (!localError.value) delete repayInputs.value[loan.id]
}

// ============ 保险 ============
const healthCost = computed(() => Math.round((viewing.value?.totalExpenses ?? 0) * 6))
const unemploymentPremium = computed(() =>
  Math.round((viewing.value?.salary ?? 0) * UNEMPLOYMENT_INSURANCE_RATE),
)

const canActOnSelf = computed(
  () => vm.value.canAct && vm.value.viewingPlayer.id === vm.value.currentPlayer.id,
)

const healthInsuranceState = computed(() => ({
  owned: viewing.value?.hasInsurance ?? false,
  cost: healthCost.value,
  affordable: (viewing.value?.cash ?? 0) >= healthCost.value,
}))

const unemploymentState = computed(() => ({
  owned: viewing.value?.hasUnemploymentInsurance ?? false,
  premium: unemploymentPremium.value,
}))

async function onBuyHealthInsurance() {
  await run(commands.value.buyInsurance({ type: 'health' }))
}

async function onToggleUnemploymentInsurance() {
  await run(commands.value.buyInsurance({ type: 'unemployment' }))
}

const TABS: { key: BankPanelTab; label: string; icon: typeof Landmark }[] = [
  { key: 'deposit', label: '存款', icon: PiggyBank },
  { key: 'loan', label: '贷款', icon: HandCoins },
  { key: 'insurance', label: '保险', icon: Shield },
  { key: 'statement', label: '财务报表', icon: PieChart },
]
</script>

<template>
  <div class="flex flex-col">
    <!-- Tabs -->
    <div class="flex border-b border-border px-4 pt-3 sm:px-5">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="relative flex-1 cursor-pointer pb-3 text-xs font-medium transition-colors sm:text-sm"
        :class="tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = t.key"
      >
        <span class="flex items-center justify-center gap-1.5">
          <component :is="t.icon" class="h-4 w-4" />
          {{ t.label }}
        </span>
        <span
          v-if="tab === t.key"
          class="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary"
        />
      </button>
    </div>

    <div class="px-4 py-4 sm:px-5">
      <p
        v-if="localError"
        class="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
        data-testid="bank-error"
      >
        {{ localError }}
      </p>
      <p
        v-else-if="localSuccess"
        class="mb-3 rounded-lg bg-success/10 px-3 py-2 text-xs text-success"
        data-testid="bank-success"
      >
        {{ localSuccess }}
      </p>

      <!-- ============ 存款 Tab ============ -->
      <div v-if="tab === 'deposit'" class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-2xl border border-border bg-secondary/20 p-3 text-center">
            <div class="text-xs text-muted-foreground">现金</div>
            <div class="mt-1 text-base font-semibold tabular-nums text-success">
              {{ formatMoney(viewing?.cash ?? 0) }}
            </div>
          </div>
          <div class="rounded-2xl border border-border bg-secondary/20 p-3 text-center">
            <div class="text-xs text-muted-foreground">存款</div>
            <div class="mt-1 text-base font-semibold tabular-nums text-emerald-500">
              {{ formatMoney(viewing?.savings ?? 0) }}
            </div>
          </div>
          <div class="rounded-2xl border border-border bg-secondary/20 p-3 text-center">
            <div class="text-xs text-muted-foreground">可用资金</div>
            <div class="mt-1 text-base font-semibold tabular-nums">{{ formatMoney(availableFunds) }}</div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            存入存款
          </h3>
          <div class="flex items-center gap-2">
            <input
              v-model.number="depositAmount"
              type="number"
              min="0"
              :max="viewing?.cash ?? 0"
              class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              data-testid="bank-deposit-input"
            />
            <button
              type="button"
              class="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              :disabled="!canActOnSelf || isMultiplayer"
              data-testid="bank-deposit-button"
              @click="onDeposit"
            >
              存入
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            取回存款
          </h3>
          <div class="flex items-center gap-2">
            <input
              v-model.number="withdrawAmount"
              type="number"
              min="0"
              :max="viewing?.savings ?? 0"
              class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              data-testid="bank-withdraw-input"
            />
            <button
              type="button"
              class="h-10 shrink-0 rounded-lg bg-secondary px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
              :disabled="!canActOnSelf"
              data-testid="bank-withdraw-button"
              @click="onWithdraw"
            >
              取出
            </button>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground">
          存款不改变净资产；取款不可超过存入总额。
        </p>
      </div>

      <!-- ============ 贷款 Tab ============ -->
      <div v-else-if="tab === 'loan'" class="space-y-4">
        <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            申请银行贷款
          </h3>
          <p class="mb-3 text-xs text-muted-foreground">
            最高可贷 {{ formatMoney(maxLoan) }}（收入倍数 - 已贷余额），月供按银行规则计息。
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model.number="loanAmount"
              type="number"
              min="0"
              :max="maxLoan"
              class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              data-testid="bank-loan-input"
            />
            <button
              type="button"
              class="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              :disabled="!canActOnSelf"
              data-testid="bank-loan-button"
              @click="onTakeLoan"
            >
              贷款
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            偿还贷款
          </h3>
          <div v-if="bankLoans.length" class="space-y-3">
            <div
              v-for="loan in bankLoans"
              :key="loan.id"
              class="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3"
            >
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium">{{ loan.name }}</div>
                <div class="text-xs text-muted-foreground">
                  余额 {{ formatMoney(loan.amount) }} · 月供 {{ formatMoney(loan.monthlyPayment) }}
                </div>
              </div>
              <input
                v-model.number="repayInputs[loan.id]"
                type="number"
                :placeholder="`最多 ${formatMoney(loan.amount)}`"
                class="h-9 w-28 rounded-md border border-input px-2 text-sm"
                data-testid="bank-loan-repay-input"
              />
              <button
                type="button"
                class="h-9 rounded-md bg-secondary px-3 text-xs font-semibold hover:bg-muted disabled:opacity-40"
                :disabled="!canActOnSelf"
                data-testid="bank-loan-repay-button"
                @click="onRepayLoan(loan)"
              >
                还贷
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">暂无银行贷款</p>
        </div>
      </div>

      <!-- ============ 保险 Tab ============ -->
      <div v-else-if="tab === 'insurance'" class="space-y-4">
        <div v-if="isMultiplayer" class="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          多人模式暂不支持保险（服务器规则约束）。
        </div>
        <template v-else>
          <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold">健康保险</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  突发意外 / 孩子支出赔付保障
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="
                  healthInsuranceState.owned
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-secondary text-muted-foreground'
                "
              >
                {{ healthInsuranceState.owned ? '已购买' : '未购买' }}
              </span>
            </div>
            <button
              v-if="!healthInsuranceState.owned"
              type="button"
              class="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              :disabled="!canActOnSelf || !healthInsuranceState.affordable"
              data-testid="buy-health-insurance"
              @click="onBuyHealthInsurance"
            >
              购买（{{ formatMoney(healthInsuranceState.cost) }}）
            </button>
            <p v-if="!healthInsuranceState.affordable" class="mt-2 text-xs text-destructive">
              现金不足（需 {{ formatMoney(healthInsuranceState.cost) }}）
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold">失业保险</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  失业期间领取全额工资；每月保费 {{ formatMoney(unemploymentState.premium) }}
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="
                  unemploymentState.owned
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-secondary text-muted-foreground'
                "
              >
                {{ unemploymentState.owned ? '已投保' : '未投保' }}
              </span>
            </div>
            <button
              type="button"
              class="mt-3 w-full rounded-lg bg-secondary py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
              :disabled="!canActOnSelf"
              data-testid="toggle-unemployment-insurance"
              @click="onToggleUnemploymentInsurance"
            >
              {{ unemploymentState.owned ? '退保' : '投保' }}
            </button>
          </div>
        </template>
      </div>

      <!-- ============ 财务报表 Tab ============ -->
      <div v-else class="space-y-4">
        <PlayerFinancials v-if="viewing" :player="viewing" />
      </div>
    </div>
  </div>
</template>
