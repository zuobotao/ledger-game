<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { TrendingDown, TrendingUp, Sparkles, Info } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  suppress?: boolean
  duration?: number
}>()

const gameStore = useGameStore()

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const hasMessage = computed(() => {
  return !gameStore.pendingAction.type && !!gameStore.pendingAction.message
})

const showMessageToast = computed(() => {
  if (props.suppress) return false
  return hasMessage.value && visible.value
})

watch(
  () => gameStore.pendingAction.message,
  (newMsg) => {
    if (newMsg && !gameStore.pendingAction.type) {
      visible.value = false
      nextTick(() => {
        visible.value = true
        startDismissTimer()
      })
    } else {
      visible.value = false
      if (dismissTimer) {
        clearTimeout(dismissTimer)
        dismissTimer = null
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.suppress,
  (isSuppressed, wasSuppressed) => {
    if (wasSuppressed && !isSuppressed && hasMessage.value) {
      visible.value = false
      nextTick(() => {
        visible.value = true
        startDismissTimer()
      })
    }
    if (isSuppressed && dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  },
)

function startDismissTimer() {
  if (dismissTimer) clearTimeout(dismissTimer)
  const duration = props.duration ?? 3000
  dismissTimer = setTimeout(() => {
    visible.value = false
    setTimeout(() => {
      if (!visible.value) {
        gameStore.acknowledgeMessage()
      }
    }, 300)
  }, duration)
}

onUnmounted(() => {
  if (dismissTimer) clearTimeout(dismissTimer)
})

interface ToastStyle {
  icon: any
  iconColor: string
  iconBg: string
  labelColor: string
  label: string
  dotColor: string
}

const toastStyle = computed<ToastStyle>(() => {
  const type = gameStore.pendingAction.messageType ?? 'info'
  switch (type) {
    case 'gain':
      return {
        icon: TrendingUp,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-500/15',
        labelColor: 'text-emerald-300',
        label: '收益',
        dotColor: 'bg-emerald-400',
      }
    case 'loss':
      return {
        icon: TrendingDown,
        iconColor: 'text-rose-400',
        iconBg: 'bg-rose-500/15',
        labelColor: 'text-rose-300',
        label: '支出',
        dotColor: 'bg-rose-400',
      }
    case 'major':
      return {
        icon: Sparkles,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/15',
        labelColor: 'text-amber-300',
        label: '重要',
        dotColor: 'bg-amber-400',
      }
    default:
      return {
        icon: Info,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-500/15',
        labelColor: 'text-sky-300',
        label: '提示',
        dotColor: 'bg-sky-400',
      }
  }
})
</script>

<template>
  <Transition name="toast">
    <div
      v-if="showMessageToast"
      class="pointer-events-none absolute left-4 top-4 z-50 sm:left-6 sm:top-6"
    >
      <div
        class="pointer-events-auto flex min-w-[280px] items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur-md sm:min-w-[320px] sm:gap-4 sm:px-5 sm:py-3.5"
      >
        <!-- 左侧色条 -->
        <div :class="['absolute left-0 top-0 h-full w-1', toastStyle.dotColor]" />

        <!-- 图标 -->
        <div
          :class="[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            toastStyle.iconBg,
          ]"
        >
          <component :is="toastStyle.icon" :class="['h-4.5 w-4.5', toastStyle.iconColor]" />
        </div>

        <!-- 内容 -->
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span :class="['text-[11px] font-medium uppercase tracking-wider', toastStyle.labelColor]">
            {{ toastStyle.label }}
          </span>
          <p class="truncate text-sm font-medium text-white/90 sm:text-[15px]">
            {{ gameStore.pendingAction.message }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
