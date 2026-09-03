<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, X, Eye, Lightbulb, Calculator, RefreshCw } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Asset, FinancialStatementKey, FinancialStatementNumberField } from '@/types/game'

const store = useGameStore()

type TabKey = 'balance_sheet' | 'income_statement'
const activeTab = ref<TabKey>('balance_sheet')

const fs = computed(() => store.currentPlayer?.financialStatement)

type EducationTipKey = FinancialStatementKey

// ========== 教育提示 ==========
const EDUCATION_TIPS: Record<EducationTipKey, { correct: string; hint: string }> = {
  userTotalAssets: {
    correct: '总资产是你拥有的所有东西的价值总和，包括现金、投资、房产等。关注资产的积累是变富的第一步。',
    hint: '试试把现金、储蓄、股票、房产、企业和其他资产都加起来。',
  },
  userTotalLiabilities: {
    correct: '总负债是你欠别人的所有钱，包括贷款、信用卡欠款等。负债会从你的口袋里掏钱。',
    hint: '把住房贷款、车贷、信用卡和其他负债加起来。',
  },
  userNetWorth: {
    correct: '净资产 = 总资产 - 总负债，这才是真正属于你的财富。富人关注增加资产，穷人关注增加负债。',
    hint: '净资产 = 总资产 - 总负债。用你算出的总资产减去总负债。',
  },
  userPassiveIncome: {
    correct: '被动收入是不需要工作就能获得的收入，如房租、股息、企业分红等。财务自由的关键是让被动收入 > 总支出。',
    hint: '把股票分红、房产租金和企业收入加起来，这些就是不需要工作也能赚的钱。',
  },
  userTotalIncome: {
    correct: '总收入 = 工资收入 + 被动收入。要关注被动收入占总收入的比例，比例越高越接近财务自由。',
    hint: '总收入 = 工资收入 + 被动收入。把这两部分加起来。',
  },
  userTotalExpenses: {
    correct: '总支出是你每月花掉的所有钱。控制支出是积累财富的第一步。先支付自己（储蓄/投资），再花剩下的。',
    hint: '把税金、住房支出、交通支出、食物支出和其他支出加起来。',
  },
  userMonthlyCashFlow: {
    correct: '月现金流 = 总收入 - 总支出。正现金流让你变富，负现金流让你变穷。富人的现金流不断买入资产。',
    hint: '月现金流 = 总收入 - 总支出。用总收入减去总支出。',
  },
}

// ========== 工具函数 ==========
function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function getInputValue(field: FinancialStatementNumberField): number | null {
  if (!fs.value) return null
  const fsRecord = fs.value as unknown as Record<string, number | null>
  return fsRecord[field] ?? null
}

function handleInput(field: FinancialStatementNumberField, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value === '' ? null : Number(target.value)
  store.setFinancialStatementValue(field, value)
}

function isVerified(item: FinancialStatementKey): boolean | undefined {
  return fs.value?.verified[item]
}

function hasViewedAnswer(item: FinancialStatementKey): boolean {
  return fs.value?.viewedAnswers.includes(item) ?? false
}

function handleVerify(item: FinancialStatementKey) {
  store.verifyFinancialItem(item)
}

function handleViewAnswer(item: FinancialStatementKey) {
  store.viewAnswer(item)
}

function getCorrectValue(item: FinancialStatementKey): number {
  const map: Record<FinancialStatementKey, number> = {
    userTotalAssets: store.correctTotalAssets,
    userTotalLiabilities: store.correctTotalLiabilities,
    userNetWorth: store.correctNetWorth,
    userPassiveIncome: store.correctPassiveIncome,
    userTotalIncome: store.correctTotalIncome,
    userTotalExpenses: store.correctTotalExpenses,
    userMonthlyCashFlow: store.correctMonthlyCashFlow,
  }
  return map[item]
}

// ========== 资产负债表数据 ==========
const playerAssets = computed<Asset[]>(() => store.currentPlayer?.assets ?? [])
const playerLiabilities = computed(() => store.currentPlayer?.liabilities ?? [])

const stockAssets = computed(() => playerAssets.value.filter((a) => a.type === 'stock'))
const realEstateAssets = computed(() => playerAssets.value.filter((a) => a.type === 'real_estate'))
const businessAssets = computed(() => playerAssets.value.filter((a) => a.type === 'business'))

const stockTotalValue = computed(() =>
  stockAssets.value.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0),
)
const realEstateTotalValue = computed(() =>
  realEstateAssets.value.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0),
)
const businessTotalValue = computed(() =>
  businessAssets.value.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0),
)

const mortgageLiability = computed(() =>
  playerLiabilities.value.find((l) => l.category === 'mortgage'),
)
const carLoanLiability = computed(() =>
  playerLiabilities.value.find((l) => l.category === 'car_loan'),
)
const creditCardLiability = computed(() =>
  playerLiabilities.value.find((l) => l.category === 'credit_card'),
)
const otherLiabilities = computed(() =>
  playerLiabilities.value.filter(
    (l) => !['mortgage', 'car_loan', 'credit_card', 'school_loan'].includes(l.category ?? ''),
  ),
)
const otherLiabilitiesTotal = computed(() =>
  otherLiabilities.value.reduce((sum, l) => sum + l.amount, 0),
)

// ========== 收入支出表数据 ==========
const salaryIncome = computed(() => {
  const p = store.currentPlayer
  if (!p) return 0
  return p.isUnemployed ? 0 : p.salary
})

const investmentIncomeDetails = computed(() => {
  const items: { name: string; amount: number }[] = []
  for (const a of playerAssets.value) {
    if (a.cashFlow > 0) {
      items.push({
        name: `${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ''}`,
        amount: a.cashFlow * a.quantity,
      })
    }
  }
  return items
})

const investmentIncomeTotal = computed(() =>
  investmentIncomeDetails.value.reduce((sum, i) => sum + i.amount, 0),
)

const currentPlayer = computed(() => store.currentPlayer)

const taxExpense = computed(() => currentPlayer.value?.expenses.taxes ?? 0)
const housingExpense = computed(() => currentPlayer.value?.expenses.mortgage ?? 0)
const transportExpense = computed(() => {
  const p = currentPlayer.value
  if (!p) return 0
  return p.expenses.carLoan + (p.expenses.schoolLoan || 0)
})
const foodExpense = computed(() => {
  const p = currentPlayer.value
  if (!p) return 0
  return p.expenses.other - (p.liabilities.filter((l) => l.category === 'bank_loan').reduce((s, l) => s + l.monthlyPayment, 0))
  // 注意：这里简化处理，other支出包含了银行贷款月付等
})
// 简化：用总支出 - 已知项 作为其他支出的自动显示
const otherExpenseAuto = computed(() => {
  const p = currentPlayer.value
  if (!p) return 0
  return p.totalExpenses - p.expenses.taxes - p.expenses.mortgage - p.expenses.carLoan - p.expenses.schoolLoan - p.expenses.child - p.expenses.creditCard
})
</script>

<template>
  <div class="financial-statement">
    <!-- Tabs -->
    <div class="flex border-b border-border mb-4">
      <button
        class="flex-1 py-2.5 text-sm font-medium transition-colors relative"
        :class="activeTab === 'balance_sheet' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'balance_sheet'"
      >
        <span class="flex items-center justify-center gap-1.5">
          <Calculator class="w-4 h-4" />
          资产负债表
        </span>
        <span
          v-if="activeTab === 'balance_sheet'"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
        />
      </button>
      <button
        class="flex-1 py-2.5 text-sm font-medium transition-colors relative"
        :class="activeTab === 'income_statement' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'income_statement'"
      >
        <span class="flex items-center justify-center gap-1.5">
          <RefreshCw class="w-4 h-4" />
          收入支出表
        </span>
        <span
          v-if="activeTab === 'income_statement'"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>

    <p class="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
      <Lightbulb class="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-warning" />
      <span>手动计算并填写关键数值，系统会自动校验。这是学习财务知识的好方法！</span>
    </p>

    <!-- ========== 资产负债表 ========== -->
    <div v-if="activeTab === 'balance_sheet'" class="space-y-5">
      <!-- 资产部分 -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span class="w-1 h-4 bg-success rounded-full"></span>
          资产
        </h3>
        <div class="space-y-1.5">
          <!-- 现金（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">现金</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(currentPlayer?.cash ?? 0) }}</span>
          </div>
          <!-- 储蓄（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">储蓄</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(currentPlayer?.savings ?? 0) }}</span>
          </div>
          <!-- 股票/基金（自动显示明细） -->
          <div class="py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">股票/基金</span>
              <span class="text-sm font-medium text-foreground">{{ formatMoney(stockTotalValue) }}</span>
            </div>
            <div v-if="stockAssets.length" class="mt-1.5 pl-3 border-l-2 border-border/50 space-y-1">
              <div v-for="a in stockAssets" :key="a.id" class="text-xs text-muted-foreground flex justify-between">
                <span>{{ a.name }} ×{{ a.quantity }}</span>
                <span>{{ formatMoney((a.marketPrice ?? a.cost) * a.quantity) }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground/60 mt-1">暂无</div>
          </div>
          <!-- 房地产（自动显示明细） -->
          <div class="py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">房地产</span>
              <span class="text-sm font-medium text-foreground">{{ formatMoney(realEstateTotalValue) }}</span>
            </div>
            <div v-if="realEstateAssets.length" class="mt-1.5 pl-3 border-l-2 border-border/50 space-y-1">
              <div v-for="a in realEstateAssets" :key="a.id" class="text-xs text-muted-foreground flex justify-between">
                <span>{{ a.name }}{{ a.quantity > 1 ? ` ×${a.quantity}` : '' }}</span>
                <span>{{ formatMoney((a.marketPrice ?? a.cost) * a.quantity) }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground/60 mt-1">暂无</div>
          </div>
          <!-- 企业（自动显示明细） -->
          <div class="py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">企业</span>
              <span class="text-sm font-medium text-foreground">{{ formatMoney(businessTotalValue) }}</span>
            </div>
            <div v-if="businessAssets.length" class="mt-1.5 pl-3 border-l-2 border-border/50 space-y-1">
              <div v-for="a in businessAssets" :key="a.id" class="text-xs text-muted-foreground flex justify-between">
                <span>{{ a.name }}{{ a.quantity > 1 ? ` ×${a.quantity}` : '' }}</span>
                <span>{{ formatMoney((a.marketPrice ?? a.cost) * a.quantity) }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground/60 mt-1">暂无</div>
          </div>
          <!-- 其他资产（用户填写） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg border border-input bg-background">
            <span class="text-sm text-foreground">其他资产</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userOtherAssets') ?? ''"
                type="number"
                placeholder="填写金额"
                class="w-28 h-8 px-2 text-right bg-transparent text-sm focus:outline-none"
                @input="handleInput('userOtherAssets', $event)"
              />
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="border-t-2 border-border my-2"></div>

          <!-- 总资产（校验项） -->
          <div class="verify-row" :class="{ verified: isVerified('userTotalAssets') === true, error: isVerified('userTotalAssets') === false }">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">总资产</span>
                <span v-if="isVerified('userTotalAssets') === true" class="text-success">
                  <Check class="w-4 h-4" />
                </span>
                <span v-else-if="isVerified('userTotalAssets') === false" class="text-destructive">
                  <X class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userTotalAssets') ?? ''"
                type="number"
                placeholder="计算后填写"
                class="w-32 h-9 px-2 text-right bg-muted/30 border border-input rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                @input="handleInput('userTotalAssets', $event)"
              />
            </div>
          </div>
          <!-- 校验反馈 -->
          <div v-if="isVerified('userTotalAssets') === true" class="feedback-correct">
            <Check class="w-3.5 h-3.5" />
            <span>答对了！</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalAssets.correct }}</p>
          </div>
          <div v-else-if="isVerified('userTotalAssets') === false" class="feedback-error">
            <X class="w-3.5 h-3.5" />
            <span>再想想</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalAssets.hint }}</p>
            <button class="view-answer-btn" @click="handleViewAnswer('userTotalAssets')">
              <Eye class="w-3 h-3" />
              查看正确答案
            </button>
            <div v-if="hasViewedAnswer('userTotalAssets')" class="mt-1 text-xs text-warning">
              正确答案：{{ formatMoney(getCorrectValue('userTotalAssets')) }}
            </div>
          </div>
          <button
            v-if="isVerified('userTotalAssets') === undefined && getInputValue('userTotalAssets') !== null"
            class="verify-btn"
            @click="handleVerify('userTotalAssets')"
          >
            校验总资产
          </button>
        </div>
      </div>

      <!-- 负债部分 -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span class="w-1 h-4 bg-destructive rounded-full"></span>
          负债
        </h3>
        <div class="space-y-1.5">
          <!-- 住房贷款（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">住房贷款</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(mortgageLiability?.amount ?? 0) }}</span>
          </div>
          <!-- 车贷（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">车贷</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(carLoanLiability?.amount ?? 0) }}</span>
          </div>
          <!-- 信用卡（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">信用卡</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(creditCardLiability?.amount ?? 0) }}</span>
          </div>
          <!-- 其他负债（用户填写） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg border border-input bg-background">
            <span class="text-sm text-foreground">其他负债</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userOtherLiabilities') ?? ''"
                type="number"
                placeholder="填写金额"
                class="w-28 h-8 px-2 text-right bg-transparent text-sm focus:outline-none"
                @input="handleInput('userOtherLiabilities', $event)"
              />
            </div>
          </div>
          <p class="text-xs text-muted-foreground/70 pl-1">
            提示：其他负债包括银行贷款、学生贷款等，总额 {{ formatMoney(otherLiabilitiesTotal) }}
          </p>

          <!-- 分隔线 -->
          <div class="border-t-2 border-border my-2"></div>

          <!-- 总负债（校验项） -->
          <div class="verify-row" :class="{ verified: isVerified('userTotalLiabilities') === true, error: isVerified('userTotalLiabilities') === false }">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">总负债</span>
                <span v-if="isVerified('userTotalLiabilities') === true" class="text-success">
                  <Check class="w-4 h-4" />
                </span>
                <span v-else-if="isVerified('userTotalLiabilities') === false" class="text-destructive">
                  <X class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userTotalLiabilities') ?? ''"
                type="number"
                placeholder="计算后填写"
                class="w-32 h-9 px-2 text-right bg-muted/30 border border-input rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                @input="handleInput('userTotalLiabilities', $event)"
              />
            </div>
          </div>
          <div v-if="isVerified('userTotalLiabilities') === true" class="feedback-correct">
            <Check class="w-3.5 h-3.5" />
            <span>答对了！</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalLiabilities.correct }}</p>
          </div>
          <div v-else-if="isVerified('userTotalLiabilities') === false" class="feedback-error">
            <X class="w-3.5 h-3.5" />
            <span>再想想</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalLiabilities.hint }}</p>
            <button class="view-answer-btn" @click="handleViewAnswer('userTotalLiabilities')">
              <Eye class="w-3 h-3" />
              查看正确答案
            </button>
            <div v-if="hasViewedAnswer('userTotalLiabilities')" class="mt-1 text-xs text-warning">
              正确答案：{{ formatMoney(getCorrectValue('userTotalLiabilities')) }}
            </div>
          </div>
          <button
            v-if="isVerified('userTotalLiabilities') === undefined && getInputValue('userTotalLiabilities') !== null"
            class="verify-btn"
            @click="handleVerify('userTotalLiabilities')"
          >
            校验总负债
          </button>
        </div>
      </div>

      <!-- 净资产 -->
      <div class="pt-3 border-t border-border">
        <div class="verify-row net-worth-row" :class="{ verified: isVerified('userNetWorth') === true, error: isVerified('userNetWorth') === false }">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-foreground">净资产</span>
              <span class="text-xs text-muted-foreground">= 总资产 - 总负债</span>
              <span v-if="isVerified('userNetWorth') === true" class="text-success">
                <Check class="w-4 h-4" />
              </span>
              <span v-else-if="isVerified('userNetWorth') === false" class="text-destructive">
                <X class="w-4 h-4" />
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">$</span>
            <input
              :value="getInputValue('userNetWorth') ?? ''"
              type="number"
              placeholder="计算后填写"
              class="w-36 h-10 px-2 text-right bg-muted/30 border-2 border-primary/30 rounded-md text-base font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              @input="handleInput('userNetWorth', $event)"
            />
          </div>
        </div>
        <div v-if="isVerified('userNetWorth') === true" class="feedback-correct">
          <Check class="w-3.5 h-3.5" />
          <span>答对了！</span>
          <p class="feedback-tip">{{ EDUCATION_TIPS.userNetWorth.correct }}</p>
        </div>
        <div v-else-if="isVerified('userNetWorth') === false" class="feedback-error">
          <X class="w-3.5 h-3.5" />
          <span>再想想</span>
          <p class="feedback-tip">{{ EDUCATION_TIPS.userNetWorth.hint }}</p>
          <button class="view-answer-btn" @click="handleViewAnswer('userNetWorth')">
            <Eye class="w-3 h-3" />
            查看正确答案
          </button>
          <div v-if="hasViewedAnswer('userNetWorth')" class="mt-1 text-xs text-warning">
            正确答案：{{ formatMoney(getCorrectValue('userNetWorth')) }}
          </div>
        </div>
        <button
          v-if="isVerified('userNetWorth') === undefined && getInputValue('userNetWorth') !== null"
          class="verify-btn"
          @click="handleVerify('userNetWorth')"
        >
          校验净资产
        </button>
      </div>
    </div>

    <!-- ========== 收入支出表 ========== -->
    <div v-else class="space-y-5">
      <!-- 收入部分 -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span class="w-1 h-4 bg-success rounded-full"></span>
          收入
        </h3>
        <div class="space-y-1.5">
          <!-- 工资收入（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">工资收入</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(salaryIncome) }}</span>
          </div>
          <!-- 投资收入（自动显示明细） -->
          <div class="py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">投资收入</span>
              <span class="text-sm font-medium text-foreground">{{ formatMoney(investmentIncomeTotal) }}</span>
            </div>
            <div v-if="investmentIncomeDetails.length" class="mt-1.5 pl-3 border-l-2 border-border/50 space-y-1">
              <div v-for="(item, idx) in investmentIncomeDetails" :key="idx" class="text-xs text-muted-foreground flex justify-between">
                <span>{{ item.name }}</span>
                <span>+{{ formatMoney(item.amount) }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground/60 mt-1">暂无投资收入</div>
          </div>

          <!-- 被动收入（校验项） -->
          <div class="verify-row" :class="{ verified: isVerified('userPassiveIncome') === true, error: isVerified('userPassiveIncome') === false }">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">被动收入</span>
                <span v-if="isVerified('userPassiveIncome') === true" class="text-success">
                  <Check class="w-4 h-4" />
                </span>
                <span v-else-if="isVerified('userPassiveIncome') === false" class="text-destructive">
                  <X class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userPassiveIncome') ?? ''"
                type="number"
                placeholder="计算后填写"
                class="w-32 h-9 px-2 text-right bg-muted/30 border border-input rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                @input="handleInput('userPassiveIncome', $event)"
              />
            </div>
          </div>
          <div v-if="isVerified('userPassiveIncome') === true" class="feedback-correct">
            <Check class="w-3.5 h-3.5" />
            <span>答对了！</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userPassiveIncome.correct }}</p>
          </div>
          <div v-else-if="isVerified('userPassiveIncome') === false" class="feedback-error">
            <X class="w-3.5 h-3.5" />
            <span>再想想</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userPassiveIncome.hint }}</p>
            <button class="view-answer-btn" @click="handleViewAnswer('userPassiveIncome')">
              <Eye class="w-3 h-3" />
              查看正确答案
            </button>
            <div v-if="hasViewedAnswer('userPassiveIncome')" class="mt-1 text-xs text-warning">
              正确答案：{{ formatMoney(getCorrectValue('userPassiveIncome')) }}
            </div>
          </div>
          <button
            v-if="isVerified('userPassiveIncome') === undefined && getInputValue('userPassiveIncome') !== null"
            class="verify-btn"
            @click="handleVerify('userPassiveIncome')"
          >
            校验被动收入
          </button>

          <!-- 分隔线 -->
          <div class="border-t-2 border-border my-2"></div>

          <!-- 总收入（校验项） -->
          <div class="verify-row" :class="{ verified: isVerified('userTotalIncome') === true, error: isVerified('userTotalIncome') === false }">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">总收入</span>
                <span v-if="isVerified('userTotalIncome') === true" class="text-success">
                  <Check class="w-4 h-4" />
                </span>
                <span v-else-if="isVerified('userTotalIncome') === false" class="text-destructive">
                  <X class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userTotalIncome') ?? ''"
                type="number"
                placeholder="计算后填写"
                class="w-32 h-9 px-2 text-right bg-muted/30 border border-input rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                @input="handleInput('userTotalIncome', $event)"
              />
            </div>
          </div>
          <div v-if="isVerified('userTotalIncome') === true" class="feedback-correct">
            <Check class="w-3.5 h-3.5" />
            <span>答对了！</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalIncome.correct }}</p>
          </div>
          <div v-else-if="isVerified('userTotalIncome') === false" class="feedback-error">
            <X class="w-3.5 h-3.5" />
            <span>再想想</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalIncome.hint }}</p>
            <button class="view-answer-btn" @click="handleViewAnswer('userTotalIncome')">
              <Eye class="w-3 h-3" />
              查看正确答案
            </button>
            <div v-if="hasViewedAnswer('userTotalIncome')" class="mt-1 text-xs text-warning">
              正确答案：{{ formatMoney(getCorrectValue('userTotalIncome')) }}
            </div>
          </div>
          <button
            v-if="isVerified('userTotalIncome') === undefined && getInputValue('userTotalIncome') !== null"
            class="verify-btn"
            @click="handleVerify('userTotalIncome')"
          >
            校验总收入
          </button>
        </div>
      </div>

      <!-- 支出部分 -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span class="w-1 h-4 bg-destructive rounded-full"></span>
          支出
        </h3>
        <div class="space-y-1.5">
          <!-- 税金（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">税金</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(taxExpense) }}</span>
          </div>
          <!-- 住房支出（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">住房支出</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(housingExpense) }}</span>
          </div>
          <!-- 交通支出（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">交通支出</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(currentPlayer?.expenses.carLoan ?? 0) }}</span>
          </div>
          <!-- 食物/生活支出（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">生活支出</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(otherExpenseAuto) }}</span>
          </div>
          <!-- 子女支出（自动） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
            <span class="text-sm text-muted-foreground">子女支出</span>
            <span class="text-sm font-medium text-foreground">{{ formatMoney(currentPlayer?.expenses.child ?? 0) }}</span>
          </div>
          <!-- 其他支出（用户填写） -->
          <div class="flex justify-between items-center py-2 px-3 rounded-lg border border-input bg-background">
            <span class="text-sm text-foreground">其他支出</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userOtherExpenses') ?? ''"
                type="number"
                placeholder="填写金额"
                class="w-28 h-8 px-2 text-right bg-transparent text-sm focus:outline-none"
                @input="handleInput('userOtherExpenses', $event)"
              />
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="border-t-2 border-border my-2"></div>

          <!-- 总支出（校验项） -->
          <div class="verify-row" :class="{ verified: isVerified('userTotalExpenses') === true, error: isVerified('userTotalExpenses') === false }">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">总支出</span>
                <span v-if="isVerified('userTotalExpenses') === true" class="text-success">
                  <Check class="w-4 h-4" />
                </span>
                <span v-else-if="isVerified('userTotalExpenses') === false" class="text-destructive">
                  <X class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">$</span>
              <input
                :value="getInputValue('userTotalExpenses') ?? ''"
                type="number"
                placeholder="计算后填写"
                class="w-32 h-9 px-2 text-right bg-muted/30 border border-input rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                @input="handleInput('userTotalExpenses', $event)"
              />
            </div>
          </div>
          <div v-if="isVerified('userTotalExpenses') === true" class="feedback-correct">
            <Check class="w-3.5 h-3.5" />
            <span>答对了！</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalExpenses.correct }}</p>
          </div>
          <div v-else-if="isVerified('userTotalExpenses') === false" class="feedback-error">
            <X class="w-3.5 h-3.5" />
            <span>再想想</span>
            <p class="feedback-tip">{{ EDUCATION_TIPS.userTotalExpenses.hint }}</p>
            <button class="view-answer-btn" @click="handleViewAnswer('userTotalExpenses')">
              <Eye class="w-3 h-3" />
              查看正确答案
            </button>
            <div v-if="hasViewedAnswer('userTotalExpenses')" class="mt-1 text-xs text-warning">
              正确答案：{{ formatMoney(getCorrectValue('userTotalExpenses')) }}
            </div>
          </div>
          <button
            v-if="isVerified('userTotalExpenses') === undefined && getInputValue('userTotalExpenses') !== null"
            class="verify-btn"
            @click="handleVerify('userTotalExpenses')"
          >
            校验总支出
          </button>
        </div>
      </div>

      <!-- 月现金流 -->
      <div class="pt-3 border-t border-border">
        <div class="verify-row cashflow-row" :class="{ verified: isVerified('userMonthlyCashFlow') === true, error: isVerified('userMonthlyCashFlow') === false }">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-foreground">月现金流</span>
              <span class="text-xs text-muted-foreground">= 总收入 - 总支出</span>
              <span v-if="isVerified('userMonthlyCashFlow') === true" class="text-success">
                <Check class="w-4 h-4" />
              </span>
              <span v-else-if="isVerified('userMonthlyCashFlow') === false" class="text-destructive">
                <X class="w-4 h-4" />
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">$</span>
            <input
              :value="getInputValue('userMonthlyCashFlow') ?? ''"
              type="number"
              placeholder="计算后填写"
              class="w-36 h-10 px-2 text-right bg-muted/30 border-2 border-primary/30 rounded-md text-base font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              @input="handleInput('userMonthlyCashFlow', $event)"
            />
          </div>
        </div>
        <div v-if="isVerified('userMonthlyCashFlow') === true" class="feedback-correct">
          <Check class="w-3.5 h-3.5" />
          <span>答对了！</span>
          <p class="feedback-tip">{{ EDUCATION_TIPS.userMonthlyCashFlow.correct }}</p>
        </div>
        <div v-else-if="isVerified('userMonthlyCashFlow') === false" class="feedback-error">
          <X class="w-3.5 h-3.5" />
          <span>再想想</span>
          <p class="feedback-tip">{{ EDUCATION_TIPS.userMonthlyCashFlow.hint }}</p>
          <button class="view-answer-btn" @click="handleViewAnswer('userMonthlyCashFlow')">
            <Eye class="w-3 h-3" />
            查看正确答案
          </button>
          <div v-if="hasViewedAnswer('userMonthlyCashFlow')" class="mt-1 text-xs text-warning">
            正确答案：{{ formatMoney(getCorrectValue('userMonthlyCashFlow')) }}
          </div>
        </div>
        <button
          v-if="isVerified('userMonthlyCashFlow') === undefined && getInputValue('userMonthlyCashFlow') !== null"
          class="verify-btn"
          @click="handleVerify('userMonthlyCashFlow')"
        >
          校验月现金流
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-statement {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.verify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-muted);
  transition: all 0.2s ease;
}

.verify-row.verified {
  border-color: var(--color-success);
  background: rgba(48, 209, 88, 0.1);
}

.verify-row.error {
  border-color: var(--color-destructive);
  background: rgba(239, 68, 68, 0.08);
}

.net-worth-row {
  background: linear-gradient(135deg, var(--color-muted) 0%, var(--color-secondary) 100%);
  border-width: 2px;
}

.cashflow-row {
  background: linear-gradient(135deg, var(--color-muted) 0%, var(--color-secondary) 100%);
  border-width: 2px;
}

.feedback-correct {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: rgba(48, 209, 88, 0.12);
  border: 1px solid rgba(48, 209, 88, 0.3);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-success);
  flex-wrap: wrap;
}

.feedback-error {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-destructive);
  flex-wrap: wrap;
}

.feedback-tip {
  width: 100%;
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-muted-foreground);
  line-height: 1.5;
}

.view-answer-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  margin-top: 0.375rem;
  background: var(--color-secondary);
  color: var(--color-secondary-foreground);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-answer-btn:hover {
  background: var(--color-accent);
  color: var(--color-accent-foreground);
}

.verify-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 1rem;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.verify-btn:hover {
  filter: brightness(1.1);
}
</style>
