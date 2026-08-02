<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Landmark, X, PieChart } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset } from '@/types/game'
import FinancialStatement from './FinancialStatement.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGameStore()

type TabKey = 'deposit' | 'loan' | 'repay' | 'assets' | 'statement'
const activeTab = ref<TabKey>('deposit')

const depositAmount = ref<number>(0)
const loanAmount = ref<number>(0)
const repayAmount = ref<number>(0)

const successMessage = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

function showSuccess(msg: string) {
  successMessage.value = msg
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => {
    successMessage.value = ''
  }, 2000)
}

// --- Deposit tab ---
const currentSavings = computed(() => store.currentPlayer?.savings ?? 0)
const currentCash = computed(() => store.currentPlayer?.cash ?? 0)

function setDepositQuick(amount: number | 'all') {
  if (amount === 'all') {
    depositAmount.value = currentCash.value
  } else {
    depositAmount.value = amount
  }
}

function handleDeposit() {
  const amount = depositAmount.value
  if (amount <= 0) return
  const ok = store.depositToSavings(amount)
  if (ok) {
    showSuccess(`已存入 $${Math.round(amount).toLocaleString()}`)
    depositAmount.value = 0
  }
}

// --- Loan tab ---
const totalLoan = computed(() => {
  if (!store.currentPlayer) return 0
  return store.totalBankLoanAmount(store.currentPlayer)
})

const maxLoan = computed(() => {
  if (!store.currentPlayer) return 0
  return store.maxBankLoanAmount(store.currentPlayer)
})

const monthlyPayment = computed(() => Math.round(loanAmount.value * 0.1))

function setLoanQuick(amount: number) {
  loanAmount.value = amount
}

function handleLoan() {
  const amount = loanAmount.value
  if (amount <= 0) return
  const ok = store.takeBankLoan(amount)
  if (ok) {
    showSuccess(`已借款 $${Math.round(amount).toLocaleString()}`)
    loanAmount.value = 0
  }
}

// --- Repay tab ---
const remainingLoanAfterRepay = computed(() => Math.max(0, totalLoan.value - repayAmount.value))

const repayProgress = computed(() => {
  if (totalLoan.value <= 0) return 100
  // Show progress as how much would be paid off with current repayAmount
  if (repayAmount.value <= 0) return 0
  return Math.min(100, (repayAmount.value / totalLoan.value) * 100)
})

function setRepayQuick(amount: number | 'all') {
  if (amount === 'all') {
    repayAmount.value = Math.min(totalLoan.value, currentCash.value)
  } else {
    repayAmount.value = amount
  }
}

function handleRepay() {
  const amount = repayAmount.value
  if (amount <= 0) return
  const ok = store.repayAllBankLoans(amount)
  if (ok) {
    showSuccess(`已还款 $${Math.round(amount).toLocaleString()}`)
    repayAmount.value = 0
  }
}

// --- Assets tab ---
const playerAssets = computed<Asset[]>(() => store.currentPlayer?.assets ?? [])

const stockAssets = computed(() =>
  playerAssets.value.filter((a) => a.type === 'stock'),
)

const realEstateAssets = computed(() =>
  playerAssets.value.filter((a) => a.type === 'real_estate'),
)

const businessAssets = computed(() =>
  playerAssets.value.filter((a) => a.type === 'business'),
)

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

// Reset inputs when modal closes
watch(
  () => props.show,
  (val) => {
    if (!val) {
      depositAmount.value = 0
      loanAmount.value = 0
      repayAmount.value = 0
      successMessage.value = ''
      if (successTimer) clearTimeout(successTimer)
    }
  },
)

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).dataset.overlay === 'true') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        data-overlay="true"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        @click="handleOverlayClick"
      >
        <Transition name="scale">
          <div
            v-if="show"
            class="w-full max-w-lg bg-popover text-popover-foreground border border-border rounded-[var(--radius-md)] shadow-xl overflow-hidden"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-border">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <Landmark class="w-5 h-5 text-primary" />
                </div>
                <h2 class="text-lg font-semibold text-foreground">银行</h2>
              </div>
              <button
                class="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                @click="emit('close')"
                aria-label="关闭"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Success toast -->
            <Transition name="slide-down">
              <div
                v-if="successMessage"
                class="px-5 py-2.5 bg-success/15 text-success text-sm font-medium text-center border-b border-success/20"
              >
                {{ successMessage }}
              </div>
            </Transition>

            <!-- Tabs -->
            <div class="flex border-b border-border">
              <button
                class="flex-1 py-3 text-sm font-medium transition-colors relative"
                :class="activeTab === 'deposit' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="activeTab = 'deposit'"
              >
                存款
                <span
                  v-if="activeTab === 'deposit'"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
                />
              </button>
              <button
                class="flex-1 py-3 text-sm font-medium transition-colors relative"
                :class="activeTab === 'loan' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="activeTab = 'loan'"
              >
                贷款
                <span
                  v-if="activeTab === 'loan'"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
                />
              </button>
              <button
                class="flex-1 py-3 text-sm font-medium transition-colors relative"
                :class="activeTab === 'repay' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="activeTab = 'repay'"
              >
                还款
                <span
                  v-if="activeTab === 'repay'"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
                />
              </button>
              <button
                class="flex-1 py-3 text-sm font-medium transition-colors relative"
                :class="activeTab === 'assets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="activeTab = 'assets'"
              >
                资产
                <span
                  v-if="activeTab === 'assets'"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
                />
              </button>
              <button
                class="flex-1 py-3 text-sm font-medium transition-colors relative"
                :class="activeTab === 'statement' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="activeTab = 'statement'"
              >
                <span class="flex items-center justify-center gap-1">
                  <PieChart class="w-3.5 h-3.5" />
                  财务报表
                </span>
                <span
                  v-if="activeTab === 'statement'"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
                />
              </button>
            </div>

            <!-- Tab content -->
            <div class="p-5 space-y-4">
              <!-- ====== Deposit Tab ====== -->
              <template v-if="activeTab === 'deposit'">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                    <div class="text-xs text-muted-foreground mb-1">储蓄余额</div>
                    <div class="text-lg font-semibold text-foreground">
                      ${{ currentSavings.toLocaleString() }}
                    </div>
                  </div>
                  <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                    <div class="text-xs text-muted-foreground mb-1">当前现金</div>
                    <div class="text-lg font-semibold text-foreground">
                      ${{ currentCash.toLocaleString() }}
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1.5">存款金额</label>
                  <input
                    v-model.number="depositAmount"
                    type="number"
                    min="0"
                    placeholder="请输入金额"
                    class="w-full h-11 px-3 bg-background border border-input rounded-[var(--radius-sm)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base"
                  />
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setDepositQuick(100)"
                  >
                    $100
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setDepositQuick(500)"
                  >
                    $500
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setDepositQuick(1000)"
                  >
                    $1,000
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setDepositQuick('all')"
                  >
                    全部
                  </button>
                </div>

                <div class="text-xs text-muted-foreground bg-muted/50 rounded-[var(--radius-sm)] px-3 py-2 border border-border">
                  年利率 2%，每月结算日计息
                </div>

                <button
                  class="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="depositAmount <= 0 || depositAmount > currentCash"
                  @click="handleDeposit"
                >
                  存入
                </button>
              </template>

              <!-- ====== Loan Tab ====== -->
              <template v-else-if="activeTab === 'loan'">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                    <div class="text-xs text-muted-foreground mb-1">当前贷款</div>
                    <div class="text-lg font-semibold text-destructive">
                      ${{ totalLoan.toLocaleString() }}
                    </div>
                  </div>
                  <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                    <div class="text-xs text-muted-foreground mb-1">最高额度</div>
                    <div class="text-lg font-semibold text-foreground">
                      ${{ maxLoan.toLocaleString() }}
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1.5">借款金额</label>
                  <input
                    v-model.number="loanAmount"
                    type="number"
                    min="0"
                    placeholder="请输入金额"
                    class="w-full h-11 px-3 bg-background border border-input rounded-[var(--radius-sm)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base"
                  />
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setLoanQuick(1000)"
                  >
                    $1,000
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setLoanQuick(5000)"
                  >
                    $5,000
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setLoanQuick(10000)"
                  >
                    $10,000
                  </button>
                </div>

                <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">利率</span>
                    <span class="text-foreground font-medium">10% 月息</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">月还款额</span>
                    <span class="text-foreground font-medium">${{ monthlyPayment.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">最高额度</span>
                    <span class="text-foreground font-medium">${{ maxLoan.toLocaleString() }}</span>
                  </div>
                </div>

                <button
                  class="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="loanAmount <= 0 || loanAmount > maxLoan"
                  @click="handleLoan"
                >
                  借款
                </button>
              </template>

              <!-- ====== Repay Tab ====== -->
              <template v-else-if="activeTab === 'repay'">
                <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-muted-foreground">未还贷款总额</span>
                    <span class="text-lg font-semibold text-destructive">
                      ${{ totalLoan.toLocaleString() }}
                    </span>
                  </div>
                  <!-- Progress bar -->
                  <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                      :style="{ width: `${repayProgress}%` }"
                    />
                  </div>
                  <div class="flex justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>已还 0%</span>
                    <span>本次还款 {{ Math.round(repayProgress) }}%</span>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1.5">还款金额</label>
                  <input
                    v-model.number="repayAmount"
                    type="number"
                    min="0"
                    placeholder="请输入金额"
                    class="w-full h-11 px-3 bg-background border border-input rounded-[var(--radius-sm)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base"
                  />
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setRepayQuick(500)"
                  >
                    $500
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setRepayQuick(1000)"
                  >
                    $1,000
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setRepayQuick(5000)"
                  >
                    $5,000
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                    @click="setRepayQuick('all')"
                  >
                    全部还清
                  </button>
                </div>

                <div class="bg-background rounded-[var(--radius-sm)] p-3 border border-border">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">还款后剩余贷款</span>
                    <span class="text-foreground font-medium">
                      ${{ remainingLoanAfterRepay.toLocaleString() }}
                    </span>
                  </div>
                </div>

                <button
                  class="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="repayAmount <= 0 || repayAmount > totalLoan || repayAmount > currentCash"
                  @click="handleRepay"
                >
                  还款
                </button>
              </template>

              <!-- ====== Assets Tab ====== -->
              <template v-else-if="activeTab === 'assets'">
                <div class="space-y-4">
                  <p class="text-xs text-muted-foreground">
                    查看你持有的所有资产。当市场风云发生时，相关资产可以卖出。
                  </p>

                  <!-- 股票类资产 -->
                  <div>
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">股票</h4>
                    <div v-if="stockAssets.length" class="space-y-2">
                      <div
                        v-for="asset in stockAssets"
                        :key="asset.id"
                        class="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3"
                      >
                        <div>
                          <div class="text-sm font-medium">{{ asset.name }}</div>
                          <div class="text-xs text-muted-foreground">
                            {{ asset.quantity }} 股 · 成本 {{ formatMoney(asset.cost) }}/股
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm font-semibold text-success">
                            {{ formatMoney((asset.marketPrice ?? asset.cost) * asset.quantity) }}
                          </div>
                          <div class="text-xs text-muted-foreground">
                            市值 {{ formatMoney(asset.marketPrice ?? asset.cost) }}/股
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      暂无股票资产
                    </div>
                  </div>

                  <!-- 房产类资产 -->
                  <div>
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">房产</h4>
                    <div v-if="realEstateAssets.length" class="space-y-2">
                      <div
                        v-for="asset in realEstateAssets"
                        :key="asset.id"
                        class="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3"
                      >
                        <div>
                          <div class="text-sm font-medium">{{ asset.name }}</div>
                          <div class="text-xs text-muted-foreground">
                            成本 {{ formatMoney(asset.cost) }} · 月现金流 +{{ formatMoney(asset.cashFlow) }}
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm font-semibold">
                            {{ formatMoney((asset.marketPrice ?? asset.cost) * asset.quantity) }}
                          </div>
                          <div class="text-xs text-muted-foreground">市值</div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      暂无房产资产
                    </div>
                  </div>

                  <!-- 企业类资产 -->
                  <div>
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">企业</h4>
                    <div v-if="businessAssets.length" class="space-y-2">
                      <div
                        v-for="asset in businessAssets"
                        :key="asset.id"
                        class="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3"
                      >
                        <div>
                          <div class="text-sm font-medium">{{ asset.name }}</div>
                          <div class="text-xs text-muted-foreground">
                            成本 {{ formatMoney(asset.cost) }} · 月现金流 +{{ formatMoney(asset.cashFlow) }}
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm font-semibold">
                            {{ formatMoney((asset.marketPrice ?? asset.cost) * asset.quantity) }}
                          </div>
                          <div class="text-xs text-muted-foreground">市值</div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      暂无企业资产
                    </div>
                  </div>
                </div>
              </template>

              <!-- ====== Financial Statement Tab ====== -->
              <template v-else-if="activeTab === 'statement'">
                <FinancialStatement />
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-bottom-width: 0;
}
</style>
