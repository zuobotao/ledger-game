<script setup lang="ts">
/**
 * CapitalBoardPanel — 共享资本游戏棋盘区（v2.4.3 Phase 5）
 *
 * 薄封装：把 GameBoardSection 固定为 fast_track 棋盘，
 * 并透传 board-extra / pending-panel 插槽（单机 AI 导师、回合总结等由父层注入）。
 */
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import GameBoardSection from '@/gameplay/components/GameBoardSection.vue'

defineProps<{
  adapter: GameplayAdapter
  mobileBoardSize?: number
  cellGap?: number
}>()
</script>

<template>
  <GameBoardSection
    :adapter="adapter"
    board-kind="fast_track"
    :mobile-board-size="mobileBoardSize"
    :cell-gap="cellGap"
  >
    <template #board-extra>
      <slot name="board-extra" />
    </template>
    <template #pending-panel>
      <slot name="pending-panel" />
    </template>
  </GameBoardSection>
</template>
