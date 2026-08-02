<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, RotateCcw, Home, Clock, Wallet, TrendingUp, Landmark } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Player } from '@/types/game'

const router = useRouter()
const gameStore = useGameStore()

// 从 store 获取获胜玩家
const winner = computed<Player | null>(() => {
  if (!gameStore.winnerId) return null
  return gameStore.players.find((p) => p.id === gameStore.winnerId) ?? null
})

// 计算总资产价值
const totalAssetsValue = computed(() => {
  const p = winner.value
  if (!p) return 0
  return p.cash + p.assets.reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
})

// 展示数据（如果没有获胜数据则使用示例数据）
const displayData = computed(() => {
  const w = winner.value
  if (w) {
    return {
      playerName: w.name,
      turns: gameStore.currentPlayerIndex + 1,
      cash: w.cash,
      passiveIncome: w.passiveIncome,
      totalAssets: totalAssetsValue.value,
    }
  }
  // 默认示例数据
  return {
    playerName: '玩家 1',
    turns: 24,
    cash: 1250000,
    passiveIncome: 8500,
    totalAssets: 3200000,
  }
})

// 成就徽章
const achievements = [
  { icon: '🏆', label: '快车道达成者', description: '成功走出老鼠赛跑' },
  { icon: '💰', label: '投资达人', description: '积累了丰厚的资产' },
  { icon: '🎯', label: '梦想实现家', description: '购买了人生梦想' },
]

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function goToSetup() {
  router.push('/setup')
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div
    class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center"
  >
    <!-- 金色径向渐变光晕背景 -->
    <div
      class="pointer-events-none absolute inset-0 -z-0"
      aria-hidden="true"
      style="
        background: radial-gradient(
          ellipse at center top,
          rgba(251, 191, 36, 0.15) 0%,
          rgba(251, 191, 36, 0.05) 35%,
          transparent 70%
        );
      "
    />
    <div
      class="pointer-events-none absolute left-1/2 top-20 -z-0 h-96 w-96 -translate-x-1/2 rounded-full"
      aria-hidden="true"
      style="
        background: radial-gradient(
          circle,
          rgba(251, 191, 36, 0.2) 0%,
          transparent 70%
        );
        filter: blur(60px);
      "
    />

    <div class="relative z-10 mx-auto w-full max-w-2xl">
      <!-- 奖杯图标 -->
      <div class="mb-6 flex justify-center">
        <div
          class="relative flex h-24 w-24 items-center justify-center rounded-full"
          style="
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
            box-shadow:
              0 0 40px rgba(251, 191, 36, 0.4),
              0 10px 40px rgba(0, 0, 0, 0.3);
          "
        >
          <Trophy class="h-12 w-12 text-white" />
          <!-- 光晕效果 -->
          <div
            class="absolute inset-0 rounded-full"
            style="
              background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.3) 0%,
                transparent 50%
              );
            "
          />
        </div>
      </div>

      <!-- 主标题 -->
      <h1
        class="mb-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        style="
          background: linear-gradient(135deg, #fbbf24 0%, #fde68a 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        "
      >
        恭喜！财务自由
      </h1>

      <!-- 副标题 -->
      <p class="mb-10 text-lg font-medium text-foreground sm:text-xl">
        <span class="text-primary">{{ displayData.playerName }}</span>
        成功走出老鼠赛跑
      </p>

      <!-- 数据概览 2x2 网格 -->
      <div class="mb-8 grid grid-cols-2 gap-4">
        <!-- 游戏回合数 -->
        <div
          class="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07"
        >
          <div class="mb-2 flex justify-center">
            <Clock class="h-6 w-6 text-amber-400" />
          </div>
          <div class="mb-1 text-2xl font-bold text-foreground">
            {{ displayData.turns }}
          </div>
          <div class="text-xs text-muted-foreground">游戏回合数</div>
        </div>

        <!-- 最终现金 -->
        <div
          class="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07"
        >
          <div class="mb-2 flex justify-center">
            <Wallet class="h-6 w-6 text-green-400" />
          </div>
          <div class="mb-1 text-2xl font-bold text-foreground">
            {{ formatMoney(displayData.cash) }}
          </div>
          <div class="text-xs text-muted-foreground">最终现金</div>
        </div>

        <!-- 被动收入 -->
        <div
          class="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07"
        >
          <div class="mb-2 flex justify-center">
            <TrendingUp class="h-6 w-6 text-blue-400" />
          </div>
          <div class="mb-1 text-2xl font-bold text-foreground">
            {{ formatMoney(displayData.passiveIncome) }}
          </div>
          <div class="text-xs text-muted-foreground">被动收入 / 月</div>
        </div>

        <!-- 总资产价值 -->
        <div
          class="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07"
        >
          <div class="mb-2 flex justify-center">
            <Landmark class="h-6 w-6 text-purple-400" />
          </div>
          <div class="mb-1 text-2xl font-bold text-foreground">
            {{ formatMoney(displayData.totalAssets) }}
          </div>
          <div class="text-xs text-muted-foreground">总资产价值</div>
        </div>
      </div>

      <!-- 成就徽章区 -->
      <div class="mb-10 flex flex-wrap items-center justify-center gap-3">
        <div
          v-for="(achievement, index) in achievements"
          :key="index"
          class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:bg-amber-500/10"
        >
          <span class="text-lg">{{ achievement.icon }}</span>
          <span class="text-sm font-medium text-foreground">{{ achievement.label }}</span>
        </div>
      </div>

      <!-- 底部按钮组 -->
      <div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <button
          type="button"
          class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          @click="goToSetup"
        >
          <RotateCcw class="h-5 w-5" />
          再来一局
        </button>
        <button
          type="button"
          class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary px-8 text-base font-semibold text-secondary-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          @click="goHome"
        >
          <Home class="h-5 w-5" />
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>
