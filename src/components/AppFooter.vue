<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goTo(route: string) {
  router.push(route)
}
</script>

<template>
  <footer class="border-t border-border bg-background/80 backdrop-blur-sm">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <!-- Brand -->
        <div class="flex-shrink-0">
          <h3 class="text-lg font-semibold tracking-tight text-foreground">Ledger</h3>
          <p class="mt-1 max-w-xs text-sm text-muted-foreground">
            财商教育模拟游戏
          </p>
          <p class="mt-1 max-w-xs text-xs text-muted-foreground/70">
            Educational financial decision simulation game.
          </p>
        </div>

        <!-- Links -->
        <div class="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              游戏
            </span>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/')"
            >
              首页
            </button>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/rules')"
            >
              游戏规则
            </button>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/history')"
            >
              历史对局
            </button>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              法律
            </span>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/terms')"
            >
              服务条款
            </button>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/privacy')"
            >
              隐私政策
            </button>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/disclaimer')"
            >
              免责声明
            </button>
          </div>

          <div class="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              项目
            </span>
            <button
              type="button"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
              @click="goTo('/about')"
            >
              关于项目
            </button>
            <a
              href="https://github.com/zuobotao/ledger-game"
              target="_blank"
              rel="noopener noreferrer"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://github.com/zuobotao/ledger-game/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class="text-left text-sm text-muted-foreground transition hover:text-foreground"
            >
              License
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-muted-foreground/70">
          © 2026 Ledger Project Contributors. Licensed under Apache 2.0.
        </p>
        <p class="text-xs text-muted-foreground/60">
          本游戏为教育与娱乐模拟工具，不构成任何投资建议。
          所有金融数据均为虚构。
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
@reference "../assets/base.css";
</style>
