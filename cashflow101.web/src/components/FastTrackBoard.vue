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
 * Grid 布局（20 个格子）：
 * - 上边（第1行）：格子 0-5，grid-column 1 到 6，从左到右
 * - 右边（第7列）：格子 6-8，grid-row 2 到 4，从上到下
 * - 下边（第7行）：格子 9-14，grid-column 7 到 2，从右到左
 * - 左边（第1列）：格子 15-19，grid-row 6 到 2，从下到上
 */
function getCellGridArea(index: number): { row: number; col: number } {
  if (index >= 0 && index <= 5) {
    // 上边：row=1, col=index+1 (1~6)
    return { row: 1, col: index + 1 }
  } else if (index >= 6 && index <= 8) {
    // 右边：row=index-4 (2~4), col=7
    return { row: index - 4, col: 7 }
  } else if (index >= 9 && index <= 14) {
    // 下边：row=7, col=16-index (9→7, 10→6, 11→5, 12→4, 13→3, 14→2)
    return { row: 7, col: 16 - index }
  } else {
    // 左边：row=22-index (15→7, 16→6, 17→5, 18→4, 19→3), col=1
    return { row: 22 - index, col: 1 }
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
            'ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-105':
              currentPosition === cell.index,
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

      <!-- 中心信息区：grid-column 2 / span 5, grid-row 2 / span 5 -->
      <div
        class="center-info flex items-center justify-center rounded-3xl border border-border bg-background/60 backdrop-blur-md shadow-inner"
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
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 5x5 CSS Grid 棋盘容器 */
.board-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 3px;
  aspect-ratio: 1;
  width: 100%;
  max-width: min(75vh, 100%);
  max-height: 100%;
}

@media (min-width: 640px) {
  .board-grid {
    gap: 5px;
    max-width: min(70vh, 620px);
  }
}

/* 棋盘格子 */
.board-cell {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 2px;
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

/* 中心信息区：占据 2-4 行、2-4 列（共 3x3） */
.center-info {
  grid-column: 2 / span 5;
  grid-row: 2 / span 5;
  overflow: hidden;
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
