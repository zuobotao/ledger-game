<script setup lang="ts">
import { computed } from 'vue'
import { Coins, TrendingDown, Star, Bell, Sparkles, TrendingUp, AlertTriangle, Zap } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  suppress?: boolean
}>()

const gameStore = useGameStore()

const showMessageToast = computed(() => {
  if (props.suppress) return false
  return !gameStore.pendingAction.type && !!gameStore.pendingAction.message
})

interface ToastConfig {
  icon: any
  bgGradient: string
  borderColor: string
  iconBg: string
  iconColor: string
  accentLine: string
  glowColor: string
  badge: string
  title: string
}

const messageToastConfig = computed<ToastConfig>(() => {
  const type = gameStore.pendingAction.messageType ?? 'info'
  switch (type) {
    case 'gain':
      return {
        icon: TrendingUp,
        bgGradient: 'bg-gradient-to-br from-emerald-600/95 via-emerald-500/95 to-teal-600/95',
        borderColor: 'border-emerald-300/40',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        accentLine: 'bg-emerald-300',
        glowColor: 'shadow-[0_10px_40px_-5px_rgba(16,185,129,0.5)]',
        badge: '收益',
        title: '财富增长',
      }
    case 'loss':
      return {
        icon: TrendingDown,
        bgGradient: 'bg-gradient-to-br from-rose-600/95 via-red-500/95 to-rose-700/95',
        borderColor: 'border-rose-300/40',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        accentLine: 'bg-rose-300',
        glowColor: 'shadow-[0_10px_40px_-5px_rgba(244,63,94,0.5)]',
        badge: '支出',
        title: '财富变动',
      }
    case 'major':
      return {
        icon: Zap,
        bgGradient: 'bg-gradient-to-br from-amber-500/95 via-orange-500/95 to-amber-600/95',
        borderColor: 'border-amber-300/40',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        accentLine: 'bg-amber-300',
        glowColor: 'shadow-[0_10px_40px_-5px_rgba(245,158,11,0.6)]',
        badge: '重要',
        title: '重大事件',
      }
    default:
      return {
        icon: Bell,
        bgGradient: 'bg-gradient-to-br from-slate-700/95 via-slate-800/95 to-slate-900/95',
        borderColor: 'border-slate-500/40',
        iconBg: 'bg-white/15',
        iconColor: 'text-slate-200',
        accentLine: 'bg-slate-400',
        glowColor: 'shadow-[0_10px_40px_-5px_rgba(0,0,0,0.4)]',
        badge: '提示',
        title: '游戏消息',
      }
  }
})
</script>

<template>
  <Transition name="game-toast">
    <div
      v-if="showMessageToast"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 sm:top-6"
    >
      <!-- 外层光晕 -->
      <div
        :class="[
          'absolute -inset-1 rounded-2xl blur-xl opacity-60 animate-pulse-slow',
          messageToastConfig.glowColor.replace('shadow-[', 'bg-[').replace(']', ']'),
        ]"
        style="background: currentColor;"
      />

      <!-- 主卡片 -->
      <div
        :class="[
          'relative flex items-stretch gap-0 rounded-2xl text-white backdrop-blur-md overflow-hidden',
          messageToastConfig.bgGradient,
          messageToastConfig.glowColor,
          'border',
          messageToastConfig.borderColor,
          'min-w-[260px] max-w-[92vw] sm:max-w-md',
        ]"
      >
        <!-- 左侧色条 + 图标 -->
        <div class="relative flex flex-col items-center justify-center px-4 py-3 sm:px-5 sm:py-4">
          <!-- 图标圆背景 -->
          <div
            :class="[
              'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full',
              messageToastConfig.iconBg,
              'animate-icon-pop',
            ]"
          >
            <component
              :is="messageToastConfig.icon"
              :class="['h-6 w-6 sm:h-7 sm:w-7', messageToastConfig.iconColor, 'animate-icon-float']"
            />
          </div>
          <!-- 装饰光效 -->
          <div class="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/10 rounded-full blur-md" />
        </div>

        <!-- 分隔线 -->
        <div :class="['w-px opacity-30', messageToastConfig.accentLine]" />

        <!-- 右侧文字区 -->
        <div class="flex flex-1 flex-col justify-center gap-0.5 px-4 py-3 sm:px-5 sm:py-4 min-w-0">
          <!-- 标题行 -->
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                messageToastConfig.iconBg,
              ]"
            >
              {{ messageToastConfig.badge }}
            </span>
            <span class="text-sm font-semibold opacity-90">{{ messageToastConfig.title }}</span>
          </div>
          <!-- 消息正文 -->
          <p class="text-base sm:text-lg font-bold leading-snug truncate">
            {{ gameStore.pendingAction.message }}
          </p>
        </div>

        <!-- 顶部高光条 -->
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <!-- 底部高光条 -->
        <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <!-- 角落装饰 - 左上 -->
        <div class="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-white/30 rounded-tl" />
        <!-- 角落装饰 - 右上 -->
        <div class="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-white/30 rounded-tr" />
        <!-- 角落装饰 - 左下 -->
        <div class="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-white/20 rounded-bl" />
        <!-- 角落装饰 - 右下 -->
        <div class="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-white/20 rounded-br" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 入场动画：从上方滑入 + 缩放弹入 */
.game-toast-enter-active {
  animation: toast-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.game-toast-leave-active {
  animation: toast-slide-out 0.3s ease-in forwards;
}

@keyframes toast-slide-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
  60% {
    transform: translateX(-50%) translateY(4px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes toast-slide-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-15px) scale(0.95);
  }
}

/* 图标弹入动画 */
.animate-icon-pop {
  animation: icon-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

@keyframes icon-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 图标漂浮动画 */
.animate-icon-float {
  animation: icon-float 2.5s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

/* 慢脉冲 */
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}
</style>
