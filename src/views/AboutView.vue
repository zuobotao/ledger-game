<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Info, Github, BookOpen, Scale } from 'lucide-vue-next'
import AppFooter from '@/components/AppFooter.vue'

const router = useRouter()

function goBack() {
  router.push('/')
}

function goTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <!-- Header -->
    <header class="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4 sm:px-6">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <div class="flex items-center gap-3">
          <Info class="h-5 w-5 text-primary" />
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">关于项目</h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <!-- Project intro -->
        <section class="mb-10">
          <h2 class="mb-3 text-2xl font-semibold tracking-tight text-foreground">
            什么是 Ledger？
          </h2>
          <p class="mb-3 text-muted-foreground">
            Ledger 是一款独立开发的开源财商教育模拟游戏。
            玩家在模拟环境中管理个人财务、做出投资决策、积累被动收入，
            最终目标是实现财务自由并购买自己的梦想。
          </p>
          <p class="mb-3 text-muted-foreground">
            游戏设计初衷是通过交互式游戏体验，帮助玩家理解资产、负债、
            现金流和被动收入等基本财务概念。
          </p>
        </section>

        <!-- Independent statement -->
        <section class="mb-10 rounded-xl border border-border bg-muted/30 p-6">
          <h3 class="mb-2 text-lg font-semibold text-foreground">
            独立项目声明
          </h3>
          <p class="text-muted-foreground">
            Ledger 是一个独立的开源财务模拟游戏项目。
          </p>
          <p class="mt-2 text-muted-foreground">
            Ledger 不隶属于任何第三方桌游公司、金融机构、经纪商、
            加密货币公司、硬件钱包提供商或投资服务，
            也未获得其认可或赞助，除非另有明确说明。
          </p>
          <p class="mt-2 text-sm text-muted-foreground/80">
            Ledger is an independent open-source financial simulation game.
            Ledger is not affiliated with, endorsed by, or sponsored by any
            third-party board game, financial institution, brokerage,
            cryptocurrency company, hardware wallet provider, or investment
            service unless explicitly stated otherwise.
          </p>
        </section>

        <!-- What's in the game -->
        <section class="mb-10">
          <h3 class="mb-4 text-lg font-semibold text-foreground">游戏内容</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-border p-4">
              <h4 class="mb-1 font-medium text-foreground">🎯 两个游戏阶段</h4>
              <p class="text-sm text-muted-foreground">
                原始资本积累 → 资本加速赛道，体验从工薪到财务自由的过程。
              </p>
            </div>
            <div class="rounded-lg border border-border p-4">
              <h4 class="mb-1 font-medium text-foreground">📊 多种资产类型</h4>
              <p class="text-sm text-muted-foreground">
                股票、房地产、企业、基金等，学习不同投资工具的特点。
              </p>
            </div>
            <div class="rounded-lg border border-border p-4">
              <h4 class="mb-1 font-medium text-foreground">🤖 AI 对手</h4>
              <p class="text-sm text-muted-foreground">
                支持单人模式，与 AI 对手同台竞技，练习投资决策。
              </p>
            </div>
            <div class="rounded-lg border border-border p-4">
              <h4 class="mb-1 font-medium text-foreground">📈 学习模式</h4>
              <p class="text-sm text-muted-foreground">
                AI 模拟分析帮助理解每个决策的财务影响，边玩边学。
              </p>
            </div>
          </div>
        </section>

        <!-- All fictional -->
        <section class="mb-10">
          <h3 class="mb-3 text-lg font-semibold text-foreground">所有数据均为虚构</h3>
          <p class="text-muted-foreground">
            Ledger 中出现的所有金融工具、公司名称、股票代码和市场数据均为虚构。
            它们不代表真实的证券、公司或投资产品。
          </p>
          <p class="mt-2 text-sm text-muted-foreground/80">
            游戏中的股票代码（NOVA、MEDX、GRW、BLUE、TITAN 等）
            和公司名称均为项目原创的虚构名称。
          </p>
        </section>

        <!-- Quick links -->
        <section class="mb-10">
          <h3 class="mb-4 text-lg font-semibold text-foreground">了解更多</h3>
          <div class="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              class="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary/50 hover:bg-muted/50"
              @click="goTo('/rules')"
            >
              <BookOpen class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p class="font-medium text-foreground">游戏规则</p>
                <p class="text-xs text-muted-foreground">了解玩法和机制</p>
              </div>
            </button>
            <a
              href="https://github.com/zuobotao/ledger-game"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-start gap-3 rounded-lg border border-border p-4 transition hover:border-primary/50 hover:bg-muted/50"
            >
              <Github class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p class="font-medium text-foreground">GitHub</p>
                <p class="text-xs text-muted-foreground">查看源代码</p>
              </div>
            </a>
            <button
              type="button"
              class="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary/50 hover:bg-muted/50"
              @click="goTo('/disclaimer')"
            >
              <Scale class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p class="font-medium text-foreground">免责声明</p>
                <p class="text-xs text-muted-foreground">不构成投资建议</p>
              </div>
            </button>
          </div>
        </section>

        <!-- Tech stack -->
        <section class="mb-10">
          <h3 class="mb-3 text-lg font-semibold text-foreground">技术栈</h3>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Vue 3
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              TypeScript
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Vite
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Pinia
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Tailwind CSS
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Lucide Icons
            </span>
            <span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              Vitest
            </span>
          </div>
        </section>

        <!-- License -->
        <section>
          <h3 class="mb-3 text-lg font-semibold text-foreground">开源许可</h3>
          <p class="text-muted-foreground">
            Ledger 采用 Apache License 2.0 开源许可证。
            您可以自由使用、修改和分发本项目，需遵守许可证条款。
          </p>
          <p class="mt-2 text-sm text-muted-foreground/80">
            详见项目根目录的 <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">LICENSE</code> 文件。
          </p>
        </section>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
@reference "../assets/base.css";
</style>
