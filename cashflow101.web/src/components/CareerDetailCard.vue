<script setup lang="ts">
import { computed } from 'vue'
import {
  Briefcase,
  Trash2,
  Shield,
  Package,
  Bike,
  Home,
  Car,
  ShoppingBag,
  Brush,
  FileText,
  Truck,
  Wrench,
  Heart,
  ShieldCheck,
  BookOpen,
  Flame,
  Scissors,
  ChefHat,
  Zap,
  Paintbrush,
  CarFront,
  ClipboardList,
  Store,
  DollarSign,
  Building,
  Dumbbell,
  Baby,
  Factory,
  Cog,
  Gavel,
  Stethoscope,
  Crown,
  Plane,
  Calculator,
  PenTool,
  GraduationCap,
  Pill,
  Megaphone,
  Users,
  Code,
  TrendingUp,
  Scale,
  Award,
  BarChart3,
  Rocket,
  Star,
} from 'lucide-vue-next'
import type { Career } from '@/types/game'

const props = defineProps<{
  career: Career
}>()

// 难度星级映射：easy=1, medium=2, hard=4, expert=5
const difficultyStars = computed(() => {
  const map: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 4,
    expert: 5,
  }
  return map[props.career.difficulty ?? 'easy'] ?? 1
})

const difficultyLabel = computed(() => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
    expert: '专家',
  }
  return map[props.career.difficulty ?? 'easy'] ?? '简单'
})

const totalExpenses = computed(() => {
  const e = props.career.expenses
  return e.taxes + e.mortgage + e.schoolLoan + e.carLoan + e.creditCard + e.other + e.child
})

const monthlyCashFlow = computed(() => {
  return props.career.salary - totalExpenses.value
})

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

// 图标映射
const iconMap: Record<string, unknown> = {
  Briefcase,
  Trash2,
  Shield,
  Package,
  Bike,
  Home,
  Car,
  ShoppingBag,
  Brush,
  FileText,
  Truck,
  Wrench,
  Heart,
  ShieldCheck,
  BookOpen,
  Flame,
  Scissors,
  ChefHat,
  Zap,
  Paintbrush,
  CarFront,
  ClipboardList,
  Store,
  DollarSign,
  Building,
  Dumbbell,
  Baby,
  Factory,
  Cog,
  Gavel,
  Stethoscope,
  Crown,
  Plane,
  Calculator,
  PenTool,
  GraduationCap,
  Pill,
  Megaphone,
  Users,
  Code,
  TrendingUp,
  Scale,
  Award,
  BarChart3,
  Rocket,
  Star,
}

const iconComponent = computed(() => {
  const iconName = props.career.icon ?? 'Briefcase'
  // 首字母大写匹配
  const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  return iconMap[capitalized] ?? Briefcase
})
</script>

<template>
  <div
    class="w-full bg-card text-card-foreground border border-border rounded-[var(--radius-md)] shadow-md overflow-hidden"
  >
    <!-- 头部：图标 + 职业名称 + 难度 -->
    <div class="p-5 pb-4">
      <div class="flex items-start gap-3">
        <div
          class="flex-shrink-0 w-12 h-12 rounded-[var(--radius-md)] bg-primary/15 flex items-center justify-center text-primary"
        >
          <component :is="iconComponent" class="w-6 h-6" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-foreground truncate">
            {{ career.name }}
          </h3>
          <div class="flex items-center gap-1 mt-1">
            <span class="text-xs text-muted-foreground">难度：</span>
            <div class="flex items-center">
              <Star
                v-for="i in 5"
                :key="i"
                class="w-3.5 h-3.5"
                :class="i <= difficultyStars ? 'text-amber-400 fill-amber-400' : 'text-gray-600'"
              />
            </div>
            <span class="text-xs text-muted-foreground ml-1">{{ difficultyLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="border-t border-border mx-5"></div>

    <!-- 职业简介 + 标签 -->
    <div class="p-5 pt-4">
      <p class="text-sm text-muted-foreground leading-relaxed">
        {{ career.description ?? '暂无简介' }}
      </p>
      <div v-if="career.tags && career.tags.length > 0" class="flex flex-wrap gap-1.5 mt-3">
        <span
          v-for="tag in career.tags"
          :key="tag"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="border-t border-border mx-5"></div>

    <!-- 收入 -->
    <div class="p-5 pt-4">
      <h4 class="text-sm font-semibold text-foreground mb-3">收入</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">月工资</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.salary) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">起始现金</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.startingCash) }}</span>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="border-t border-border mx-5"></div>

    <!-- 月支出 -->
    <div class="p-5 pt-4">
      <h4 class="text-sm font-semibold text-foreground mb-3">月支出</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">税金</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.taxes) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">房贷</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.mortgage) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">车贷</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.carLoan) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">学贷</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.schoolLoan) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">信用卡</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.creditCard) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">其他</span>
          <span class="font-medium text-foreground">{{ formatMoney(career.expenses.other) }}</span>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="border-t border-border mx-5"></div>

    <!-- 月现金流（突出显示） -->
    <div class="p-5">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted-foreground">月现金流</span>
        <span
          class="text-lg font-bold"
          :class="monthlyCashFlow >= 0 ? 'text-success' : 'text-destructive'"
        >
          {{ monthlyCashFlow >= 0 ? '+' : '' }}{{ formatMoney(monthlyCashFlow) }}
        </span>
      </div>
    </div>
  </div>
</template>
