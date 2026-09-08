<script setup lang="ts">
import { computed } from 'vue'
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, DollarSign, PiggyBank } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { AIDecision } from '@/utils/aiDecision'
import type { OpportunityCard, Player } from '@/types/game'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()

interface Advice {
  analysis: string
  reason: string
  type: 'buy' | 'sell' | 'hold' | 'loan' | 'avoid' | 'info'
}

// AI 导师分析 —— 基于游戏内模拟状态的策略分析，不构成投资建议
const advice = computed<Advice | null>(() => {
  if (!gameStore.learningMode) return null
  if (gameStore.currentPlayer?.isAI) return null
  if (gameStore.isSpectatingOtherPhase) return null

  const player = gameStore.currentPlayer
  const action = gameStore.pendingAction
  if (!player || !action.type) return null

  const difficulty = 'hard' // 学习模式用最高难度的分析

  switch (action.type) {
    case 'opportunity': {
      const card = action.card as OpportunityCard
      if (!card) return null
      return getOpportunityAnalysis(player, card, difficulty)
    }
    case 'market': {
      return {
        analysis: '市场行情分析',
        reason: '市场事件为所有玩家提供交易机会。关注你持有的资产价格变化，这是学习市场波动的好时机。',
        type: 'info',
      }
    }
    case 'doodad': {
      return {
        analysis: '支出分析',
        reason: '生活意外会带来游戏内支出。你可以观察保留现金对本局决策的影响。',
        type: 'info',
      }
    }
    case 'charity': {
      const donation = Math.round(player.totalIncome * 0.1)
      return {
        analysis: '慈善选项分析',
        reason: `捐赠 ${formatMoney(donation)}（收入的10%）可获得一次免裁员保护和掷双骰机会。请根据当前游戏状态比较这项规则的影响。`,
        type: 'info',
      }
    }
    case 'layoff': {
      return {
        analysis: '风险提示',
        reason: '裁员会导致失业，失去工资收入。你可以观察模拟被动收入与工资收入的差异。',
        type: 'avoid',
      }
    }
    case 'need_loan': {
      const amount = (action.meta?.amount as number) ?? 0
      return getLoanAnalysis(player, amount)
    }
    case 'fast_track_opportunity': {
      const card = action.card as OpportunityCard
      if (!card) return null
      return getFastTrackOpportunityAnalysis(player, card, difficulty)
    }
    case 'fast_track_dream': {
      const dream = player.dream
      if (!dream) return null
      return {
        analysis: player.cash >= dream.price ? '梦想达成！' : '继续积累',
        reason: dream.price > 0
          ? `梦想价格 ${formatMoney(dream.price)}，当前现金 ${formatMoney(player.cash)}。${player.cash >= dream.price ? '你已达成游戏目标！' : '还差 ' + formatMoney(dream.price - player.cash) + '。'}`
          : '专注于增加模拟现金流和资产增值。',
        type: player.cash >= dream.price ? 'buy' : 'hold',
      }
    }
    case 'stock_sell_opportunity': {
      return {
        analysis: '卖出时机分析',
        reason: '股票卖出机会出现了。对比游戏内买入成本和当前价格，观察不同选择的结果。',
        type: 'info',
      }
    }
    default:
      return null
  }
})

function getOpportunityAnalysis(player: Player, card: OpportunityCard, difficulty: string): Advice {
  const decision = AIDecision.decideBuyOpportunity(player, card, difficulty as 'easy' | 'medium' | 'hard')

  if (card.splitRatio !== undefined) {
    return {
      analysis: '股票拆分/合股',
      reason: '这是股票结构调整，不涉及买卖决策。你可以在模拟中观察拆分对数量和价格的影响。',
      type: 'info',
    }
  }

  if (card.type === 'stock' && card.action === 'sell') {
    return {
      analysis: '卖出机会分析',
      reason: `当前模拟价格 ${formatMoney(card.cost)}。你可以对比游戏内买入成本，观察卖出选择的结果。`,
      type: 'sell',
    }
  }

  if (decision.buy && decision.quantity > 0) {
    const totalCost = card.cost * decision.quantity
    let reason = ''
    if (card.type === 'stock') {
      reason = `模拟分析：这只股票价格 ${formatMoney(card.cost)}，按照当前游戏模型，买入 ${decision.quantity} 股需投入 ${formatMoney(totalCost)}。在游戏模拟中，股票是原始积累阶段快速增值的常见途径。请注意：这是游戏内模拟分析，非投资建议。`
    } else {
      const monthlyCashFlow = card.cashFlow * decision.quantity
      const assetType = card.type === 'real_estate' ? '房产' : card.type === 'business' ? '企业' : '资产'
      reason = `模拟分析：这是${assetType}投资。每月模拟现金流 ${formatMoney(monthlyCashFlow)}，总投入 ${formatMoney(totalCost)}。在游戏模型中，这能增加被动收入，推进财务自由进度。`
    }
    return { analysis: `模拟分析：可买入 ${decision.quantity} 份`, reason, type: 'buy' }
  } else {
    let reason = ''
    if (card.type === 'stock' && card.cost > 40) {
      reason = `模拟分析：这只股票的游戏内价格为 ${formatMoney(card.cost)}，当前模型显示的波动风险较高。可以继续观察本局价格变化。`
    } else if (player.cash < card.cost) {
      reason = `模拟分析：当前现金不足（${formatMoney(player.cash)}），无法进行这笔投资。这说明本金积累是投资的基础。`
    } else {
      reason = `模拟分析：按照当前游戏模型，这笔交易的模拟结果有限。可以保留游戏内现金，继续比较后续机会。`
    }
    return { analysis: '模拟分析：可放弃', reason, type: 'avoid' }
  }
}

function getFastTrackOpportunityAnalysis(player: Player, card: OpportunityCard, difficulty: string): Advice {
  const decision = AIDecision.decideBuyFastTrackOpportunity(player, card, difficulty as 'easy' | 'medium' | 'hard')

  if (decision.buy && decision.quantity > 0) {
    const totalCost = card.cost * decision.quantity
    const monthlyCashFlow = card.cashFlow * decision.quantity
    return {
      analysis: `模拟分析：可投资 ${decision.quantity} 份`,
      reason: `大宗交易模拟：每月增加 ${formatMoney(monthlyCashFlow)} 模拟现金流，总投入 ${formatMoney(totalCost)}。在资本加速阶段，扩大现金流能加速实现梦想目标。`,
      type: 'buy',
    }
  } else {
    return {
      analysis: '模拟分析：可放弃',
      reason: '按照游戏模型，这笔交易的模拟结果有限，或者会过度消耗游戏内现金。你可以继续比较后续机会或梦想目标。',
      type: 'avoid',
    }
  }
}

function getLoanAnalysis(player: Player, amount: number): Advice {
  const shortfall = amount - player.cash
  if (player.passiveIncome >= player.totalExpenses) {
    return {
      analysis: '贷款分析：游戏内可比较',
      reason: `在当前模拟状态下，被动收入覆盖了游戏内支出。贷款 ${formatMoney(shortfall)} 的利息支出在本局模型中可承受。请注意：这是游戏模拟分析，不适用于现实贷款判断。`,
      type: 'loan',
    }
  } else {
    const remainingMonths = player.cash > 0 ? Math.floor(player.cash / (player.totalExpenses - player.passiveIncome)) : 0
    return {
      analysis: '贷款分析：需谨慎',
      reason: `在游戏模拟中，贷款会增加每月支出，延后阶段目标。你目前的现金约能支撑 ${remainingMonths} 个月的游戏内支出；可据此比较还款影响。`,
      type: 'avoid',
    }
  }
}

const typeStyles = {
  buy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  sell: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  hold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  loan: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  avoid: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const typeIcons = {
  buy: TrendingUp,
  sell: TrendingDown,
  hold: PiggyBank,
  loan: DollarSign,
  avoid: AlertTriangle,
  info: Lightbulb,
}
</script>

<template>
  <Transition name="slide-up">
    <div v-if="advice" class="ai-tutor-advice" :class="typeStyles[advice.type]">
      <div class="advice-header">
        <component :is="typeIcons[advice.type]" class="h-4 w-4 shrink-0" />
        <span class="advice-label">AI 模拟分析</span>
        <span class="advice-action">{{ advice.analysis }}</span>
      </div>
      <p class="advice-reason">{{ advice.reason }}</p>
      <p class="advice-disclaimer">
        以上为游戏内模拟分析，不构成投资建议。
      </p>
    </div>
  </Transition>
</template>

<style scoped>
@reference "../assets/base.css";

.ai-tutor-advice {
  @apply rounded-xl border p-3;
}

.advice-header {
  @apply mb-1.5 flex items-center gap-2 text-xs font-semibold;
}

.advice-label {
  @apply opacity-80;
}

.advice-action {
  @apply ml-auto font-bold;
}

.advice-reason {
  @apply text-[11px] leading-relaxed opacity-90;
}

.advice-disclaimer {
  @apply mt-1.5 text-[10px] opacity-60;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
