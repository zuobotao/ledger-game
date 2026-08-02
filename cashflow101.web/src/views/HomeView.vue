<script setup lang="ts">
import { Play, HelpCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()

function goToSetup() {
  router.push({ name: 'setup' })
}

function goToRules() {
  router.push({ name: 'rules' })
}
</script>

<template>
  <main>
    <div
      class="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center"
    >
      <span class="absolute right-6 top-6 font-mono text-xs tracking-wide text-muted-foreground"
        >v0.1</span
      >

      <div class="mx-auto max-w-2xl">
        <h1
          class="mb-4 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl"
        >
          Cashflow 101
        </h1>
        <p class="mb-6 text-xl font-medium text-foreground sm:text-2xl">罗伯特·清崎经典财商桌游</p>
        <p
          class="mx-auto mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          完成原始资本积累，进入资本游戏。练习投资、管理资产负债、实现财务自由。
        </p>

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            data-dom-id="btn-start"
            class="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            @click="goToSetup"
          >
            <Play class="h-5 w-5" />
            开始游戏
          </button>
          <button
            type="button"
            @click="goToRules"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <HelpCircle class="h-5 w-5" />
            游戏规则
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
