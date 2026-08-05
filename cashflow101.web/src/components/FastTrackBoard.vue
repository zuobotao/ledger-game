<script setup lang="ts">
import { computed } from 'vue'
import { Banknote, Gem, Heart, LineChart, RotateCcw, ShoppingBag, Target, TrendingUp, Zap } from 'lucide-vue-next'
import { FAST_TRACK_CELLS } from '@/data/board'
import type { Dream, FastTrackCellType, Player } from '@/types/game'
import type { OpportunityCard } from '@/types/game'
import DiceRoller from './DiceRoller.vue'

interface Props {
  players: Player[]
  currentPosition: number
  lastRoll: number
  turnNumber: number
  currentPlayerName: string
  isRolling?: boolean
  diceValues?: number[]
  dream?: Dream | null
  showOpportunity?: boolean
  opportunityCard?: OpportunityCard | null
}

const props = withDefaults(defineProps<Props>(), {
  isRolling: false,
  diceValues: () => [],
  showOpportunity: false,
})

const currentDream = computed(() => props.dream as Dream | null)

const emit = defineEmits<{
  (e: 'diceDone'): void
}>()

// 格子类型对应的图标组件
const cellIconMap: Record<FastTrackCellType, typeof Banknote> = {
  cashflow: Banknote,
  opportunity: Gem,
  investment: TrendingUp,
  doodad: RotateCcw,
  dream: Target,
  market: LineChart,
  charity: Heart,
  deal: Zap,
  stock: ShoppingBag,
}

// 格子类型对应的背景色 class
const cellBgClassMap: Record<FastTrackCellType, string> = {
  cashflow: 'bg-success/15 border-success/40 text-success',
  opportunity: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  investment: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
  doodad: 'bg-destructive/15 border-destructive/40 text-destructive',
  dream: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  market: 'bg-primary/15 border-primary/40 text-primary',
  charity: 'bg-pink-500/15 border-pink-500/40 text-pink-400',
  deal: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400',
  stock: 'bg-teal-500/15 border-teal-500/40 text-teal-400',
}

// 格子类型对应的颜色条 class
const cellColorBarClass: Record<FastTrackCellType, string> = {
  cashflow: 'bg-success',
  opportunity: 'bg-amber-500',
  investment: 'bg-purple-500',
  doodad: 'bg-destructive',
  dream: 'bg-yellow-400',
  market: 'bg-primary',
  charity: 'bg-pink-500',
  deal: 'bg-indigo-500',
  stock: 'bg-teal-500',
}

/**
 * 获取格子在 7x7 Grid 中的行列位置（1-based，与 CSS grid 一致）
 *
 * Grid 布局（24 格，与原始资本积累棋盘一致）：
 * - 上边（第1行）：格子 0-6，grid-column 1 到 7，从左到右
 * - 右边（第7列）：格子 7-11，grid-row 2 到 6，从上到下（不含角）
 * - 下边（第7行）：格子 12-18，grid-column 7 到 1，从右到左
 * - 左边（第1列）：格子 19-23，grid-row 6 到 2，从下到上（不含角）
 */
function getCellGridArea(index: number): { row: number; col: number } {
  if (index >= 0 && index <= 6) {
    // 上边：row=1, col=index+1 (1~7)
    return { row: 1, col: index + 1 }
  } else if (index >= 7 && index <= 11) {
    // 右边：row=index-5 (2~6), col=7
    return { row: index - 5, col: 7 }
  } else if (index >= 12 && index <= 18) {
    // 下边：row=7, col=19-index (12→7, 13→6, ..., 18→1)
    return { row: 7, col: 19 - index }
  } else {
    // 左边：row=25-index (19→6, 20→5, ..., 23→2), col=1
    return { row: 25 - index, col: 1 }
  }
}

// 获取格子的样式绑定对象
function getCellStyle(index: number): Record<string, string> {
  const { row, col } = getCellGridArea(index)
  return {
    gridRow: String(row),
    gridColumn: String(col),
  }
}

// 玩家在某个格子上
const playersOnCell = computed(() => {
  const map: Record<number, Player[]> = {}
  for (const p of props.players) {
    const pos = p.fastTrackPosition
    if (!map[pos]) map[pos] = []
    map[pos].push(p)
  }
  return map
})

const currentPlayerCash = computed(() => {
  const currentPlayer = props.players.find((p) => p.name === props.currentPlayerName)
  return currentPlayer?.cash ?? 0
})

const currentPlayerCashFlow = computed(() => {
  const currentPlayer = props.players.find((p) => p.name === props.currentPlayerName)
  // 快车道的现金流放大 100 倍
  return (currentPlayer?.cashFlow ?? 0) * 100
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

// 机会卡渐变条 class
const opportunityAccentClass = computed(() => {
  if (!props.opportunityCard) return ''
  return props.opportunityCard.size === 'big'
    ? 'from-amber-500 to-orange-500'
    : 'from-emerald-500 to-teal-500'
})
</script>

<template>
  <div class="fast-track-board">
    <!-- 棋盘容器：5x5 CSS Grid，始终保持正方形 -->
    <div class="board-grid">
      <!-- 格子 -->
      <div
        v-for="cell in FAST_TRACK_CELLS"
        :key="cell.index"
        class="board-cell flex flex-col items-center justify-center rounded-xl border bg-secondary/60 backdrop-blur-sm shadow-sm transition-all"
        :class="[
          cellBgClassMap[cell.type],
          {
            'cell-active z-10': currentPosition === cell.index,
          },
        ]"
        :style="getCellStyle(cell.index)"
      >
        <div class="cell-color-bar rounded-full" :class="cellColorBarClass[cell.type]" />
        <component :is="cellIconMap[cell.type]" class="cell-icon" />
        <div class="cell-name font-semibold leading-tight">
          {{ cell.name }}
        </div>
        <!-- 玩家棋子 -->
        <div v-if="playersOnCell[cell.index]?.length" class="cell-players flex">
          <div
            v-for="p in playersOnCell[cell.index]"
            :key="p.id"
            class="player-token rounded-full border border-background ring-1 ring-white/20"
            :style="{ backgroundColor: p.color }"
            :title="p.name"
          />
        </div>
      </div>

      <!-- 装饰格：顶部玩家进度（第 2 行，列 2-6） -->
      <div class="decor-row top-row" style="grid-row: 2; grid-column: 2 / span 5;">
        <div
          v-for="p in players"
          :key="p.id"
          class="player-badge"
          :class="{ 'active': p.name === currentPlayerName }"
          :style="{ '--player-color': p.color }"
        >
          <div class="player-dot" :style="{ backgroundColor: p.color }" />
          <span class="player-pos">
            {{ p.fastTrackPosition ?? 0 }}
          </span>
        </div>
      </div>

      <!-- 装饰格：底部资产类别（第 6 行，列 2-6） -->
      <div class="decor-row bottom-row" style="grid-row: 6; grid-column: 2 / span 5;">
        <div class="asset-chip">
          <Banknote class="chip-icon text-success" />
        </div>
        <div class="asset-chip">
          <ShoppingBag class="chip-icon text-teal-400" />
        </div>
        <div class="asset-chip">
          <TrendingUp class="chip-icon text-purple-400" />
        </div>
        <div class="asset-chip">
          <Gem class="chip-icon text-amber-400" />
        </div>
        <div class="asset-chip">
          <Zap class="chip-icon text-indigo-400" />
        </div>
      </div>

      <!-- 装饰格：左侧数据列（第 3-5 行，列 2） -->
      <div class="decor-col left-col" style="grid-row: 3 / span 3; grid-column: 2;">
        <div class="side-stat">
          <div class="side-stat-label">现金</div>
          <div class="side-stat-value text-foreground">{{ formatMoney(currentPlayerCash) }}</div>
        </div>
        <div class="side-stat">
          <div class="side-stat-label">月现金流</div>
          <div class="side-stat-value text-success">{{ formatMoney(currentPlayerCashFlow) }}</div>
        </div>
        <div class="side-stat">
          <div class="side-stat-label">回合</div>
          <div class="side-stat-value text-primary">{{ turnNumber }}</div>
        </div>
      </div>

      <!-- 装饰格：右侧梦想进度（第 3-5 行，列 6） -->
      <div class="decor-col right-col" style="grid-row: 3 / span 3; grid-column: 6;">
        <template v-if="currentDream">
          <div class="dream-side-card">
            <div class="dream-side-icon">
              <Target class="h-5 w-5 text-amber-400" />
            </div>
            <div class="dream-side-name text-amber-300">{{ currentDream.name }}</div>
            <div class="dream-side-price text-amber-400 font-bold">{{ formatMoney(currentDream.price) }}</div>
          </div>
        </template>
        <template v-else>
          <div class="dream-side-card empty">
            <Target class="h-6 w-6 text-muted-foreground/40" />
            <span class="text-[10px] text-muted-foreground/50">梦想待选</span>
          </div>
        </template>
      </div>

      <!-- 中心信息区：grid-column 3 / span 3, grid-row 3 / span 3 -->
      <div
        class="center-info flex items-center justify-center rounded-2xl border border-border bg-background/60 backdrop-blur-md shadow-inner"
      >
        <!-- 骰子动画 -->
        <Transition name="center-fade" mode="out-in">
          <div v-if="isRolling" key="dice" class="flex items-center justify-center">
            <DiceRoller
              :show="isRolling"
              :values="diceValues"
              :count="2"
              inline
              size="md"
              @done="emit('diceDone')"
            />
          </div>

          <!-- 机会卡显示 -->
          <div
            v-else-if="showOpportunity && opportunityCard"
            key="opportunity"
            class="card-display"
          >
            <div class="card-inner">
              <!-- 卡片顶部装饰条 -->
              <div class="card-top-bar bg-gradient-to-r" :class="opportunityAccentClass" />

              <!-- 卡片类型标签 -->
              <div class="card-type-tag">
                <span class="tag-text bg-gradient-to-r" :class="opportunityAccentClass">
                  {{ opportunityCard.size === 'big' ? '大机会' : '小机会' }}
                </span>
              </div>

              <div class="card-subtitle">
                {{ opportunityCard.type }}
                <span
                  v-if="opportunityCard.action === 'sell'"
                  class="text-destructive"
                >
                  · 卖出
                </span>
                <span
                  v-else-if="opportunityCard.action === 'buy'"
                  class="text-success"
                >
                  · 买入
                </span>
              </div>
              <h3 class="card-title">{{ opportunityCard.title }}</h3>
              <p class="card-desc">{{ opportunityCard.description }}</p>
              <div class="card-stats">
                <div class="stat-item">
                  <div class="stat-label">价格</div>
                  <div class="stat-value">{{ formatMoney(opportunityCard.cost) }}</div>
                </div>
                <div v-if="opportunityCard.cashFlow > 0" class="stat-item">
                  <div class="stat-label">月现金流</div>
                  <div class="stat-value text-success">
                    +{{ formatMoney(opportunityCard.cashFlow) }}
                  </div>
                </div>
                <div v-if="opportunityCard.symbol" class="stat-item">
                  <div class="stat-label">代码</div>
                  <div class="stat-value font-mono">{{ opportunityCard.symbol }}</div>
                </div>
              </div>

              <!-- 卡片底部装饰 -->
              <div class="card-bottom-bar" />
            </div>
          </div>

          <!-- 梦想卡片 -->
          <div v-else-if="currentDream" key="dream" class="dream-display">
            <div class="dream-inner">
              <div class="dream-top-bar bg-gradient-to-r from-amber-500 to-yellow-500" />
              <div class="dream-type-tag">
                <span class="tag-text bg-gradient-to-r from-amber-500 to-yellow-500">
                  梦想
                </span>
              </div>
              <div class="dream-icon-wrap">
                <Target class="dream-icon" />
              </div>
              <h3 class="dream-title">{{ currentDream?.name }}</h3>
              <p class="dream-desc">{{ currentDream?.description }}</p>
              <div class="dream-price">
                <div class="stat-label">目标价格</div>
                <div class="stat-value text-amber-400 font-bold">
                  {{ formatMoney(currentDream?.price ?? 0) }}
                </div>
              </div>
              <div class="dream-bottom-bar" />
            </div>
          </div>

          <!-- 回合信息（默认） -->
          <div v-else key="info" class="flex w-full flex-col items-center justify-center p-2 text-center sm:p-5">
            <div class="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
              资本游戏 · 第 {{ turnNumber }} 回合
            </div>
            <div class="mt-1 text-sm font-bold sm:mt-3 sm:text-2xl">
              {{ currentPlayerName }}
            </div>

            <!-- 骰子点数 -->
            <div
              v-if="lastRoll > 0"
              class="mt-1 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary sm:mt-3 sm:gap-1 sm:px-3 sm:py-1 sm:text-base"
            >
              🎲 {{ lastRoll }}
            </div>

            <!-- 核心数据 -->
            <div class="mt-2 grid w-full grid-cols-2 gap-1 text-[9px] sm:mt-4 sm:gap-3 sm:text-xs">
              <div class="rounded-xl bg-secondary/50 p-1 sm:p-2">
                <div class="text-muted-foreground">现金</div>
                <div class="font-semibold text-foreground">{{ formatMoney(currentPlayerCash) }}</div>
              </div>
              <div class="rounded-xl bg-secondary/50 p-1 sm:p-2">
                <div class="text-muted-foreground">月现金流</div>
                <div class="font-semibold text-success">{{ formatMoney(currentPlayerCashFlow) }}</div>
              </div>
            </div>

            <!-- 当前梦想 -->
            <div
              v-if="props.dream"
              class="mt-2 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-1.5 text-[9px] sm:mt-3 sm:p-2 sm:text-xs"
            >
              <div class="flex items-center justify-center gap-1 text-amber-400">
                <Target class="h-3 w-3 sm:h-4 sm:w-4" />
                <span class="font-semibold">{{ props.dream?.name }}</span>
              </div>
              <div class="mt-0.5 text-amber-300/80">
                目标：{{ formatMoney(props.dream?.price ?? 0) }}
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fast-track-board {
  aspect-ratio: 1;
  width: auto;
  height: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}

/* 7x7 CSS Grid 棋盘容器 */
.board-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 3px;
  width: 100%;
  height: 100%;
}

@media (min-width: 640px) {
  .board-grid {
    gap: 6px;
  }
}

/* 棋盘格子 */
.board-cell {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 2px;
  position: relative;
}

/* 当前位置高亮：用伪元素实现，不影响布局 */
.cell-active::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  box-shadow:
    0 0 0 2px hsl(var(--primary)),
    0 0 12px 2px hsl(var(--primary) / 0.5);
  pointer-events: none;
  z-index: 1;
}

@media (min-width: 640px) {
  .board-cell {
    padding: 4px;
  }
}

/* 颜色条 */
.cell-color-bar {
  height: 3px;
  width: 16px;
}

@media (min-width: 640px) {
  .cell-color-bar {
    height: 4px;
    width: 20px;
  }
}

/* 格子图标 */
.cell-icon {
  width: 16px;
  height: 16px;
  margin-top: 2px;
}

@media (min-width: 640px) {
  .cell-icon {
    width: 22px;
    height: 22px;
    margin-top: 4px;
  }
}

/* 格子名称 */
.cell-name {
  margin-top: 2px;
  font-size: 9px;
}

@media (min-width: 640px) {
  .cell-name {
    margin-top: 2px;
    font-size: 12px;
  }
}

/* 玩家棋子容器 */
.cell-players {
  margin-top: 2px;
}

.cell-players > * + * {
  margin-left: -4px;
}

@media (min-width: 640px) {
  .cell-players {
    margin-top: 2px;
  }

  .cell-players > * + * {
    margin-left: -6px;
  }
}

/* 玩家棋子 */
.player-token {
  width: 10px;
  height: 10px;
}

@media (min-width: 640px) {
  .player-token {
    width: 14px;
    height: 14px;
  }
}

/* 中心信息区：占据 3-5 行、3-5 列（共 3x3） */
.center-info {
  grid-column: 3 / span 3;
  grid-row: 3 / span 3;
  overflow: hidden;
  border-radius: 1rem;
}

/* ===== 装饰格样式 ===== */

/* 顶部/底部装饰行 */
.decor-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px;
  border-radius: 0.75rem;
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
}

@media (min-width: 640px) {
  .decor-row {
    gap: 8px;
    padding: 4px;
    border-radius: 1rem;
  }
}

/* 玩家徽章 */
.player-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-radius: 9999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.player-badge.active {
  border-color: var(--player-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--player-color) 30%, transparent);
}

.player-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}

.player-pos {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-muted-foreground);
}

@media (min-width: 640px) {
  .player-badge {
    padding: 4px 10px;
    gap: 3px;
  }
  .player-dot {
    width: 10px;
    height: 10px;
  }
  .player-pos {
    font-size: 11px;
  }
}

/* 资产图标芯片 */
.asset-chip {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.chip-icon {
  width: 14px;
  height: 14px;
}

@media (min-width: 640px) {
  .asset-chip {
    width: 36px;
    height: 36px;
  }
  .chip-icon {
    width: 18px;
    height: 18px;
  }
}

/* 左右装饰列 */
.decor-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 4px 2px;
  border-radius: 0.75rem;
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
}

@media (min-width: 640px) {
  .decor-col {
    padding: 8px 4px;
    border-radius: 1rem;
  }
}

/* 侧边数据项 */
.side-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
}

.side-stat-label {
  font-size: 8px;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.side-stat-value {
  font-size: 10px;
  font-weight: 700;
}

@media (min-width: 640px) {
  .side-stat-label {
    font-size: 10px;
  }
  .side-stat-value {
    font-size: 13px;
  }
}

/* 右侧梦想卡片 */
.dream-side-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 4px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05));
  border: 1px solid rgba(251, 191, 36, 0.3);
  text-align: center;
  width: 100%;
}

.dream-side-card.empty {
  background: var(--color-background);
  border-color: var(--color-border);
  gap: 4px;
}

.dream-side-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(251, 191, 36, 0.15);
}

.dream-side-name {
  font-size: 9px;
  font-weight: 600;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dream-side-price {
  font-size: 10px;
}

@media (min-width: 640px) {
  .dream-side-card {
    padding: 10px 6px;
    gap: 5px;
    border-radius: 1rem;
  }
  .dream-side-icon {
    width: 32px;
    height: 32px;
  }
  .dream-side-name {
    font-size: 11px;
  }
  .dream-side-price {
    font-size: 12px;
  }
}

/* 中心区域淡入淡出过渡 */
.center-fade-enter-active,
.center-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.center-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.center-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ========== 卡片显示样式 ========== */
.card-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  perspective: 1000px;
}

@media (min-width: 640px) {
  .card-display {
    padding: 8px;
  }
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 8px 10px;
  border-radius: 14px;
  background: linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%);
  border: 1px solid hsl(var(--border));
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  text-align: center;
}

@media (min-width: 640px) {
  .card-inner {
    padding: 14px 16px 18px;
    border-radius: 18px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.2),
      0 2px 6px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
}

/* 卡片顶部渐变条 */
.card-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

@media (min-width: 640px) {
  .card-top-bar {
    height: 4px;
  }
}

/* 卡片类型标签 */
.card-type-tag {
  margin-top: 2px;
  margin-bottom: 3px;
}

@media (min-width: 640px) {
  .card-type-tag {
    margin-top: 4px;
    margin-bottom: 6px;
  }
}

.tag-text {
  display: inline-block;
  padding: 2px 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: white;
  border-radius: 9999px;
  text-transform: uppercase;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .tag-text {
    padding: 3px 14px;
    font-size: 11px;
  }
}

/* 卡片副标题 */
.card-subtitle {
  font-size: 9px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 2px;
  letter-spacing: 0.02em;
}

@media (min-width: 640px) {
  .card-subtitle {
    font-size: 12px;
    margin-bottom: 4px;
  }
}

/* 卡片标题 */
.card-title {
  font-size: 11px;
  font-weight: 800;
  color: hsl(var(--foreground));
  margin: 0 0 3px;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

@media (min-width: 640px) {
  .card-title {
    font-size: 16px;
    margin: 0 0 6px;
  }
}

/* 卡片描述 */
.card-desc {
  font-size: 8px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  margin: 0 0 4px;
  padding: 0 2px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (min-width: 640px) {
  .card-desc {
    font-size: 11px;
    margin: 0 0 8px;
    padding: 0 6px;
    -webkit-line-clamp: 3;
  }
}

/* 卡片数据统计 */
.card-stats {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .card-stats {
    gap: 10px;
    padding-top: 6px;
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 6px;
  border-radius: 8px;
  background: hsl(var(--secondary) / 0.5);
  min-width: 40px;
}

@media (min-width: 640px) {
  .stat-item {
    padding: 5px 12px;
    border-radius: 12px;
    min-width: 60px;
  }
}

.stat-label {
  font-size: 7px;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1px;
}

@media (min-width: 640px) {
  .stat-label {
    font-size: 10px;
    margin-bottom: 2px;
  }
}

.stat-value {
  font-size: 9px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

@media (min-width: 640px) {
  .stat-value {
    font-size: 13px;
  }
}

/* 卡片底部装饰 */
.card-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    hsl(var(--border)) 50%,
    transparent 100%
  );
  border-radius: 2px;
}

/* ========== 梦想卡片样式 ========== */
.dream-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

@media (min-width: 640px) {
  .dream-display {
    padding: 8px;
  }
}

.dream-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 8px 10px;
  border-radius: 14px;
  background: linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%);
  border: 1px solid hsl(var(--border));
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  text-align: center;
}

@media (min-width: 640px) {
  .dream-inner {
    padding: 14px 16px 18px;
    border-radius: 18px;
  }
}

.dream-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

@media (min-width: 640px) {
  .dream-top-bar {
    height: 4px;
  }
}

.dream-type-tag {
  margin-top: 2px;
  margin-bottom: 3px;
}

@media (min-width: 640px) {
  .dream-type-tag {
    margin-top: 4px;
    margin-bottom: 6px;
  }
}

.dream-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 179, 8, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.4);
  margin-bottom: 4px;
}

@media (min-width: 640px) {
  .dream-icon-wrap {
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
  }
}

.dream-icon {
  width: 18px;
  height: 18px;
  color: hsl(45, 93%, 60%);
}

@media (min-width: 640px) {
  .dream-icon {
    width: 28px;
    height: 28px;
  }
}

.dream-title {
  font-size: 12px;
  font-weight: 800;
  color: hsl(var(--foreground));
  margin: 0 0 3px;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .dream-title {
    font-size: 18px;
    margin: 0 0 6px;
  }
}

.dream-desc {
  font-size: 8px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  margin: 0 0 4px;
  padding: 0 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (min-width: 640px) {
  .dream-desc {
    font-size: 11px;
    margin: 0 0 8px;
    padding: 0 6px;
    -webkit-line-clamp: 3;
  }
}

.dream-price {
  margin-top: auto;
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

@media (min-width: 640px) {
  .dream-price {
    padding-top: 8px;
    gap: 2px;
  }
}

.dream-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    hsl(45, 93%, 60%) 50%,
    transparent 100%
  );
  border-radius: 2px;
}
</style>
