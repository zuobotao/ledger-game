<script setup lang="ts">
import { ref, watch, computed } from 'vue'

type DiceSize = 'sm' | 'md' | 'lg'

interface Props {
  show: boolean
  values?: number[]
  count?: number
  inline?: boolean
  size?: DiceSize
}

const props = withDefaults(defineProps<Props>(), {
  values: () => [],
  count: 1,
  inline: false,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'done'): void
}>()

const displayValues = ref<number[]>([])
const isRolling = ref(false)

// 根据 size 计算骰子 CSS 变量（移动端 / 桌面端）
const sizeMap: Record<DiceSize, { mobile: number; desktop: number; gapMobile: number; gapDesktop: number }> = {
  sm: { mobile: 40, desktop: 50, gapMobile: 8, gapDesktop: 10 },
  md: { mobile: 60, desktop: 80, gapMobile: 12, gapDesktop: 16 },
  lg: { mobile: 80, desktop: 100, gapMobile: 16, gapDesktop: 24 },
}

const diceVars = computed(() => {
  const s = sizeMap[props.size]
  return {
    '--dice-size': `${s.mobile}px`,
    '--dice-radius': `${Math.round(s.mobile * 0.2)}px`,
    '--dice-gap': `${s.gapMobile}px`,
    '--dice-size-desktop': `${s.desktop}px`,
    '--dice-radius-desktop': `${Math.round(s.desktop * 0.2)}px`,
    '--dice-gap-desktop': `${s.gapDesktop}px`,
  } as Record<string, string>
})

// 监听 show 变化，触发动画
watch(
  () => props.show,
  (show) => {
    if (show) {
      startRolling()
    }
  },
  { immediate: true },
)

function startRolling() {
  isRolling.value = true
  const count = props.values.length > 0 ? props.values.length : props.count
  displayValues.value = Array(count).fill(1)

  // 快速切换随机点数
  let ticks = 0
  const totalTicks = 12
  const interval = setInterval(() => {
    displayValues.value = displayValues.value.map(() => Math.floor(Math.random() * 6) + 1)
    ticks++
    if (ticks >= totalTicks) {
      clearInterval(interval)
      // 显示最终结果
      if (props.values.length > 0) {
        displayValues.value = [...props.values]
      }
      // 停留一会儿后通知完成
      setTimeout(() => {
        isRolling.value = false
        emit('done')
      }, 500)
    }
  }, 80)
}

// 骰子面点的位置（经典骰子布局）
const dotPositions: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}
</script>

<template>
  <!-- 内联模式：普通 div，无遮罩 -->
  <div
    v-if="inline"
    class="dice-inline"
    :class="{ 'dice-inline-visible': show }"
    :style="diceVars"
  >
    <div class="dice-row">
      <div
        v-for="(val, idx) in displayValues"
        :key="idx"
        class="dice-face"
        :class="{ 'is-rolling': isRolling }"
      >
        <div class="dice-dots">
          <span
            v-for="(pos, i) in dotPositions[val]"
            :key="i"
            class="dice-dot"
            :style="{
              gridRow: pos[0] + 1,
              gridColumn: pos[1] + 1,
            }"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- 全屏模式：保持原有行为 -->
  <Transition v-else name="dice-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dice-fullscreen"
      :style="diceVars"
    >
      <div class="flex flex-col items-center gap-6">
        <div class="dice-row-fullscreen">
          <div
            v-for="(val, idx) in displayValues"
            :key="idx"
            class="dice-face"
            :class="{ 'is-rolling': isRolling }"
          >
            <div class="dice-dots">
              <span
                v-for="(pos, i) in dotPositions[val]"
                :key="i"
                class="dice-dot"
                :style="{
                  gridRow: pos[0] + 1,
                  gridColumn: pos[1] + 1,
                }"
              />
            </div>
          </div>
        </div>
        <p v-if="!isRolling" class="text-lg font-semibold text-foreground">
          掷出 {{ values.reduce((a, b) => a + b, 0) }} 点
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ========== 内联模式 ========== */
.dice-inline {
  display: inline-flex;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.dice-inline-visible {
  opacity: 1;
}

.dice-row {
  display: flex;
  align-items: center;
  gap: var(--dice-gap);
}

/* ========== 全屏模式骰子行 ========== */
.dice-row-fullscreen {
  display: flex;
  align-items: center;
  gap: var(--dice-gap);
}

/* ========== 骰子通用样式 ========== */
.dice-face {
  width: var(--dice-size);
  height: var(--dice-size);
  background: var(--color-popover, #22252a);
  border: 2px solid var(--color-border, #333942);
  border-radius: var(--dice-radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}

/* 桌面端响应式 */
@media (min-width: 640px) {
  .dice-face {
    width: var(--dice-size-desktop);
    height: var(--dice-size-desktop);
    border-radius: var(--dice-radius-desktop);
  }

  .dice-row,
  .dice-row-fullscreen {
    gap: var(--dice-gap-desktop);
  }
}

.dice-face.is-rolling {
  animation: dice-bounce 0.2s ease-in-out infinite alternate;
}

@keyframes dice-bounce {
  from {
    transform: translateY(0) rotate(-5deg) scale(1);
  }
  to {
    transform: translateY(-8px) rotate(5deg) scale(1.05);
  }
}

.dice-dots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  width: 65%;
  height: 65%;
}

.dice-dot {
  background: var(--color-primary, #0065fd);
  border-radius: 50%;
  align-self: center;
  justify-self: center;
  width: 70%;
  height: 70%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* ========== 全屏模式过渡 ========== */
.dice-fade-enter-active,
.dice-fade-leave-active {
  transition: opacity 0.25s ease;
}

.dice-fade-enter-from,
.dice-fade-leave-to {
  opacity: 0;
}

.dice-fade-enter-active .dice-face {
  animation: dice-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes dice-pop-in {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
