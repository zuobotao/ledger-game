<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, AlertTriangle } from 'lucide-vue-next'
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
          <AlertTriangle class="h-5 w-5 text-amber-500" />
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">免责声明</h1>
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

          <div class="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p class="m-0 font-semibold text-amber-500">
              重要提示
            </p>
            <p class="mb-0 mt-2 text-sm text-muted-foreground">
              Ledger 是一款教育与娱乐性质的财务决策模拟游戏，不构成任何投资建议。
              游戏中的所有金融数据均为虚构。
            </p>
          </div>

          <h2>Ledger 是一款教育与娱乐模拟游戏</h2>
          <p>
            Ledger 是一款财务决策模拟游戏，仅用于教育和娱乐目的。
            它<strong>不是</strong>金融咨询服务、投资工具或经纪平台。
          </p>

          <h2>不提供金融、投资或专业建议</h2>
          <p>
            Ledger 不提供金融、投资、税务、会计、法律或其他专业建议。
          </p>
          <p>
            游戏中的所有内容——包括股票价格、房地产价值、商业机会、市场事件、AI 生成的分析、
            策略比较和财务结果——均为<strong>虚构和模拟的</strong>。
          </p>

          <h2>模拟结果不代表现实表现</h2>
          <p>
            模拟的收益、价格、概率和结果不代表实际或预期的现实世界投资表现。
            游戏的财务模型经过简化，仅用于教育目的，不反映真实金融市场的复杂性、风险或现实情况。
          </p>

          <h2>AI 功能仅限游戏内使用</h2>
          <p>
            Ledger 中的任何 AI 功能（如策略分析或学习模式建议）
            <strong>仅在游戏的模拟环境中运行</strong>。它们：
          </p>
          <ul>
            <li>使用虚构游戏数据比较游戏策略</li>
            <li>不提供个性化投资建议</li>
            <li>不推荐真实证券或金融产品</li>
            <li>不考虑任何用户的真实财务状况</li>
          </ul>

          <h2>不构成建议</h2>
          <p>Ledger 中的任何内容均不应被解释为：</p>
          <ul>
            <li>买入、卖出或持有任何证券的建议</li>
            <li>任何形式的投资建议</li>
            <li>财务规划指导</li>
            <li>对任何投资策略的认可</li>
            <li>对任何财务结果的保证</li>
          </ul>

          <h2>用户不应基于 Ledger 做出现实决策</h2>
          <p>
            用户不应仅根据 Ledger 或其 AI 功能生成的信息做出现实世界的财务决策。
            对于实际财务问题，请咨询合格的财务顾问、会计师或法律专业人士。
          </p>

          <h2>所有金融工具均为虚构</h2>
          <p>
            Ledger 中显示的所有金融工具——包括股票、房地产、企业、基金和其他投资——
            均为虚构或模拟的。除非另有明确说明，否则它们不代表真实的证券、公司或投资产品。
          </p>
          <p>
            游戏中使用的股票代码（如 NOVA、MEDX、GRW、BLUE、TITAN 等）
            和公司名称（如新星科技、麦迪医疗等）均为原创虚构名称，
            不对应任何真实的上市公司。
          </p>

          <h2>不作担保</h2>
          <p>
            游戏及其所有内容按"原样"提供，不提供任何明示或暗示的担保。
            详见服务条款。
          </p>

          <hr />

          <h2>English Version</h2>

          <h3>Ledger is an educational and entertainment simulation.</h3>
          <p>
            Ledger is a financial decision simulation game designed for educational and entertainment purposes only.
            It is NOT a financial advisory service, investment tool, or brokerage platform.
          </p>

          <h3>No Financial, Investment, or Professional Advice</h3>
          <p>
            Ledger does not provide financial, investment, tax, accounting, legal, or other professional advice.
          </p>
          <p>
            All content within the game — including stock prices, real estate values, business opportunities,
            market events, AI-generated analysis, strategy comparisons, and financial outcomes —
            is <strong>fictional and simulated</strong>.
          </p>

          <h3>Simulated Results Are Not Real-World Indicators</h3>
          <p>
            Simulated returns, prices, probabilities, and outcomes do not represent actual or expected
            real-world investment performance. The game's financial models are simplified for educational
            purposes and do not reflect the complexity, risks, or realities of actual financial markets.
          </p>

          <h3>AI Features Are Game-Only</h3>
          <p>
            Any AI-powered features in Ledger operate exclusively within the game's simulated environment. They:
          </p>
          <ul>
            <li>Compare game strategies using fictional game data</li>
            <li>Do not provide personalized investment advice</li>
            <li>Do not recommend real securities or financial products</li>
            <li>Do not consider any user's real financial situation</li>
          </ul>

          <h3>Not a Recommendation</h3>
          <p>Nothing in Ledger should be construed as:</p>
          <ul>
            <li>A recommendation to buy, sell, or hold any security</li>
            <li>Investment advice of any kind</li>
            <li>Financial planning guidance</li>
            <li>An endorsement of any investment strategy</li>
            <li>A guarantee of any financial outcome</li>
          </ul>

          <h3>Users Should Not Rely on Ledger for Real-World Decisions</h3>
          <p>
            Users should not make real-world financial decisions based solely on information generated by
            Ledger or its AI features. For actual financial matters, please consult a qualified
            financial advisor, accountant, or legal professional.
          </p>

          <h3>No Warranty</h3>
          <p>
            The game and all its content are provided "as is" without any warranty of any kind,
            either express or implied. See the Terms of Use for more details.
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
