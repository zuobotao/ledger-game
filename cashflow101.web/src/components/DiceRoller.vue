<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show: boolean
  values?: number[]
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  values: () => [],
  count: 1,
})

const emit = defineEmits<{
  (e: 'done'): void
}>()

const displayValues = ref<number[]>([])
const isRolling = ref(false)

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
  <Transition name="dice-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-6">
        <div class="flex items-center gap-4 sm:gap-6">
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
.dice-face {
  width: 80px;
  height: 80px;
  background: var(--color-popover, #22252a);
  border: 2px solid var(--color-border, #333942);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}

@media (min-width: 640px) {
  .dice-face {
    width: 100px;
    height: 100px;
    border-radius: 20px;
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
