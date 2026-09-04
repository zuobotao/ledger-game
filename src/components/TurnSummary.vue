<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { Dices, MapPin, TrendingUp, Wallet, Gem, ArrowRight, ChevronRight } from 'lucide-vue-next'
import type { FinancialDelta } from '@/engine/contract'

const store = useGameStore()

const isOpen = computed(() => store.showTurnSummary)
const turnInfo = computed(() => store.turnInfo)
const delta = computed(() => store.getTurnDelta())
const player = computed(() => store.currentPlayer)

const cellTypeLabel: Record<string, string> = {
  payday: '发薪日',
  opportunity: '投资机会',
  small_opportunity: '小机会',
  big_opportunity: '大机会',
  market: '市场风云',
  doodad: '生活支出',
  charity: '慈善',
  unemployment: '失业',
  baby: '生孩子',
  lawsuit: '官司',
  divorce: '离婚',
  downsize: '裁员',
  fast_track_entry: '快车道入口',
  business: '企业机会',
  real_estate: '房地产',
  stock: '股票',
}

function getCellLabel(type: string): string {
  return cellTypeLabel[type] || type
}

interface DeltaMetric {
  key: keyof FinancialDelta
  label: string
  show: boolean
}

const deltaMetrics: DeltaMetric[] = [
  { key: 'cash', label: '现金', show: true },
  { key: 'passiveIncome', label: '被动收入', show: true },
  { key: 'cashFlow', label: '月现金流', show: true },
  { key: 'assets', label: '总资产', show: true },
  { key: 'liabilities', label: '总负债', show: true },
  { key: 'netWorth', label: '净资产', show: true },
]

const visibleDeltaMetrics = computed(() => {
  if (!delta.value) return []
  return deltaMetrics.filter((m) => Math.abs(delta.value![m.key]) > 0.01)
})

function fmt(val: number): string {
  const abs = Math.abs(val)
  const sign = val > 0 ? '+' : val < 0 ? '-' : ''
  return `${sign}$${abs.toLocaleString()}`
}

function isPositive(val: number): boolean {
  return val > 0.01
}

function isNegative(val: number): boolean {
  return val < -0.01
}

const hasNoChanges = computed(() => {
  if (!delta.value) return true
  return Math.abs(delta.value.cash) < 0.01
    && Math.abs(delta.value.passiveIncome) < 0.01
    && Math.abs(delta.value.assets) < 0.01
    && Math.abs(delta.value.liabilities) < 0.01
    && Math.abs(delta.value.netWorth) < 0.01
    && turnInfo.value.actions.length === 0
})

function handleContinue() {
  store.confirmEndTurn()
}

function calcNetWorth(): number {
  if (!player.value) return 0
  const assets = player.value.cash + player.value.savings
  const assetsVal = player.value.assets.reduce((s, a) => {
    const price = a.marketPrice ?? a.cost
    return s + price * a.quantity
  }, 0)
  const liabilities = player.value.liabilities.reduce((s, l) => s + l.amount, 0)
  return assets + assetsVal - liabilities
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="turn-summary-overlay" @click.self="handleContinue">
        <div class="turn-summary-modal">
          <!-- 头部 -->
          <div class="summary-header">
            <div class="header-icon">
              <Dices class="w-5 h-5" />
            </div>
            <div class="header-text">
              <h3 class="title">本回合总结</h3>
              <p class="subtitle">第 {{ store.turnNumber }} 回合 · {{ player?.name }}</p>
            </div>
          </div>

          <!-- 掷骰 + 落点 -->
          <div class="turn-basics">
            <div class="basic-item">
              <div class="basic-icon dice">
                <Dices class="w-4 h-4" />
              </div>
              <div class="basic-content">
                <span class="basic-label">掷出</span>
                <span class="basic-value">
                  {{ turnInfo.diceValues.join(' + ') }} = {{ turnInfo.diceRoll }} 点
                </span>
              </div>
            </div>

            <div class="basic-item">
              <div class="basic-icon cell">
                <MapPin class="w-4 h-4" />
              </div>
              <div class="basic-content">
                <span class="basic-label">落点</span>
                <span class="basic-value">{{ getCellLabel(turnInfo.cellType) }}</span>
              </div>
            </div>
          </div>

          <!-- 本回合动作 -->
          <div v-if="turnInfo.actions.length > 0" class="actions-section">
            <h4 class="section-title">
              <ArrowRight class="w-3.5 h-3.5 text-primary" />
              本回合操作
            </h4>
            <div class="actions-list">
              <div
                v-for="(action, idx) in turnInfo.actions"
                :key="idx"
                class="action-item"
              >
                <ChevronRight class="w-3.5 h-3.5 text-muted-foreground" />
                <span>{{ action.description }}</span>
              </div>
            </div>
          </div>

          <!-- 财务变化 -->
          <div v-if="!hasNoChanges && delta" class="delta-section">
            <h4 class="section-title">
              <TrendingUp class="w-3.5 h-3.5 text-primary" />
              财务变化
            </h4>

            <div v-if="visibleDeltaMetrics.length > 0" class="delta-grid">
              <div
                v-for="metric in visibleDeltaMetrics"
                :key="metric.key"
                class="delta-item"
                :class="{
                  'delta-positive': isPositive(delta![metric.key]),
                  'delta-negative': isNegative(delta![metric.key]),
                }"
              >
                <span class="delta-label">{{ metric.label }}</span>
                <span class="delta-value">{{ fmt(delta![metric.key]) }}</span>
              </div>
            </div>

            <div v-else class="no-change">
              本回合财务状况无变化
            </div>
          </div>

          <!-- 无变化提示 -->
          <div v-if="hasNoChanges" class="no-change-section">
            <p class="no-change-text">
              本回合没有发生财务变化。
            </p>
            <p class="no-change-hint">
              继续前进，寻找能产生被动收入的资产机会吧！
            </p>
          </div>

          <!-- 当前状态 -->
          <div class="current-status">
            <h4 class="section-title">
              <Gem class="w-3.5 h-3.5 text-primary" />
              当前状态
            </h4>
            <div class="status-grid">
              <div class="status-item">
                <div class="status-icon cash">
                  <Wallet class="w-3.5 h-3.5" />
                </div>
                <div class="status-content">
                  <span class="status-label">现金</span>
                  <span class="status-value">${{ player?.cash.toLocaleString() }}</span>
                </div>
              </div>
              <div class="status-item">
                <div class="status-icon" :class="player && player.cashFlow >= 0 ? 'cashflow' : 'cashflow-negative'">
                  <TrendingUp class="w-3.5 h-3.5" :class="{ 'rotate-180': player && player.cashFlow < 0 }" />
                </div>
                <div class="status-content">
                  <span class="status-label">月现金流</span>
                  <span class="status-value" :class="player && player.cashFlow >= 0 ? 'cashflow' : 'cashflow-negative'">
                    {{ player && player.cashFlow >= 0 ? '+' : '' }}${{ player?.cashFlow.toLocaleString() }}
                  </span>
                </div>
              </div>
              <div class="status-item">
                <div class="status-icon" :class="calcNetWorth() >= 0 ? 'networth' : 'networth-negative'">
                  <Gem class="w-3.5 h-3.5" />
                </div>
                <div class="status-content">
                  <span class="status-label">净资产</span>
                  <span class="status-value" :class="calcNetWorth() >= 0 ? 'networth' : 'networth-negative'">
                    ${{ calcNetWorth().toLocaleString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 继续按钮 -->
          <div class="summary-footer">
            <button class="continue-btn" @click="handleContinue">
              下一回合
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.turn-summary-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.turn-summary-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--card, hsl(240 10% 3.9%));
  border: 1px solid var(--border, hsl(240 3.7% 15.9%));
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* Header */
.summary-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border, hsl(240 3.7% 15.9%));
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(263 70% 50%), hsl(263 70% 35%));
  color: white;
  flex-shrink: 0;
}

.header-text .title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--foreground, hsl(0 0% 98%));
}

.header-text .subtitle {
  font-size: 0.85rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
  margin: 0.15rem 0 0 0;
}

/* Basics */
.turn-basics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.basic-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.75rem;
}

.basic-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.basic-icon.dice {
  background: hsl(263 70% 25%);
  color: hsl(263 90% 75%);
}

.basic-icon.cell {
  background: hsl(200 70% 25%);
  color: hsl(200 90% 70%);
}

.basic-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.basic-label {
  font-size: 0.75rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
}

.basic-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--foreground, hsl(0 0% 98%));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Section title */
.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--foreground, hsl(0 0% 98%));
  margin: 0 0 0.75rem 0;
}

/* Actions */
.actions-section {
  margin-bottom: 1.25rem;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--foreground, hsl(0 0% 98%));
}

/* Delta */
.delta-section {
  margin-bottom: 1.25rem;
}

.delta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.delta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.5rem;
  border-left: 3px solid transparent;
}

.delta-item.delta-positive {
  border-left-color: hsl(145 63% 45%);
}

.delta-item.delta-negative {
  border-left-color: hsl(0 72% 51%);
}

.delta-label {
  font-size: 0.8rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
}

.delta-value {
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.delta-positive .delta-value {
  color: hsl(145 63% 55%);
}

.delta-negative .delta-value {
  color: hsl(0 72% 60%);
}

.no-change {
  padding: 0.75rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
}

/* No change section */
.no-change-section {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.75rem;
  text-align: center;
}

.no-change-text {
  font-size: 0.9rem;
  color: var(--foreground, hsl(0 0% 98%));
  margin: 0 0 0.4rem 0;
}

.no-change-hint {
  font-size: 0.8rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
  margin: 0;
}

/* Current status */
.current-status {
  margin-bottom: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border, hsl(240 3.7% 15.9%));
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem 0.5rem;
  background: var(--muted, hsl(240 4.8% 95.9%));
  border-radius: 0.625rem;
  text-align: center;
}

.status-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.cash {
  background: hsl(48 96% 25%);
  color: hsl(48 96% 65%);
}

.status-icon.cashflow {
  background: hsl(145 63% 25%);
  color: hsl(145 63% 60%);
}

.status-icon.cashflow-negative {
  background: hsl(0 72% 25%);
  color: hsl(0 72% 60%);
}

.status-icon.networth {
  background: hsl(263 70% 25%);
  color: hsl(263 90% 70%);
}

.status-icon.networth-negative {
  background: hsl(0 72% 25%);
  color: hsl(0 72% 60%);
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
}

.status-label {
  font-size: 0.7rem;
  color: var(--muted-foreground, hsl(240 5% 64.9%));
}

.status-value {
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--foreground, hsl(0 0% 98%));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-value.cashflow {
  color: hsl(145 63% 55%);
}

.status-value.cashflow-negative {
  color: hsl(0 72% 60%);
}

.status-value.networth {
  color: hsl(263 90% 70%);
}

.status-value.networth-negative {
  color: hsl(0 72% 60%);
}

/* Footer */
.summary-footer {
  padding-top: 0.5rem;
}

.continue-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, hsl(263 70% 55%), hsl(263 70% 45%));
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.continue-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.continue-btn:active {
  transform: translateY(0);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .turn-summary-modal,
.modal-leave-to .turn-summary-modal {
  transform: scale(0.95) translateY(10px);
}
</style>
