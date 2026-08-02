<script setup lang="ts">
import { computed } from 'vue'
import { RAT_RACE_CELLS } from '@/data/board'
import type { Player } from '@/types/game'

interface Props {
  players: Player[]
  currentPosition: number
  lastRoll: number
  turnNumber: number
  currentPlayerName: string
}

const props = defineProps<Props>()

const cellColorClass: Record<string, string> = {
  green: 'bg-success',
  red: 'bg-destructive',
  gold: 'bg-yellow-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-primary',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
}

// 24 格环形布局：每边 7 格，但四角共享
// 上边: 0-6 (从左到右, 7格, 左上角0, 右上角6)
// 右边: 7-11 (从上到下, 5格, 不含角)
// 下边: 12-18 (从右到左, 7格, 右下角12, 左下角18)
// 左边: 19-23 (从下到上, 5格, 不含角)
// 总计: 7 + 5 + 7 + 5 = 24

// 计算每个格子的位置 (百分比)
function getCellPosition(index: number): { top: string; left: string; transform?: string } {
  const total = RAT_RACE_CELLS.length // 24
  // 每边格子数（包含两个角）
  const perSide = total / 4 + 1 // 7

  if (index < perSide) {
    // 上边：从左到右
    const col = index
    return {
      top: '0%',
      left: `${(col / (perSide - 1)) * 100}%`,
      transform: 'translateX(-50%)',
    }
  } else if (index < perSide + (perSide - 2)) {
    // 右边：从上到下（不含上下角）
    const row = index - perSide + 1 // 从 1 开始
    return {
      top: `${(row / (perSide - 1)) * 100}%`,
      left: '100%',
      transform: 'translateX(-100%)',
    }
  } else if (index < perSide + (perSide - 2) + perSide) {
    // 下边：从右到左
    const colFromRight = index - (perSide + (perSide - 2)) // 0 ~ 6
    const col = perSide - 1 - colFromRight // 6 ~ 0
    return {
      top: '100%',
      left: `${(col / (perSide - 1)) * 100}%`,
      transform: 'translate(-50%, -100%)',
    }
  } else {
    // 左边：从下到上（不含上下角）
    const rowFromBottom = index - (perSide + (perSide - 2) + perSide) + 1 // 从 1 开始
    const row = perSide - 1 - rowFromBottom
    return {
      top: `${(row / (perSide - 1)) * 100}%`,
      left: '0%',
    }
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
</script>

<template>
  <div class="rat-race-board">
    <!-- 棋盘容器：正方形 -->
    <div class="board-container relative mx-auto aspect-square w-full max-w-[640px]">
      <!-- 格子 -->
      <div
        v-for="cell in RAT_RACE_CELLS"
        :key="cell.index"
        class="board-cell absolute flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 p-1 text-center backdrop-blur-sm shadow-sm transition-all"
        :class="{
          'ring-2 ring-primary ring-offset-2 ring-offset-background z-10': currentPosition === cell.index,
        }"
        :style="{
          top: getCellPosition(cell.index).top,
          left: getCellPosition(cell.index).left,
          transform: getCellPosition(cell.index).transform,
        }"
      >
        <div class="h-1 w-5 rounded-full" :class="cellColorClass[cell.color]" />
        <div class="cell-name mt-0.5 text-[10px] font-semibold leading-tight sm:text-xs">
          {{ cell.name }}
        </div>
        <!-- 玩家棋子 -->
        <div v-if="playersOnCell[cell.index]?.length" class="mt-0.5 flex -space-x-1">
          <div
            v-for="p in playersOnCell[cell.index]"
            :key="p.id"
            class="h-3 w-3 rounded-full border border-background ring-1 ring-white/20 sm:h-3.5 sm:w-3.5"
            :style="{ backgroundColor: p.color }"
            :title="p.name"
          />
        </div>
      </div>

      <!-- 中心信息区 -->
      <div class="absolute inset-[14%] flex flex-col items-center justify-center rounded-3xl border border-border bg-background/60 p-3 text-center backdrop-blur-md shadow-inner sm:p-5">
        <div class="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
          老鼠赛跑 · 第 {{ turnNumber }} 回合
        </div>
        <div class="mt-2 text-base font-bold sm:mt-3 sm:text-2xl">
          {{ currentPlayerName }}
        </div>

        <!-- 骰子点数 -->
        <div
          v-if="lastRoll > 0"
          class="mt-2 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary sm:mt-3 sm:text-base"
        >
          🎲 {{ lastRoll }}
        </div>

        <!-- 核心数据 -->
        <div class="mt-3 grid w-full grid-cols-2 gap-2 text-[10px] sm:mt-4 sm:gap-3 sm:text-xs">
          <div class="rounded-xl bg-secondary/50 p-2">
            <div class="text-muted-foreground">现金</div>
            <div class="font-semibold text-foreground">{{ formatMoney(currentPlayerCash) }}</div>
          </div>
          <div class="rounded-xl bg-secondary/50 p-2">
            <div class="text-muted-foreground">月现金流</div>
            <div class="font-semibold text-success">{{ formatMoney(currentPlayerCashFlow) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rat-race-board {
  width: 100%;
}

.board-cell {
  width: 13%;
  height: 13%;
}

@media (min-width: 640px) {
  .board-cell {
    width: 12%;
    height: 12%;
  }
}
</style>
