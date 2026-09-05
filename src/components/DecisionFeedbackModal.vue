<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Gem,
  AlertTriangle,
  Lightbulb,
  Check,
  ArrowRight,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { FinancialDelta, GameWarning } from '@/engine/contract'

const gameStore = useGameStore()

const isOpen = ref(false)
const hasAnimated = ref(false)

// 监听 lastActionResult 变化，自动打开弹窗
watch(
  () => gameStore.lastActionResult,
  (result) => {
    if (result && result.delta && !isDeltaZero(result.delta)) {
      isOpen.value = true
      hasAnimated.value = false
      // 触发数字动画
      setTimeout(() => {
        hasAnimated.value = true
      }, 100)
    }
  },
  { deep: true },
)

function isDeltaZero(delta: FinancialDelta): boolean {
  return Object.values(delta).every((v) => v === 0)
}

function close() {
  isOpen.value = false
  gameStore.clearActionResult()
}

const result = computed(() => gameStore.lastActionResult)
const delta = computed(() => result.value?.delta ?? null)

// 格式化金额
function fmt(n: number, showSign = true): string {
  const abs = Math.abs(Math.round(n))
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${showSign ? sign : ''}$${abs.toLocaleString()}`
}

// 判断变化方向
function isPositive(n: number): boolean {
  return n > 0
}

function isNegative(n: number): boolean {
  return n < 0
}

// 风险警告图标和颜色
function warningLevelColor(level: string): string {
  switch (level) {
    case 'high': return 'text-red-500 bg-red-500/10'
    case 'medium': return 'text-amber-500 bg-amber-500/10'
    case 'low': return 'text-blue-500 bg-blue-500/10'
    default: return 'text-muted-foreground bg-secondary'
  }
}

function warningIcon(type: string) {
  switch (type) {
    case 'risk': return AlertTriangle
    case 'education': return Lightbulb
    default: return Lightbulb
  }
}

// 动作类型对应的"为什么"解释
const whyExplanations: Record<string, string> = {
  buy_opportunity: '购买资产后，你的现金减少了（首付），但资产和负债都增加了。如果资产产生的被动收入超过了贷款成本，长期来看你的净资产会增长。',
  sell_asset: '卖出资产获得了现金，但你失去了这部分资产的未来收益和增值潜力。如果是亏损卖出，你的净资产会减少。',
  take_bank_loan: '贷款增加了你的现金，但同时也增加了负债和每月还款额。每月还款会从你的现金流中扣除，减少可支配收入。',
  repay_bank_loan: '还款减少了你的现金，但也减少了负债和每月还款压力。负债减少后，你的净资产和月现金流都会改善。',
}

const whyExplanation = computed(() => {
  if (!result.value) return ''
  return whyExplanations[result.value.action] ?? ''
})

// 显示哪些财务指标（只显示有变化的）
const visibleMetrics = computed(() => {
  if (!delta.value) return []
  const metrics: { key: keyof FinancialDelta; label: string; icon: string; category: string }[] = [
    { key: 'cash', label: '现金', icon: 'cash', category: '流动' },
    { key: 'cashFlow', label: '月现金流', icon: 'cashflow', category: '流动' },
    { key: 'passiveIncome', label: '被动收入', icon: 'passive', category: '收入' },
    { key: 'assets', label: '总资产', icon: 'assets', category: '资产负债' },
    { key: 'liabilities', label: '总负债', icon: 'liabilities', category: '资产负债' },
    { key: 'netWorth', label: '净资产', icon: 'networth', category: '资产负债' },
  ]
  return metrics.filter((m) => Math.abs(delta.value![m.key]) >= 1)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && result" class="decision-feedback-overlay" @click.self="close">
        <div class="decision-feedback-modal">
          <!-- 头部 -->
          <div class="modal-header">
            <div class="header-icon success">
              <Check class="w-5 h-5" />
            </div>
            <div class="header-text">
              <h3 class="title">{{ result.title }}</h3>
              <p class="subtitle">本次操作对你的财务状况产生了以下影响</p>
            </div>
            <button class="close-btn" @click="close">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- 财务变化 -->
          <div v-if="delta" class="financial-delta-section">
            <h4 class="section-title">
              <ArrowRight class="w-3.5 h-3.5 text-primary" />
              财务变化
            </h4>

            <div class="delta-grid">
              <div
                v-for="metric in visibleMetrics"
                :key="metric.key"
                class="delta-item"
                :class="{
                  'delta-positive': isPositive(delta![metric.key]),
                  'delta-negative': isNegative(delta![metric.key]),
                  'delta-neutral': delta![metric.key] === 0,
                }"
              >
                <span class="delta-label">{{ metric.label }}</span>
                <span class="delta-value">
                  {{ fmt(delta![metric.key]) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 风险警告 -->
          <div v-if="result.warnings && result.warnings.length > 0" class="warnings-section">
            <h4 class="section-title">
              <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
              需要注意
            </h4>

            <div class="warnings-list">
              <div
                v-for="(warning, idx) in result.warnings"
                :key="idx"
                class="warning-item"
              >
                <div class="warning-icon-wrapper" :class="warningLevelColor(warning.level)">
                  <component :is="warningIcon(warning.type)" class="w-4 h-4" />
                </div>
                <div class="warning-content">
                  <span class="warning-title">{{ warning.title }}</span>
                  <span class="warning-desc">{{ warning.description }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 为什么 -->
          <div v-if="whyExplanation" class="why-section">
            <h4 class="section-title">
              <Lightbulb class="w-3.5 h-3.5 text-amber-400" />
              为什么？
            </h4>
            <p class="why-text">{{ whyExplanation }}</p>
          </div>

          <!-- 底部按钮 -->
          <div class="modal-footer">
            <button class="confirm-btn" data-testid="decision-feedback-dismiss" @click="close">
              知道了
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.decision-feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.decision-feedback-modal {
  width: 100%;
  max-width: 420px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card) 0%, var(--background) 100%);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.header-icon.success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 17px;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: var(--muted-foreground);
  margin: 2px 0 0 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--secondary);
  color: var(--foreground);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted-foreground);
  margin: 0 0 12px 0;
}

.financial-delta-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.delta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.delta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.delta-label {
  font-size: 11px;
  color: var(--muted-foreground);
}

.delta-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.delta-positive .delta-value {
  color: #22c55e;
}

.delta-negative .delta-value {
  color: #ef4444;
}

.delta-neutral .delta-value {
  color: var(--muted-foreground);
}

.warnings-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.warning-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.warning-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.warning-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
}

.warning-desc {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.5;
}

.why-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.why-text {
  font-size: 13px;
  color: var(--muted-foreground);
  line-height: 1.6;
  margin: 0;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid #fbbf24;
}

.modal-footer {
  padding: 16px 20px;
}

.confirm-btn {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  filter: brightness(0.96);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .decision-feedback-modal,
.modal-leave-to .decision-feedback-modal {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 640px) {
  .delta-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .decision-feedback-modal {
    max-width: 100%;
  }
}
</style>
