<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles, Gem, TrendingUp, ShoppingBag, ChevronDown, History } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { OPPORTUNITY_CARDS, FAST_TRACK_OPPORTUNITY_CARDS } from '@/data/cards'
import type { CardHistoryRecord, OpportunityCard } from '@/types/game'

const store = useGameStore()

type FilterTab = 'all' | 'opportunity' | 'market' | 'doodad'
const activeTab = ref<FilterTab>('all')

const expandedIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

// Build a lookup map for opportunity cards (both rat race and fast track)
const opportunityCardMap = computed(() => {
  const map = new Map<string, OpportunityCard>()
  for (const card of OPPORTUNITY_CARDS) {
    map.set(card.id, card)
  }
  for (const card of FAST_TRACK_OPPORTUNITY_CARDS) {
    map.set(card.id, card)
  }
  return map
})

// Filter card history for current player
const playerHistory = computed(() => {
  const playerId = store.currentPlayer?.id
  if (!playerId) return []
  return store.cardHistory.filter((r) => r.playerId === playerId)
})

// Filtered by active tab
const filteredHistory = computed(() => {
  const records = [...playerHistory.value].sort((a, b) => b.timestamp - a.timestamp)
  if (activeTab.value === 'all') return records
  if (activeTab.value === 'opportunity') {
    return records.filter((r) => r.type === 'opportunity' || r.type === 'fast_track_opportunity')
  }
  return records.filter((r) => r.type === activeTab.value)
})

// Determine opportunity size from card id
function getOpportunitySize(cardId: string): 'small' | 'big' | 'unknown' {
  const card = opportunityCardMap.value.get(cardId)
  return card?.size ?? 'unknown'
}

// Card type display info
interface CardTypeInfo {
  icon: typeof Sparkles
  label: string
  colorClass: string
  bgClass: string
}

function getCardTypeInfo(record: CardHistoryRecord): CardTypeInfo {
  if (record.type === 'market') {
    return {
      icon: TrendingUp,
      label: '市场风云',
      colorClass: 'text-success',
      bgClass: 'bg-success/15',
    }
  }
  if (record.type === 'doodad') {
    return {
      icon: ShoppingBag,
      label: '生活意外',
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/15',
    }
  }
  // opportunity or fast_track_opportunity
  const size = getOpportunitySize(record.cardId)
  if (size === 'big') {
    return {
      icon: Gem,
      label: '大机会',
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-400/15',
    }
  }
  return {
    icon: Sparkles,
    label: '小机会',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/15',
  }
}

interface ActionInfo {
  label: string
  class: string
}

function getActionInfo(action?: string): ActionInfo | null {
  if (!action) return null
  switch (action) {
    case 'accepted':
      return {
        label: '已接受',
        class: 'bg-success/15 text-success border-success/30',
      }
    case 'declined':
      return {
        label: '已放弃',
        class: 'bg-muted text-muted-foreground border-border',
      }
    case 'sold':
      return {
        label: '已卖出',
        class: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      }
    case 'ignored':
      return {
        label: '已忽略',
        class: 'bg-muted text-muted-foreground border-border',
      }
    default:
      return null
  }
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'opportunity', label: '机会' },
  { key: 'market', label: '市场风云' },
  { key: 'doodad', label: '生活意外' },
]
</script>

<template>
  <div class="flex flex-col h-full bg-popover text-popover-foreground border border-border rounded-[var(--radius-md)] overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
          <History class="w-5 h-5 text-primary" />
        </div>
        <h2 class="text-lg font-semibold text-foreground">卡片历史</h2>
      </div>
      <div class="text-xs text-muted-foreground">
        共 {{ playerHistory.length }} 条
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex border-b border-border shrink-0 px-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 py-2.5 text-sm font-medium transition-colors relative"
        :class="activeTab === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="activeTab === tab.key"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>

    <!-- Timeline List -->
    <div class="flex-1 overflow-y-auto px-4 py-4">
      <template v-if="filteredHistory.length > 0">
        <div class="relative pl-6">
          <!-- Vertical timeline line -->
          <div class="absolute left-2 top-1 bottom-1 w-px bg-border" />

          <div class="space-y-3">
            <div
              v-for="record in filteredHistory"
              :key="record.id"
              class="relative"
            >
              <!-- Timeline dot -->
              <div
                class="absolute -left-[22px] top-4 w-3 h-3 rounded-full border-2 border-popover z-10"
                :class="getCardTypeInfo(record).bgClass.replace('bg-', 'bg-').replace('/15', '') + ' ring-2 ' + getCardTypeInfo(record).colorClass.replace('text-', 'ring-').replace('/15', '')"
                :style="{
                  backgroundColor: getCardTypeInfo(record).colorClass === 'text-primary' ? 'var(--color-primary)' :
                                   getCardTypeInfo(record).colorClass === 'text-success' ? 'var(--color-success)' :
                                   getCardTypeInfo(record).colorClass === 'text-destructive' ? 'var(--color-destructive)' :
                                   '#facc15',
                }"
              />

              <!-- Card -->
              <div class="bg-background border border-border rounded-2xl p-3.5 transition-all hover:border-gray-500/60">
                <!-- Top row: type badge + turn number -->
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      :class="getCardTypeInfo(record).bgClass"
                    >
                      <component
                        :is="getCardTypeInfo(record).icon"
                        class="w-4 h-4"
                        :class="getCardTypeInfo(record).colorClass"
                      />
                    </div>
                    <span
                      class="text-xs font-medium"
                      :class="getCardTypeInfo(record).colorClass"
                    >
                      {{ getCardTypeInfo(record).label }}
                    </span>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                    第 {{ record.turnNumber }} 回合
                  </span>
                </div>

                <!-- Card title -->
                <h3 class="text-sm font-semibold text-foreground mb-1.5 leading-snug">
                  {{ record.cardTitle }}
                </h3>

                <!-- Card description -->
                <div class="relative">
                  <p
                    class="text-xs text-muted-foreground leading-relaxed"
                    :class="{ 'line-clamp-2': !expandedIds.has(record.id) }"
                  >
                    {{ record.cardDescription }}
                  </p>
                  <button
                    v-if="record.cardDescription.length > 80"
                    class="mt-1 text-[11px] text-primary hover:text-brand-400 flex items-center gap-0.5 font-medium"
                    @click="toggleExpand(record.id)"
                  >
                    {{ expandedIds.has(record.id) ? '收起' : '展开' }}
                    <ChevronDown
                      class="w-3 h-3 transition-transform"
                      :class="{ 'rotate-180': expandedIds.has(record.id) }"
                    />
                  </button>
                </div>

                <!-- Bottom row: action + amount -->
                <div
                  v-if="getActionInfo(record.action) || record.amount !== undefined"
                  class="flex items-center justify-between mt-3 pt-2.5 border-t border-border/70"
                >
                  <span
                    v-if="getActionInfo(record.action)"
                    class="text-[11px] px-2 py-0.5 rounded-full border font-medium"
                    :class="getActionInfo(record.action)?.class"
                  >
                    {{ getActionInfo(record.action)?.label }}
                  </span>
                  <span v-else />
                  <span
                    v-if="record.amount !== undefined"
                    class="text-xs font-semibold"
                    :class="record.amount >= 0 ? 'text-success' : 'text-destructive'"
                  >
                    {{ record.amount >= 0 ? '+' : '' }}{{ formatMoney(record.amount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center h-full text-center px-4">
        <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
          <History class="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p class="text-sm text-muted-foreground">
          暂无卡片记录
        </p>
        <p class="text-xs text-muted-foreground/70 mt-1">
          抽到的卡片会显示在这里
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
