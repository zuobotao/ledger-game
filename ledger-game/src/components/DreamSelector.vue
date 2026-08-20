<script setup lang="ts">
import { computed } from 'vue'
import {
  Plane,
  Home,
  Car,
  Ship,
  HeartHandshake,
  GraduationCap,
  Palmtree,
  Rocket,
  Lightbulb,
  Building,
  Globe,
  Palette,
  Sunset,
  Check,
  Shuffle,
  Star,
} from 'lucide-vue-next'
import type { Dream } from '@/types/game'
import { getRandomDream } from '@/data/dreams'

const props = defineProps<{
  modelValue: string | null
  dreams: Dream[]
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

// 类别标签
const categoryLabels: Record<string, string> = {
  lifestyle: '生活方式',
  charity: '慈善公益',
  investment: '投资收藏',
  career: '事业发展',
  family: '家庭',
  freedom: '自由',
}

// 类别渐变背景（顶部色条）
const categoryGradients: Record<string, string> = {
  lifestyle: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
  charity: 'linear-gradient(90deg, #ef4444, #ec4899)',
  investment: 'linear-gradient(90deg, #f59e0b, #f97316)',
  career: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
  family: 'linear-gradient(90deg, #ec4899, #a855f7)',
  freedom: 'linear-gradient(90deg, #10b981, #06b6d4)',
}

// 类别主色（用于图标等）
const categoryColors: Record<string, string> = {
  lifestyle: '#06b6d4',
  charity: '#ef4444',
  investment: '#f59e0b',
  career: '#8b5cf6',
  family: '#ec4899',
  freedom: '#10b981',
}

// 图标映射
const iconMap: Record<string, unknown> = {
  plane: Plane,
  home: Home,
  car: Car,
  ship: Ship,
  'heart-handshake': HeartHandshake,
  'graduation-cap': GraduationCap,
  palmtree: Palmtree,
  rocket: Rocket,
  lightbulb: Lightbulb,
  building: Building,
  globe: Globe,
  palette: Palette,
  sunset: Sunset,
}

function getIcon(dream: Dream) {
  return iconMap[dream.icon] ?? Star
}

function getCategoryGradient(category?: string): string {
  const key = category ?? 'lifestyle'
  return categoryGradients[key] ?? 'linear-gradient(90deg, #06b6d4, #3b82f6)'
}

function getCategoryColor(category?: string): string {
  const key = category ?? 'lifestyle'
  return categoryColors[key] ?? '#06b6d4'
}

function getCategoryLabel(category?: string): string {
  if (!category) return '其他'
  return categoryLabels[category] ?? category
}

function isSelected(dream: Dream): boolean {
  return props.modelValue === dream.id
}

function selectDream(dream: Dream) {
  emit('update:modelValue', dream.id)
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function randomDream() {
  const dream = getRandomDream()
  emit('update:modelValue', dream.id)
}

const selectedDream = computed(() => {
  if (!props.modelValue) return null
  return props.dreams.find((d) => d.id === props.modelValue) ?? null
})
</script>

<template>
  <div class="w-full">
    <!-- 标题区域 -->
    <div class="text-center mb-6">
      <h2 class="text-xl sm:text-2xl font-semibold text-foreground">选择你的梦想</h2>
      <p class="text-sm text-muted-foreground mt-1">实现梦想是资本游戏的终极目标</p>
    </div>

    <!-- 已选梦想展示 + 随机按钮 -->
    <div class="flex items-center justify-between mb-4">
      <div v-if="selectedDream" class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">已选：</span>
        <span class="font-medium text-foreground">{{ selectedDream.name }}</span>
        <span class="text-success font-semibold">{{ formatMoney(selectedDream.price) }}</span>
      </div>
      <div v-else class="text-sm text-muted-foreground">
        请选择一个梦想
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        @click="randomDream"
      >
        <Shuffle class="w-3.5 h-3.5" />
        随机
      </button>
    </div>

    <!-- 梦想卡片网格 -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      <button
        v-for="dream in dreams"
        :key="dream.id"
        type="button"
        class="group relative flex flex-col items-center bg-card border rounded-[var(--radius-md)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        :class="[
          isSelected(dream)
            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
            : 'border-border hover:border-gray-500',
        ]"
        @click="selectDream(dream)"
      >
        <!-- 顶部渐变色条 -->
        <div
          class="w-full h-2"
          :style="{ background: getCategoryGradient(dream.category) }"
        ></div>

        <!-- 选中角标 -->
        <div
          v-if="isSelected(dream)"
          class="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md z-10"
        >
          <Check class="w-4 h-4 text-gray-900" />
        </div>

        <!-- 图标 -->
        <div class="pt-5 pb-3">
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center"
            :style="{ background: `${getCategoryGradient(dream.category)}20` }"
          >
            <component
              :is="getIcon(dream)"
              class="w-7 h-7"
              :style="{ color: getCategoryColor(dream.category) }"
            />
          </div>
        </div>

        <!-- 梦想名称 -->
        <div class="px-3 text-center">
          <h3 class="text-sm font-semibold text-foreground">{{ dream.name }}</h3>
        </div>

        <!-- 价格 -->
        <div class="mt-1 px-3">
          <span class="text-base font-bold text-success">
            {{ formatMoney(dream.price) }}
          </span>
        </div>

        <!-- 类别标签 -->
        <div class="mt-2 pb-4 px-3">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground bg-secondary"
          >
            {{ getCategoryLabel(dream.category) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
