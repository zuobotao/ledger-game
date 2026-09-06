<script setup lang="ts">
import { computed } from 'vue'
import { HeartHandshake, Star } from 'lucide-vue-next'
import type { Dream } from '@/types/game'

const props = defineProps<{ dream: Dream }>()

const categoryLabels: Record<string, string> = {
  lifestyle: '生活方式',
  charity: '慈善公益',
  investment: '投资收藏',
  career: '事业发展',
  family: '家庭',
  freedom: '自由',
}

const categoryLabel = computed(() => categoryLabels[props.dream.category ?? ''] ?? '其他')

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}
</script>

<template>
  <div class="w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
    <div class="border-b border-border bg-secondary/30 p-5">
      <div class="flex items-start gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <HeartHandshake class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-lg font-semibold text-foreground">{{ dream.name }}</h3>
          <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded-full bg-secondary px-2 py-0.5">{{ categoryLabel }}</span>
            <span class="inline-flex items-center gap-1 text-amber-400"><Star class="h-3 w-3 fill-current" />人生愿景</span>
          </div>
        </div>
      </div>
    </div>
    <div class="space-y-4 p-5">
      <p class="text-sm leading-6 text-muted-foreground">{{ dream.description }}</p>
      <div class="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
        <span class="text-xs text-muted-foreground">目标成本</span>
        <span class="font-semibold text-success">{{ formatMoney(dream.price) }}</span>
      </div>
      <div>
        <h4 class="mb-2 text-sm font-semibold text-foreground">憧憬画面</h4>
        <p class="text-sm leading-6 text-foreground/80">{{ dream.story }}</p>
      </div>
    </div>
  </div>
</template>
