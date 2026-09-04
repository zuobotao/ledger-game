<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, ShieldCheck } from 'lucide-vue-next'
import AppFooter from '@/components/AppFooter.vue'

const router = useRouter()

function goBack() {
  router.push('/')
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
          <ShieldCheck class="h-5 w-5 text-primary" />
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">隐私政策</h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <article class="prose prose-invert max-w-none">
          <p class="text-sm text-muted-foreground">
            最后更新：2026-09-04
          </p>

          <div class="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p class="m-0 font-semibold text-primary">
              简而言之：Ledger 不收集您的任何个人数据。
            </p>
            <p class="mb-0 mt-2 text-sm text-muted-foreground">
              所有游戏数据仅保存在您的浏览器本地，永远不会发送到任何服务器。
            </p>
          </div>

          <h2>1. 我们对隐私的承诺</h2>
          <p>
            您的隐私对我们很重要。本隐私政策解释了 Ledger（以下简称"本游戏"或"本服务"）
            收集哪些信息、如何使用这些信息，以及您对数据的权利。
          </p>

          <h2>2. 我们收集的信息</h2>
          <h3>2.1 不收集个人信息</h3>
          <p><strong>Ledger 不收集以下任何信息：</strong></p>
          <ul>
            <li>您的姓名、电子邮件地址或电话号码</li>
            <li>您的物理位置或 IP 地址</li>
            <li>您的身份或个人标识符</li>
            <li>您的财务信息或银行详细信息</li>
            <li>您的支付信息</li>
            <li>任何个人身份信息（PII）</li>
          </ul>

          <h3>2.2 仅本地存储</h3>
          <p>
            所有游戏数据<strong>仅存储在您的浏览器本地</strong>，使用：
          </p>
          <ul>
            <li><code>localStorage</code> — 用于游戏状态和设置</li>
            <li><code>IndexedDB</code> — 用于游戏历史记录</li>
          </ul>
          <p>这些数据：</p>
          <ul>
            <li>永远不会离开您的设备</li>
            <li>永远不会发送到任何服务器</li>
            <li>永远不会与第三方共享</li>
            <li>完全由您控制</li>
          </ul>
          <p>
            您可以随时通过清除 Ledger 网站的浏览器存储来删除这些数据。
          </p>

          <h2>3. Cookie 和追踪</h2>
          <h3>3.1 不使用追踪 Cookie</h3>
          <p>
            Ledger 不使用 Cookie 进行追踪、广告或分析。
          </p>
          <p>
            游戏可能使用浏览器存储机制（localStorage、IndexedDB），
            但纯粹用于游戏功能——保存您的进度和游戏历史。
            这些不会用于跨网站追踪。
          </p>

          <h3>3.2 不使用分析工具</h3>
          <p><strong>Ledger 不使用任何第三方分析工具。</strong>我们不追踪：</p>
          <ul>
            <li>页面浏览量</li>
            <li>用户行为</li>
            <li>点击模式</li>
            <li>会话时长</li>
            <li>任何用户活动指标</li>
          </ul>

          <h2>4. 第三方服务</h2>
          <h3>4.1 不共享数据</h3>
          <p>
            我们不与第三方共享任何数据，因为我们不收集任何数据。
          </p>

          <h3>4.2 第三方库</h3>
          <p>
            Ledger 使用开源软件库。这些库：
          </p>
          <ul>
            <li>在您的浏览器本地运行</li>
            <li>不收集或传输您的数据</li>
            <li>列于 <code>THIRD_PARTY_NOTICES.md</code> 中</li>
          </ul>

          <h3>4.3 AI 功能</h3>
          <p>
            目前，所有 AI 决策逻辑都使用确定性算法在您的浏览器本地运行——不调用外部 AI API。
          </p>
          <p>如果将来添加外部 AI 功能：</p>
          <ul>
            <li>仅发送虚构的游戏状态数据</li>
            <li>不包含任何个人信息</li>
            <li>将明确披露具体的 AI 提供商及其数据处理方式</li>
            <li>您可以选择退出</li>
          </ul>
          <p>详见 <code>docs/legal/AI_DATA_POLICY.md</code>。</p>

          <h2>5. 数据保留</h2>
          <p>
            由于我们不在服务器上存储任何数据，因此不保留任何数据。
          </p>
          <p>
            您的游戏数据<strong>仅存储在您的设备上</strong>，并持续存在，直到：
          </p>
          <ul>
            <li>您从游戏中删除它</li>
            <li>您清除浏览器存储</li>
            <li>您卸载浏览器或清除浏览数据</li>
          </ul>

          <h2>6. 您的数据权利</h2>
          <p>
            由于我们不在服务器上持有您的任何数据，您拥有完全的控制权：
          </p>
          <ul>
            <li><strong>访问：</strong>您的游戏数据在浏览器本地存储中</li>
            <li><strong>删除：</strong>清除浏览器存储，或使用游戏内的"清除历史记录"功能</li>
            <li><strong>导出：</strong>游戏历史存储在本地，您可以在游戏中查看</li>
          </ul>

          <h2>7. 儿童隐私</h2>
          <p>
            Ledger 是面向大众的教育游戏。我们不会有意收集儿童的个人信息。
            由于我们完全不收集数据，儿童可以安全使用游戏，不会收集任何个人信息。
          </p>

          <h2>8. 安全性</h2>
          <p>
            虽然通过互联网传输的数据不能保证 100% 安全，但 Ledger 的架构最大限度地降低了风险：
          </p>
          <ul>
            <li>没有数据发送到服务器</li>
            <li>所有数据都保留在您的本地浏览器中</li>
            <li>不需要用户账户或身份验证</li>
            <li>不收集或存储个人数据</li>
          </ul>

          <h2>9. 本政策的变更</h2>
          <p>
            我们可能会不时更新本隐私政策。我们将通过更新页面顶部的"最后更新"日期通知您任何变更。
          </p>
          <p>如果我们将来引入数据收集功能，我们将：</p>
          <ul>
            <li>明确说明收集哪些数据</li>
            <li>解释收集原因</li>
            <li>尽可能提供退出选项</li>
            <li>在实施前更新本政策</li>
          </ul>

          <h2>10. 联系我们</h2>
          <p>
            对本隐私政策有疑问，请在 Ledger 的 GitHub 仓库中提出 Issue。
          </p>

          <hr />

          <h2>English Summary</h2>
          <p>
            <strong>No personal data collected:</strong> Ledger is a client-side browser game. No personal data is collected.
          </p>
          <p>
            <strong>Local storage only:</strong> All game data is stored locally in your browser (localStorage / IndexedDB).
          </p>
          <p>
            <strong>No tracking:</strong> No analytics tools or tracking technologies are used.
          </p>
          <p>
            <strong>No third-party sharing:</strong> No data is shared with third parties because no data is collected.
          </p>
          <p>
            <strong>Your rights:</strong> You can delete all game data at any time by clearing your browser storage.
          </p>
        </article>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
@reference "../assets/base.css";

.prose {
  @apply text-base leading-relaxed;
}

.prose h2 {
  @apply mt-8 mb-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl;
}

.prose h3 {
  @apply mt-6 mb-2 text-base font-semibold text-foreground;
}

.prose p {
  @apply mb-3 text-muted-foreground;
}

.prose ul {
  @apply mb-3 ml-5 list-disc space-y-1 text-muted-foreground;
}

.prose strong {
  @apply font-semibold text-foreground;
}

.prose code {
  @apply rounded bg-muted px-1.5 py-0.5 font-mono text-xs;
}

.prose hr {
  @apply my-8 border-border;
}
</style>
