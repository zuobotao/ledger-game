<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Shuffle, Check, Briefcase, TrendingUp, TrendingDown } from 'lucide-vue-next'
import { CAREERS, getRandomCareer } from '@/data/careers'
import type { Career } from '@/types/game'

interface Props {
  modelValue: string
  showRandom?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showRandom: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', career: Career): void
}>()

// 难度筛选
const difficultyFilter = ref<string>('all')
const difficulties = [
  { id: 'all', name: '全部' },
  { id: 'easy', name: '简单' },
  { id: 'medium', name: '中等' },
  { id: 'hard', name: '困难' },
  { id: 'expert', name: '专家' },
]

// 搜索
const searchQuery = ref('')

// 筛选后的职业列表
const filteredCareers = computed(() => {
  let list = [...CAREERS]
  if (difficultyFilter.value !== 'all') {
    list = list.filter((c) => c.difficulty === difficultyFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)),
    )
  }
  return list
})

// 按难度分组
const groupedCareers = computed(() => {
  const groups: Record<string, Career[]> = {
    easy: [],
    medium: [],
    hard: [],
    expert: [],
  }
  filteredCareers.value.forEach((c) => {
    const diff = c.difficulty ?? 'medium'
    if (groups[diff]) {
      groups[diff].push(c)
    }
  })
  return groups
})

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  hard: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const difficultyNames: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
}

function formatMoney(n: number): string {
  if (n >= 10000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function calcTotalExpenses(expenses: Career['expenses']): number {
  return expenses.taxes + expenses.mortgage + expenses.schoolLoan + expenses.carLoan + expenses.creditCard + expenses.other + expenses.child
}

function selectCareer(career: Career) {
  emit('update:modelValue', career.id)
  emit('select', career)
}

function selectRandom() {
  const career = getRandomCareer()
  emit('update:modelValue', career.id)
  emit('select', career)
}

function isSelected(careerId: string): boolean {
  return props.modelValue === careerId
}
</script>

<template>
  <div class="career-selector space-y-4">
    <!-- 搜索栏 + 难度筛选 -->
    <div class="space-y-3">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索职业名称、标签..."
          class="w-full h-10 px-3 pl-9 bg-background border border-input rounded-[var(--radius-md)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm"
        />
        <Briefcase class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="diff in difficulties"
          :key="diff.id"
          type="button"
          class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
          :class="
            difficultyFilter === diff.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground'
          "
          @click="difficultyFilter = diff.id"
        >
          {{ diff.name }}
        </button>
      </div>
    </div>

    <!-- 随机职业卡片（特殊样式） -->
    <div v-if="showRandom" class="space-y-2">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">随机</p>
      <button
        type="button"
        class="w-full p-3 rounded-[var(--radius-md)] border-2 border-dashed transition-all text-left"
        :class="
          modelValue === 'random'
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-muted-foreground bg-background'
        "
        @click="selectRandom"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="modelValue === 'random' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'"
          >
            <Shuffle class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-foreground">随机职业</span>
              <span
                v-if="modelValue === 'random'"
                class="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary"
              >
                <Check class="w-3 h-3" />
                已选
              </span>
            </div>
            <p class="text-xs text-muted-foreground">
              命运的安排，随机获得一个职业开始游戏
            </p>
          </div>
        </div>
      </button>
    </div>

    <!-- 职业卡片网格 -->
    <div class="space-y-4 max-h-[400px] overflow-y-auto pr-1">
      <template v-for="diff in ['easy', 'medium', 'hard', 'expert']" :key="diff">
        <div v-if="(groupedCareers[diff]?.length ?? 0) > 0" class="space-y-2">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border"
              :class="difficultyColors[diff]"
            >
              {{ difficultyNames[diff] }}
            </span>
            <span class="text-[10px] text-muted-foreground">
              {{ groupedCareers[diff]?.length ?? 0 }} 个职业
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="career in groupedCareers[diff]"
              :key="career.id"
              type="button"
              class="p-3 rounded-[var(--radius-md)] border transition-all text-left group"
              :class="
                isSelected(career.id)
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-background hover:border-muted-foreground hover:bg-secondary/30'
              "
              @click="selectCareer(career)"
            >
              <div class="flex items-start gap-2.5">
                <div
                  class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  :class="
                    isSelected(career.id)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                  "
                >
                  <Briefcase class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="text-sm font-semibold truncate"
                      :class="isSelected(career.id) ? 'text-primary' : 'text-foreground'"
                    >
                      {{ career.name }}
                    </span>
                    <Check
                      v-if="isSelected(career.id)"
                      class="w-3.5 h-3.5 text-primary shrink-0"
                    />
                  </div>
                  <div class="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span class="inline-flex items-center gap-0.5 text-emerald-400">
                      <TrendingUp class="w-3 h-3" />
                      {{ formatMoney(career.salary) }}
                    </span>
                    <span class="text-border">|</span>
                    <span class="inline-flex items-center gap-0.5 text-orange-400">
                      <TrendingDown class="w-3 h-3" />
                      {{ formatMoney(calcTotalExpenses(career.expenses)) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    <span
                      v-for="tag in career.tags?.slice(0, 2)"
                      :key="tag"
                      class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </template>

      <!-- 无结果 -->
      <div
        v-if="filteredCareers.length === 0"
        class="py-8 text-center text-muted-foreground text-sm"
      >
        <Briefcase class="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>没有找到匹配的职业</p>
        <p class="text-xs mt-1">试试其他筛选条件</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/base.css";

.career-selector {
  /* 自定义滚动条 */
}

.max-h-\[400px\]::-webkit-scrollbar {
  width: 6px;
}
.max-h-\[400px\]::-webkit-scrollbar-track {
  background: var(--color-muted);
  border-radius: 3px;
}
.max-h-\[400px\]::-webkit-scrollbar-thumb {
  background: var(--color-gray-600);
  border-radius: 3px;
}
.max-h-\[400px\]::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-500);
}
</style>
