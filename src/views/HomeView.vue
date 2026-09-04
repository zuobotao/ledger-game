<script setup lang="ts">
import { Play, HelpCircle, History } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppFooter from '@/components/AppFooter.vue'

const router = useRouter()

function goToSetup() {
  router.push({ name: 'setup' })
}

function goToRules() {
  router.push({ name: 'rules' })
}

function goToHistory() {
  router.push({ name: 'history' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <main class="flex-1">
      <div
        class="relative flex min-h-[80vh] flex-col items-center justify-center bg-background px-6 py-16 text-center"
      >
        <span class="absolute right-6 top-6 font-mono text-xs tracking-wide text-muted-foreground"
          >v2.0</span
        >

        <div class="mx-auto max-w-2xl">
          <h1
            class="mb-4 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Ledger
          </h1>
          <p class="mb-6 text-xl font-medium text-foreground sm:text-2xl">财商教育模拟游戏</p>
          <p
            class="mx-auto mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            通过模拟个人财务与投资场景，学习资产负债管理，
            完成原始资本积累，练习投资决策、建立被动收入，走向财务自由。
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

          <div class="mt-6">
            <button
              type="button"
              @click="goToHistory"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <History class="h-4 w-4" />
              历史对局
            </button>
          </div>

          <p class="mt-12 max-w-md text-xs text-muted-foreground/60">
            本游戏为财商教育模拟工具，仅供学习交流使用。
            所有场景、人物、数据均为虚构，不构成任何投资建议。
          </p>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
