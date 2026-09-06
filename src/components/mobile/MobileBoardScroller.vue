<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Move } from 'lucide-vue-next'
import { getCellCenterPx } from '@/engine/boardLayout'

/**
 * 移动端棋盘「测滚 + 当前格自动居中」容器。
 *
 * 棋盘是固定比例、强空间依赖的组件，手机上不应被压缩成蚂蚁大小；这里让棋盘保持
 * 合理的自热正方形尺寸，在容器内双向拖动/滑动浏览，当前玩家所在格自动居中并高亮。
 * 棋盘本体通过 <slot> 注入，因此同一份 RatRaceBoard / FastTrackBoard 可被两套 UI 复用。
 */
const props = withDefaults(
  defineProps<{
    boardSize?: number
    activeIndex?: number
    cellGap?: number
    hint?: string
  }>(),
  {
    boardSize: 520,
    activeIndex: 0,
    cellGap: 4,
    hint: '拖动棋盘浏览 · 当前位置已自动居中',
  },
)

const scrollEl = ref<HTMLElement | null>(null)
// The board keeps its square aspect ratio, but should use the largest size that
// fits in the mobile viewport.  A very narrow/short container keeps the old
// pannable fallback so the board never becomes unusably small.
const effectiveBoardSize = ref(Math.max(180, props.boardSize - 16))
let resizeObserver: ResizeObserver | null = null
let raf = 0

function fitBoardToViewport() {
  const el = scrollEl.value
  if (!el) return

  const availableWidth = el.clientWidth - 16
  const availableHeight = el.clientHeight - 16
  const maxBoardSize = props.boardSize - 16
  const canFit = availableWidth >= 180 && availableHeight >= 180

  effectiveBoardSize.value = canFit
    ? Math.max(180, Math.min(maxBoardSize, availableWidth, availableHeight))
    : Math.max(180, maxBoardSize)
  nextTick(() => centerOn(props.activeIndex))
}

function centerOn(index: number) {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const el = scrollEl.value
    if (!el) return
    const { x, y } = getCellCenterPx(index, effectiveBoardSize.value, props.cellGap)
    const tx = Math.max(0, x - el.clientWidth / 2)
    const ty = Math.max(0, y - el.clientHeight / 2)
    el.scrollTo({ left: tx, top: ty, behavior: 'smooth' })
  })
}

watch(() => props.activeIndex, centerOn, { immediate: true })

watch(() => props.boardSize, fitBoardToViewport)

onMounted(() => {
  fitBoardToViewport()
  if (typeof ResizeObserver !== 'undefined' && scrollEl.value) {
    resizeObserver = new ResizeObserver(fitBoardToViewport)
    resizeObserver.observe(scrollEl.value)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="mobile-board-scroller">
    <div ref="scrollEl" class="board-scroll">
      <div
        class="board-stage"
        :style="{
          width: `${effectiveBoardSize + 16}px`,
          height: `${effectiveBoardSize + 16}px`,
        }"
      >
        <slot />
      </div>
    </div>
    <div class="board-hint">
      <Move class="h-3.5 w-3.5 shrink-0" />
      <span>{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.mobile-board-scroller {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.board-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  touch-action: pan-x pan-y;
  background:
    radial-gradient(circle at center, hsl(var(--color-card) / 0.4) 0%, transparent 70%);
  border: 1px solid hsl(var(--color-border));
  border-radius: 1rem;
  scrollbar-width: none;
}

.board-scroll::-webkit-scrollbar {
  display: none;
}

.board-stage {
  position: relative;
  flex-shrink: 0;
  padding: 8px;
  box-sizing: border-box;
}

.board-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex-shrink: 0;
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  line-height: 1rem;
  color: hsl(var(--color-muted-foreground));
}

/* Landscape phones have less vertical room after the game header and metrics. */
@media (max-height: 500px) and (max-width: 1024px) and (orientation: landscape) {
  .mobile-board-scroller {
    min-height: 220px;
  }
}
</style>
