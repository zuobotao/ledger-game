<script setup lang="ts">
/**
 * GameHeader — 共享玩法顶栏（v2.4.3 Phase 4/5）
 *
 * 只依赖 GameplayAdapter；Single / Multiplayer 同一套渲染。
 * 银行/财务报表/保险入口通过 open-bank 事件交给玩法页持有弹窗状态。
 */
import { computed } from 'vue'
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Calendar,
  Dices,
  Eye,
  HeartHandshake,
  Landmark,
  Menu,
  PieChart,
  Shield,
  Target,
} from 'lucide-vue-next'
import { useDisplayMode } from '@/composables/useDisplayMode'
import type { GameplayAdapter } from '@/gameplay/gameplayAdapter'
import type { BankPanelTab } from '@/gameplay/types'

const props = withDefaults(
  defineProps<{
    adapter: GameplayAdapter
    spectator?: boolean
    showBack?: boolean
    /** 页面标题：老鼠圈「原始资本积累」/ 资本游戏「资本游戏」 */
    title?: string
  }>(),
  {
    spectator: false,
    showBack: true,
    title: '原始资本积累',
  },
)

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-bank', tab: BankPanelTab): void
}>()

const { isMobile } = useDisplayMode()
const vm = computed(() => props.adapter.viewModel.value)
const current = computed(() => vm.value.currentPlayer)
const isSingle = computed(() => props.adapter.meta.mode === 'single')

const ageDisplay = computed(() => {
  const months = current.value?.ageMonths ?? 0
  return `${Math.floor(months / 12)}岁${months % 12}月`
})

const isAIThinking = computed(
  () => isSingle.value && Boolean(current.value?.isAI) && !vm.value.canAct && !vm.value.finished,
)

const hasAnyInsurance = computed(
  () => current.value?.hasInsurance || current.value?.hasUnemploymentInsurance || false,
)

const showInsuranceButton = computed(() => {
  const p = current.value
  if (!p || p.phase !== 'rat_race' || p.isAI) return false
  return true
})

function openBank(tab: BankPanelTab) {
  emit('open-bank', tab)
}
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary/50 px-3 py-2.5 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-6 sm:py-3"
  >
    <!-- 左侧：返回 + 阶段 + 回合 -->
    <div class="flex items-center gap-2 sm:gap-3">
      <button
        v-if="showBack"
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        title="返回首页"
        data-testid="game-back-button"
        @click="emit('back')"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="hidden sm:block">
        <h1 class="flex items-center gap-2 text-base font-semibold">
          {{ title }}
          <span
            v-if="spectator"
            class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400"
          >
            <Eye class="h-3 w-3" />
            观战模式
          </span>
        </h1>
        <p class="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar class="h-3 w-3" />
          {{ ageDisplay }} · 第 {{ vm.turnNumber }} 回合
        </p>
      </div>
    </div>

    <!-- 中间：当前玩家 -->
    <div class="flex items-center gap-2">
      <span
        v-if="current"
        class="h-3 w-3 rounded-full"
        :style="{ backgroundColor: current.color }"
      />
      <Bot v-if="current?.isAI" class="h-4 w-4 text-primary" />
      <span class="text-sm font-medium">{{ current?.name ?? '—' }}</span>
      <!-- AI 思考中提示 -->
      <span
        v-if="isAIThinking"
        class="inline-flex animate-pulse items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
      >
        <Bot class="h-3 w-3" />
        AI 思考中...
      </span>
      <!-- 状态徽章 -->
      <span
        v-if="current?.isUnemployed"
        class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
      >
        <BriefcaseBusiness class="h-3 w-3" />
        失业
      </span>
      <span
        v-if="current?.doubleDiceNextTurn"
        class="inline-flex animate-pulse items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
      >
        <Dices class="h-3 w-3" />
        双骰
      </span>
      <span
        v-if="current?.charityProtection"
        class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
        title="慈善保护：下次遭遇裁员时免疫"
      >
        <HeartHandshake class="h-3 w-3" />
        慈善保护
      </span>
      <span
        v-if="current?.hasUnemploymentInsurance"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
        title="失业保险：失业期间领取全额工资"
      >
        <Shield class="h-3 w-3" />
        失业险
      </span>
      <!-- 梦想徽章（资本游戏） -->
      <span
        v-if="current?.dream"
        class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
      >
        <Target class="h-3 w-3" />
        {{ current.dream.name }}
      </span>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- 移动端：收敛为单个「玩家中心」 -->
      <button
        v-if="isMobile"
        type="button"
        data-testid="mobile-player-center-button"
        class="ml-auto flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-foreground hover:bg-muted"
        :title="hasAnyInsurance ? '保险管理' : '玩家中心'"
        @click="openBank(hasAnyInsurance ? 'insurance' : 'statement')"
      >
        <Menu class="h-5 w-5" />
        <span class="text-xs font-semibold">玩家中心</span>
      </button>

      <!-- 桌面端：银行 / 财务报表 / 保险 三个独立入口 -->
      <template v-if="!isMobile">
        <button
          type="button"
          data-testid="bank-button"
          :disabled="current?.isAI"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          title="银行"
          @click="openBank('deposit')"
        >
          <Landmark class="h-5 w-5" />
        </button>
        <button
          type="button"
          data-testid="financial-statement-button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-muted"
          title="财务报表"
          @click="openBank('statement')"
        >
          <PieChart class="h-5 w-5" />
        </button>
        <button
          v-if="showInsuranceButton"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full transition"
          :class="
            hasAnyInsurance
              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
              : 'bg-success/20 text-success hover:bg-success/30'
          "
          :title="hasAnyInsurance ? '保险管理' : '购买保险'"
          @click="openBank('insurance')"
        >
          <Shield class="h-5 w-5" />
        </button>
      </template>
    </div>
  </header>
</template>
