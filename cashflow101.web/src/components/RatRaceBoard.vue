<script setup lang="ts">
import { computed } from 'vue'
import { RAT_RACE_CELLS } from '@/data/board'
import { STORY_CATEGORY_COLORS } from '@/data/storyCards'
import type { Player } from '@/types/game'
import type { MarketEventCard, OpportunityCard, StoryCard } from '@/types/game'
import DiceRoller from './DiceRoller.vue'

interface Props {
  players: Player[]
  currentPosition: number
  lastRoll: number
  turnNumber: number
  currentPlayerName: string
  isRolling?: boolean
  diceValues?: number[]
  showCard?: boolean
  cardType?: 'opportunity' | 'market' | 'story' | null
  cardData?: OpportunityCard | MarketEventCard | StoryCard | null
}

const props = withDefaults(defineProps<Props>(), {
  isRolling: false,
  diceValues: () => [],
  showCard: false,
  cardType: null,
  cardData: null,
})

const cellColorClass: Record<string, string> = {
  green: 'bg-success',
  red: 'bg-destructive',
  gold: 'bg-yellow-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-primary',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
}

// 格子名称缩写映射（移动端使用）
const cellShortName: Record<string, string> = {
  机会: '机',
  生活意外: '意',
  慈善: '慈',
  发工资: '工资',
  市场风云: '市场',
  孩子: '孩',
  裁员: '裁',
  历史故事: '史',
}

/**
 * 获取格子在 7x7 Grid 中的行列位置（1-based，与 CSS grid 一致）
 *
 * Grid 布局：
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
    const pos = p.ratRacePosition
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
  return currentPlayer?.cashFlow ?? 0
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

// 卡片相关计算属性
const opportunityCardData = computed<OpportunityCard | null>(() => {
  if (props.cardType === 'opportunity' && props.cardData) {
    return props.cardData as OpportunityCard
  }
  return null
})

const marketCardData = computed<MarketEventCard | null>(() => {
  if (props.cardType === 'market' && props.cardData) {
    return props.cardData as MarketEventCard
  }
  return null
})

const storyCardData = computed<StoryCard | null>(() => {
  if (props.cardType === 'story' && props.cardData) {
    return props.cardData as StoryCard
  }
  return null
})

const cardTypeLabel = computed(() => {
  if (props.cardType === 'opportunity' && opportunityCardData.value) {
    return opportunityCardData.value.size === 'big' ? '大机会' : '小机会'
  }
  if (props.cardType === 'market') {
    return '市场风云'
  }
  if (props.cardType === 'story' && storyCardData.value) {
    const cat = STORY_CATEGORY_COLORS[storyCardData.value.category]
    return cat?.label ?? '历史故事'
  }
  return ''
})

const cardTypeAccentClass = computed(() => {
  if (props.cardType === 'opportunity') {
    return opportunityCardData.value?.size === 'big' ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'
  }
  if (props.cardType === 'market') {
    return 'from-blue-500 to-indigo-500'
  }
  if (props.cardType === 'story' && storyCardData.value) {
    const cat = STORY_CATEGORY_COLORS[storyCardData.value.category]
    return cat?.gradient ?? 'from-amber-600 to-yellow-500'
  }
  return ''
})
</script>

<template>
  <div class="rat-race-board">
    <!-- 棋盘容器：7x7 CSS Grid，始终保持正方形 -->
    <div class="board-grid">
      <!-- 格子 -->
      <div
        v-for="cell in RAT_RACE_CELLS"
        :key="cell.index"
        class="board-cell flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 backdrop-blur-sm shadow-sm transition-all"
        :class="{
          'ring-2 ring-primary ring-offset-2 ring-offset-background z-10': currentPosition === cell.index,
        }"
        :style="getCellStyle(cell.index)"
      >
        <div class="cell-color-bar rounded-full" :class="cellColorClass[cell.color]" />
        <div class="cell-name font-semibold leading-tight">
          <!-- 桌面端：全名 -->
          <span class="hidden sm:inline">{{ cell.name }}</span>
          <!-- 移动端：缩写名 -->
          <span class="sm:hidden">{{ cellShortName[cell.name] ?? cell.name }}</span>
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
      <div class="center-info flex items-center justify-center rounded-3xl border border-border bg-background/60 backdrop-blur-md shadow-inner">
        <!-- 骰子动画 -->
        <Transition name="center-fade" mode="out-in">
          <div v-if="isRolling" key="dice" class="flex items-center justify-center">
            <DiceRoller
              :show="isRolling"
              :values="diceValues"
              :count="2"
              inline
              size="md"
            />
          </div>

          <!-- 卡片显示（机会卡 / 市场卡） -->
          <div v-else-if="showCard && cardData" key="card" class="card-display">
            <div class="card-inner" :class="cardType">
              <!-- 卡片顶部装饰条 -->
              <div class="card-top-bar bg-gradient-to-r" :class="cardTypeAccentClass" />

              <!-- 卡片类型标签 -->
              <div class="card-type-tag">
                <span class="tag-text bg-gradient-to-r" :class="cardTypeAccentClass">
                  {{ cardTypeLabel }}
                </span>
              </div>

              <!-- 机会卡内容 -->
              <template v-if="cardType === 'opportunity' && opportunityCardData">
                <div class="card-subtitle">
                  {{ opportunityCardData.type }}
                  <span v-if="opportunityCardData.action === 'sell'" class="text-destructive">· 卖出</span>
                  <span v-else-if="opportunityCardData.action === 'buy'" class="text-success">· 买入</span>
                </div>
                <h3 class="card-title">{{ opportunityCardData.title }}</h3>
                <p class="card-desc">{{ opportunityCardData.description }}</p>
                <div class="card-stats">
                  <div class="stat-item">
                    <div class="stat-label">价格</div>
                    <div class="stat-value">{{ formatMoney(opportunityCardData.cost) }}</div>
                  </div>
                  <div v-if="opportunityCardData.cashFlow > 0" class="stat-item">
                    <div class="stat-label">月现金流</div>
                    <div class="stat-value text-success">+{{ formatMoney(opportunityCardData.cashFlow) }}</div>
                  </div>
                  <div v-if="opportunityCardData.symbol" class="stat-item">
                    <div class="stat-label">代码</div>
                    <div class="stat-value font-mono">{{ opportunityCardData.symbol }}</div>
                  </div>
                </div>
              </template>

              <!-- 市场卡内容 -->
              <template v-else-if="cardType === 'market' && marketCardData">
                <div class="card-subtitle">
                  {{ marketCardData.targetType === 'stock' ? '股票' : marketCardData.targetType === 'real_estate' ? '房地产' : marketCardData.targetType === 'business' ? '企业' : '综合' }}
                  <span v-if="marketCardData.targetSymbol" class="font-mono">· {{ marketCardData.targetSymbol }}</span>
                </div>
                <h3 class="card-title">{{ marketCardData.title }}</h3>
                <p class="card-desc">{{ marketCardData.description }}</p>
                <div class="card-stats">
                  <div v-if="marketCardData.fixedPrice !== undefined" class="stat-item">
                    <div class="stat-label">定价</div>
                    <div class="stat-value">{{ formatMoney(marketCardData.fixedPrice) }}</div>
                  </div>
                  <div v-else class="stat-item">
                    <div class="stat-label">价格倍率</div>
                    <div class="stat-value" :class="marketCardData.multiplier >= 1 ? 'text-success' : 'text-destructive'">
                      ×{{ marketCardData.multiplier }}
                    </div>
                  </div>
                </div>
              </template>

              <!-- 故事卡内容 -->
              <template v-else-if="cardType === 'story' && storyCardData">
                <div class="card-subtitle">
                  历史故事 · {{ storyCardData.effect.type === 'cash' ? (storyCardData.effect.amount ?? 0 >= 0 ? '收益' : '损失') : '被动收入' }}
                </div>
                <h3 class="card-title">{{ storyCardData.title }}</h3>
                <p class="card-desc">{{ storyCardData.story }}</p>
                <div class="card-stats">
                  <div class="stat-item">
                    <div class="stat-label">效果</div>
                    <div
                      class="stat-value"
                      :class="(storyCardData.effect.amount ?? 0) >= 0 ? 'text-success' : 'text-destructive'"
                    >
                      {{ storyCardData.effect.description }}
                    </div>
                  </div>
                </div>
                <!-- 历史小知识 -->
                <div class="card-historical-note">
                  <span class="note-label">历史小知识</span>
                  <p class="note-text">{{ storyCardData.historicalNote }}</p>
                </div>
              </template>

              <!-- 卡片底部装饰 -->
              <div class="card-bottom-bar" />
            </div>
          </div>

          <!-- 回合信息 -->
          <div v-else key="info" class="flex w-full flex-col items-center justify-center p-2 text-center sm:p-5">
            <div class="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
              原始资本积累 · 第 {{ turnNumber }} 回合
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
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rat-race-board {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 7x7 CSS Grid 棋盘容器 */
.board-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 4px;
  aspect-ratio: 1;
  width: 100%;
  max-width: min(75vh, 100%);
  max-height: 100%;
}

@media (min-width: 640px) {
  .board-grid {
    gap: 6px;
    max-width: min(70vh, 640px);
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

/* 中心信息区：占据 2-6 行、2-6 列（共 5x5） */
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
  padding: 10px 10px 12px;
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
    padding: 16px 18px 20px;
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
  margin-bottom: 4px;
}

@media (min-width: 640px) {
  .card-type-tag {
    margin-top: 4px;
    margin-bottom: 8px;
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

/* 卡片副标题（类型 + 动作） */
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
  font-size: 12px;
  font-weight: 800;
  color: hsl(var(--foreground));
  margin: 0 0 4px;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

@media (min-width: 640px) {
  .card-title {
    font-size: 18px;
    margin: 0 0 8px;
  }
}

/* 卡片描述 */
.card-desc {
  font-size: 8px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  margin: 0 0 6px;
  padding: 0 2px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (min-width: 640px) {
  .card-desc {
    font-size: 12px;
    margin: 0 0 12px;
    padding: 0 8px;
    -webkit-line-clamp: 4;
  }
}

/* 卡片数据统计 */
.card-stats {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .card-stats {
    gap: 12px;
    padding-top: 8px;
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: hsl(var(--secondary) / 0.5);
  min-width: 50px;
}

@media (min-width: 640px) {
  .stat-item {
    padding: 6px 14px;
    border-radius: 12px;
    min-width: 70px;
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
  font-size: 10px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

@media (min-width: 640px) {
  .stat-value {
    font-size: 14px;
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

/* 历史小知识区域 */
.card-historical-note {
  margin-top: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: hsl(var(--secondary) / 0.4);
  border: 1px dashed hsl(var(--border));
  text-align: left;
}

@media (min-width: 640px) {
  .card-historical-note {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 10px;
  }
}

.note-label {
  display: inline-block;
  font-size: 7px;
  font-weight: 700;
  color: hsl(var(--primary));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

@media (min-width: 640px) {
  .note-label {
    font-size: 10px;
    margin-bottom: 4px;
  }
}

.note-text {
  font-size: 7px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (min-width: 640px) {
  .note-text {
    font-size: 11px;
    -webkit-line-clamp: 4;
  }
}
</style>
