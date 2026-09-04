<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, FileText } from 'lucide-vue-next'
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
          <FileText class="h-5 w-5 text-primary" />
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">服务条款</h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <article class="prose max-w-none">
          <p class="text-sm text-muted-foreground">
            最后更新：2026-09-04
          </p>

          <h2>1. 接受条款</h2>
          <p>
            欢迎使用 Ledger（以下简称"本游戏"或"本服务"）。访问或使用 Ledger 即表示您同意受本服务条款的约束。
            如果您不同意这些条款，请不要使用本服务。
          </p>
          <p>
            Ledger 是一个由 Ledger 项目贡献者运营的开源项目。
          </p>

          <h2>2. 服务说明</h2>
          <p>
            Ledger 是一款<strong>财务决策模拟游戏</strong>，仅用于教育和娱乐目的。它允许用户：
          </p>
          <ul>
            <li>游玩棋盘风格的财务模拟游戏</li>
            <li>通过游戏学习个人理财概念</li>
            <li>在模拟环境中练习投资决策</li>
            <li>在浏览器本地保存游戏进度</li>
          </ul>
          <p>
            Ledger <strong>不是</strong>金融咨询服务、经纪商、银行或投资平台。
          </p>

          <h2>3. 教育与娱乐性质</h2>
          <p>
            Ledger 仅用于教育和娱乐目的。
          </p>
          <ul>
            <li>游戏中的所有金融数据均为虚构和模拟</li>
            <li>股票代码、公司名称和市场事件均非真实</li>
            <li>游戏结果不代表真实的投资表现</li>
            <li>游戏不跟踪或反映真实金融市场</li>
          </ul>

          <h2>4. 不构成投资建议</h2>
          <p>
            <strong>Ledger 中的任何内容均不构成金融、投资、税务、会计或法律建议。</strong>
          </p>
          <ul>
            <li>游戏中的 AI 功能仅提供游戏内的策略分析</li>
            <li>任何功能都不推荐真实证券或投资</li>
            <li>任何功能都不考虑您的个人财务状况</li>
            <li>您不应基于游戏做出现实的财务决策</li>
          </ul>
          <p>
            实际财务问题请咨询合格的财务顾问、会计师或法律专业人士。
          </p>

          <h2>5. 不作担保</h2>
          <p>
            本服务按"原样"和"可用"基础提供，不提供任何明示或暗示的担保，
            包括但不限于对适销性、特定用途适用性、所有权和非侵权性的暗示担保。
          </p>
          <p>我们不保证：</p>
          <ul>
            <li>服务将不间断或无错误</li>
            <li>缺陷将被纠正</li>
            <li>服务不含病毒或其他有害成分</li>
          </ul>

          <h2>6. 模拟限制</h2>
          <p>
            Ledger 中使用的财务模型经过简化，仅用于教育目的。它们不：
          </p>
          <ul>
            <li>反映真实世界市场的复杂性</li>
            <li>考虑所有类型的金融风险</li>
            <li>代表实际的投资回报</li>
            <li>考虑通胀、税收（简化的游戏机制除外）或监管因素</li>
            <li>提供现实的财务规划</li>
          </ul>

          <h2>7. 第三方服务</h2>
          <p>
            Ledger 可能集成或引用第三方服务、库或 API。
            使用此类第三方服务需遵守其各自的条款和隐私政策。
          </p>
          <p>Ledger 项目贡献者不对以下事项负责：</p>
          <ul>
            <li>第三方服务的内容或做法</li>
            <li>因使用第三方服务而产生的任何损害</li>
            <li>第三方服务的可用性或可靠性</li>
          </ul>

          <h2>8. 知识产权</h2>
          <h3>8.1 Ledger 内容</h3>
          <p>
            Ledger 的源代码、游戏设计、卡牌内容、UI 设计、视觉素材和文档
            归 Ledger 项目贡献者所有，依据 Apache License, Version 2.0 授权。
            详见 <code>LICENSE</code> 文件。
          </p>
          <h3>8.2 第三方内容</h3>
          <p>
            本服务包含第三方软件、图标和库。
            完整归属和许可详情请见 <code>THIRD_PARTY_NOTICES.md</code>。
          </p>

          <h2>9. 可接受的使用</h2>
          <p>您同意不会：</p>
          <ul>
            <li>将服务用于任何非法目的</li>
            <li>试图规避任何安全或访问控制</li>
            <li>使用服务骚扰、虐待或伤害他人</li>
            <li>干扰或破坏服务或其基础设施</li>
            <li>冒充任何人或实体</li>
            <li>以可能损坏、禁用或损害服务的方式使用服务</li>
          </ul>

          <h2>10. 责任限制</h2>
          <p>
            在适用法律允许的最大范围内，Ledger 项目贡献者不对任何间接、附带、特殊、后果性或惩罚性损害，
            或任何利润、收入、数据或使用损失承担责任。
          </p>
          <p>
            在任何情况下，Ledger 项目贡献者的总累计责任均不应超过您为使用服务支付的金额（如有）。
          </p>

          <h2>11. 服务变更</h2>
          <p>我们保留以下权利：</p>
          <ul>
            <li>随时修改或中止服务</li>
            <li>更新本服务条款</li>
            <li>更改功能、特性或内容</li>
          </ul>
          <p>
            重大变更将通过更新上方的"最后更新"日期通知。
            继续使用服务即表示您接受更新后的条款。
          </p>

          <h2>12. 联系我们</h2>
          <p>
            关于本服务条款的问题，请在 Ledger 的 GitHub 仓库中提出 Issue。
          </p>

          <hr />

          <h2>English Summary</h2>
          <p>
            <strong>Service Nature:</strong> Ledger is an educational and entertainment simulation game. It does not constitute investment advice.
          </p>
          <p>
            <strong>No Warranty:</strong> The game is provided "as is" without any express or implied warranty.
          </p>
          <p>
            <strong>Limitation of Liability:</strong> Project contributors are not liable for any indirect, incidental, special, or consequential damages.
          </p>
          <p>
            <strong>IP:</strong> Game code and content are open source under Apache 2.0.
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
