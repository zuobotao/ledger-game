<script setup lang="ts">
import { computed } from 'vue'
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, DollarSign, PiggyBank } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { AIDecision } from '@/utils/aiDecision'
import type { OpportunityCard, Player } from '@/types/game'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()

interface Advice {
  action: string
  reason: string
  type: 'buy' | 'sell' | 'hold' | 'loan' | 'avoid' | 'info'
}

// 生成 AI 导师建议
const advice = computed<Advice | null>(() => {
  if (!gameStore.learningMode) return null
  if (gameStore.currentPlayer?.isAI) return null
  if (gameStore.isSpectatingOtherPhase) return null

  const player = gameStore.currentPlayer
  const action = gameStore.pendingAction
  if (!player || !action.type) return null

  const difficulty = 'hard' // 学习模式用最高难度的建议

  switch (action.type) {
    case 'opportunity': {
      const card = action.card as OpportunityCard
      if (!card) return null
      return getOpportunityAdvice(player, card, difficulty)
    }
    case 'market': {
      return {
        action: '查看市场行情',
        reason: '市场事件为所有玩家提供交易机会。关注你持有的资产价格变化，在高点卖出获利。',
        type: 'info',
      }
    }
    case 'doodad': {
      return {
        action: '支付支出',
        reason: '生活意外是不可避免的支出。记住：应急基金很重要，建议至少保留3-6个月支出的现金储备。',
        type: 'info',
      }
    }
    case 'charity': {
      const donation = Math.round(player.totalIncome * 0.1)
      return {
        action: '建议考虑捐赠',
        reason: `捐赠 ${formatMoney(donation)}（收入的10%）可获得一次免裁员保护和掷双骰机会。如果现金充足，这是不错的投资。`,
        type: 'info',
      }
    }
    case 'layoff': {
      return {
        action: '注意风险',
        reason: '裁员会导致失业，失去工资收入。这提醒我们：被动收入才是财务安全的保障，而不是工资。',
        type: 'avoid',
      }
    }
    case 'need_loan': {
      const amount = (action.meta?.amount as number) ?? 0
      return getLoanAdvice(player, amount)
    }
    case 'fast_track_opportunity': {
      const card = action.card as OpportunityCard
      if (!card) return null
      return getFastTrackOpportunityAdvice(player, card, difficulty)
    }
    case 'fast_track_dream': {
      const dream = player.dream
      if (!dream) return null
      return {
        action: player.cash >= dream.price ? '可以购买梦想！' : '继续积累现金',
        reason: dream.price > 0
          ? `梦想价格 ${formatMoney(dream.price)}，当前现金 ${formatMoney(player.cash)}。${player.cash >= dream.price ? '你已达成目标！' : '还差 ' + formatMoney(dream.price - player.cash) + '。'}`
          : '专注于增加现金流和资产增值。',
        type: player.cash >= dream.price ? 'buy' : 'hold',
      }
    }
    case 'stock_sell_opportunity': {
      return {
        action: '评估卖出时机',
        reason: '股票卖出机会来了！对比你的买入成本和当前价格，如果盈利达到预期目标，可以考虑卖出获利了结。',
        type: 'info',
      }
    }
    default:
      return null
  }
})

function getOpportunityAdvice(player: Player, card: OpportunityCard, difficulty: string): Advice {
  const decision = AIDecision.decideBuyOpportunity(player, card, difficulty as 'easy' | 'medium' | 'hard')

  if (card.splitRatio !== undefined) {
    return {
      action: '股票拆分/合股',
      reason: '这是股票结构调整，不涉及买卖决策。拆分通常是利好信号。',
      type: 'info',
    }
  }

  if (card.type === 'stock' && card.action === 'sell') {
    return {
      action: '卖出机会',
      reason: `当前价格 ${formatMoney(card.cost)}。对比你的买入成本，如果盈利达到目标（通常50%-100%），考虑卖出获利。`,
      type: 'sell',
    }
  }

  if (decision.buy && decision.quantity > 0) {
    const totalCost = card.cost * decision.quantity
    let reason = ''
    if (card.type === 'stock') {
      reason = `这只股票价格 ${formatMoney(card.cost)}，处于较好价位。建议买入 ${decision.quantity} 股，总投入 ${formatMoney(totalCost)}。股票是原始积累阶段快速增值的工具。`
    } else {
      const monthlyCashFlow = card.cashFlow * decision.quantity
      reason = `这是${card.type === 'real_estate' ? '房产' : card.type === 'business' ? '企业' : '资产'}投资。每月现金流 ${formatMoney(monthlyCashFlow)}，总投入 ${formatMoney(totalCost)}。能增加被动收入，推进财务自由。`
    }
    return { action: `建议买入 ${decision.quantity} 份`, reason, type: 'buy' }
  } else {
    let reason = ''
    if (card.type === 'stock' && card.cost > 40) {
      reason = `股票价格 ${formatMoney(card.cost)} 偏高，下跌风险较大。建议等待更低价格再买入。`
    } else if (player.cash < card.cost) {
      reason = `现金不足（${formatMoney(player.cash)}），暂时无法投资。先积累本金。`
    } else {
      reason = `当前投资回报不够理想，建议等待更好的机会。保留现金等待优质投资。`
    }
    return { action: '建议放弃', reason, type: 'avoid' }
  }
}

function getFastTrackOpportunityAdvice(player: Player, card: OpportunityCard, difficulty: string): Advice {
  const decision = AIDecision.decideBuyFastTrackOpportunity(player, card, difficulty as 'easy' | 'medium' | 'hard')

  if (decision.buy && decision.quantity > 0) {
    const totalCost = card.cost * decision.quantity
    const monthlyCashFlow = card.cashFlow * decision.quantity
    return {
      action: `建议投资 ${decision.quantity} 份`,
      reason: `大宗交易：每月增加 ${formatMoney(monthlyCashFlow)} 现金流，总投入 ${formatMoney(totalCost)}。在资本游戏阶段，扩大现金流能加速实现梦想。`,
      type: 'buy',
    }
  } else {
    return {
      action: '建议放弃',
      reason: '这笔投资的回报率不够高，或者会过度消耗现金。保留现金等待更好的机会或购买梦想。',
      type: 'avoid',
    }
  }
}

function getLoanAdvice(player: Player, amount: number): Advice {
  const shortfall = amount - player.cash
  if (player.passiveIncome >= player.totalExpenses) {
    return {
      action: '可以贷款',
      reason: `你已实现财务自由，被动收入覆盖支出。贷款 ${formatMoney(shortfall)} 是可接受的，利息支出远低于被动收入。`,
      type: 'loan',
    }
  } else {
    const remainingMonths = player.cash > 0 ? Math.floor(player.cash / (player.totalExpenses - player.passiveIncome)) : 0
    return {
      action: '谨慎贷款',
      reason: `贷款会增加每月支出，延缓财务自由进程。如果这笔支出是必要的，建议贷款后尽快还清。你目前的现金约能支撑 ${remainingMonths} 个月支出。`,
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
        <span class="advice-label">AI 导师建议</span>
        <span class="advice-action">{{ advice.action }}</span>
      </div>
      <p class="advice-reason">{{ advice.reason }}</p>
    </div>
  </Transition>
</template>

<style scoped>
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
