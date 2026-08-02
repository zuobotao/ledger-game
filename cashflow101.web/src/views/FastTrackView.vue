<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <main class="min-h-screen bg-background p-6">
    <div class="mx-auto max-w-5xl">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-foreground">快车道</h1>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          @click="goHome"
        >
          <ArrowLeft class="h-4 w-4" />
          返回首页
        </button>
      </header>

      <div class="rounded-[var(--radius-lg)] border border-border bg-card p-8 text-center shadow-sm">
        <p class="text-muted-foreground">快车道开发中</p>
      </div>
    </div>
  </main>
</template>
