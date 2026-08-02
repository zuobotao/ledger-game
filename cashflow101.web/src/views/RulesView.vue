<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  BookOpen,
  Rat,
  Rocket,
  Layers,
  Target,
  Users,
  Trophy,
  Wallet,
  Scale,
  Gift,
  Baby,
  HeartHandshake,
  Briefcase,
  TrendingUp,
  Building2,
  PieChart,
  Zap,
  Coins,
  Sparkles,
  ShoppingBag,
  Star,
} from 'lucide-vue-next'

const router = useRouter()

type TabId = 'intro' | 'ratrace' | 'fasttrack' | 'cards'

const activeTab = ref<TabId>('intro')

const tabs = [
  { id: 'intro' as const, label: '游戏简介', icon: BookOpen },
  { id: 'ratrace' as const, label: '老鼠赛跑', icon: Rat },
  { id: 'fasttrack' as const, label: '快车道', icon: Rocket },
  { id: 'cards' as const, label: '卡牌类型', icon: Layers },
]

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- 顶部导航栏 -->
    <header class="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          @click="goHome"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">游戏规则</h1>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-8 md:flex-row md:gap-10">
        <!-- 左侧 Tab 导航 -->
        <nav class="md:w-56 md:flex-shrink-0">
          <ul class="flex gap-2 overflow-x-auto pb-2 md:flex md:flex-col md:gap-1 md:overflow-visible">
            <li v-for="tab in tabs" :key="tab.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 whitespace-nowrap rounded-md px-4 py-3 text-sm font-medium transition md:whitespace-normal"
                :class="
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/30 text-foreground hover:bg-muted hover:text-foreground'
                "
                @click="activeTab = tab.id"
              >
                <component :is="tab.icon" class="h-5 w-5 flex-shrink-0" />
                <span>{{ tab.label }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <!-- 右侧内容区 -->
        <section class="flex-1 min-w-0">
          <!-- 游戏简介 -->
          <div v-if="activeTab === 'intro'" class="space-y-6">
            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Target class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">游戏目标</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                Cashflow 101 是一款财商教育桌游，由罗伯特·清崎设计。游戏的核心目标是让玩家通过模拟真实的财务决策，
                学习如何管理个人财务、进行投资、积累资产，最终实现<strong class="text-foreground">财务自由</strong>——
                即被动收入超过总支出，从而走出「老鼠赛跑」，进入财富的「快车道」。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">玩家人数</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                支持 <strong class="text-foreground">2-6 名玩家</strong> 同时游戏。每位玩家将扮演不同职业的角色，
                拥有各自的收入、支出和起始现金。职业差异带来不同的财务起点，让玩家体验不同收入水平下的财富增长策略。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Trophy class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">胜利条件</h2>
              </div>
              <div class="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>游戏分为两个阶段，胜利需要完成以下目标：</p>
                <ol class="list-decimal space-y-2 pl-5">
                  <li>
                    <strong class="text-foreground">第一阶段（老鼠赛跑）：</strong>
                    通过投资和资产配置，使你的被动收入大于等于总支出，即可进入快车道。
                  </li>
                  <li>
                    <strong class="text-foreground">第二阶段（快车道）：</strong>
                    在快车道中，你需要购买自己的「梦想」来赢得游戏。同时也可以通过投资进一步扩大财富。
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <!-- 老鼠赛跑 -->
          <div v-else-if="activeTab === 'ratrace'" class="space-y-6">
            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Wallet class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">收入与支出</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                每位玩家有一份<strong class="text-foreground">损益表</strong>，记录每月的收入和支出。
                收入包括工资（主动收入）和投资收益（被动收入）。支出包括税金、房贷、车贷、信用卡还款、其他支出和子女支出。
                每月现金流 = 总收入 - 总支出。当你经过「发工资」格子时，会获得等于当月现金流的现金。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Scale class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">资产负债表</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                <strong class="text-foreground">资产</strong>是能把钱放进你口袋的东西，如股票、房地产、企业等，它们产生现金流。
                <strong class="text-foreground">负债</strong>是把钱从你口袋取走的东西，如房贷、车贷、信用卡、银行贷款等，它们增加支出。
                理解资产与负债的区别，是实现财务自由的第一步。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Gift class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">格子类型说明</h2>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <Zap class="h-4 w-4 text-primary" />
                    <h3 class="text-sm font-semibold">机会</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">抽取机会卡，可能是小生意或大生意，可以选择买入或放弃。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <ShoppingBag class="h-4 w-4 text-destructive" />
                    <h3 class="text-sm font-semibold">负债 / Doodad</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">意外支出，需要支付相应金额，增加你的负债或减少现金。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <Coins class="h-4 w-4 text-success" />
                    <h3 class="text-sm font-semibold">发工资</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">经过或停留时获得当月现金流（总收入 - 总支出）。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <TrendingUp class="h-4 w-4 text-warning" />
                    <h3 class="text-sm font-semibold">市场风云</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">抽取市场卡，资产价格可能上涨或下跌，是卖出资产获利的时机。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <Baby class="h-4 w-4 text-accent-foreground" />
                    <h3 class="text-sm font-semibold">孩子</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">增加一个孩子，每月支出相应增加。孩子数量有上限。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <HeartHandshake class="h-4 w-4 text-pink-400" />
                    <h3 class="text-sm font-semibold">慈善</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">可选择捐赠总收入的 10%，获得下一回合掷双骰的机会。</p>
                </div>
                <div class="rounded-md bg-muted/50 p-4">
                  <div class="mb-2 flex items-center gap-2">
                    <Briefcase class="h-4 w-4 text-destructive" />
                    <h3 class="text-sm font-semibold">裁员</h3>
                  </div>
                  <p class="text-xs text-muted-foreground">失业两回合，期间没有工资但仍需支付支出。有保险可避免。</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Rocket class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">进入快车道条件</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                当你的<strong class="text-foreground">被动收入 ≥ 总支出</strong>时，恭喜你！你已经实现了财务自由，
                可以离开老鼠赛跑，进入快车道。进入快车道后，你将获得 100 倍月现金流的起始现金，
                并获得一个随机的梦想目标。
              </p>
            </div>
          </div>

          <!-- 快车道 -->
          <div v-else-if="activeTab === 'fasttrack'" class="space-y-6">
            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-success/20 text-success">
                  <Coins class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">现金流日</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                落在现金流日格子时，你将获得<strong class="text-foreground">月现金流 × 100</strong>的巨额现金收入。
                这是快车道中最有价值的格子之一，代表着财务自由带来的被动财富增长。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-success/20 text-success">
                  <Zap class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">机会</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                快车道的机会卡规模更大、收益更高。你将遇到大型投资项目和商业机会，
                需要更多的初始资金，但同时也带来更丰厚的现金流回报。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-success/20 text-success">
                  <TrendingUp class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">投资</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                投资格子提供高风险高回报的投资机会。你可以选择参与或放弃，
                成功的投资能大幅增加你的现金流和资产价值。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/20 text-destructive">
                  <ShoppingBag class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">Doodad</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                快车道的 doodad 金额远高于老鼠赛跑，通常为月现金流的 10 倍（最低 $5,000）。
                即使实现了财务自由，过度消费仍可能让你陷入财务困境。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-warning/20 text-warning">
                  <Star class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">梦想格</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                每位玩家在进入快车道时会获得一个梦想。落在梦想格时，你可以用现金购买梦想。
                成功购买梦想后，你就赢得了游戏！梦想价格不菲，需要你在快车道中积累足够的财富。
              </p>
            </div>
          </div>

          <!-- 卡牌类型 -->
          <div v-else-if="activeTab === 'cards'" class="space-y-6">
            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Sparkles class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">小生意卡</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                小生意卡是老鼠赛跑中的入门级投资机会。投资金额通常在数千美元以内，
                适合资金有限的初期阶段。虽然单笔现金流不高，但风险较低，
                是积累初始资本和投资经验的好方式。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Building2 class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">大生意卡</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                大生意卡涉及更高额的投资，通常需要数万美元以上的资金。
                但相应地，它们带来的现金流也更为可观。大生意是加速实现财务自由的关键，
                当你有了一定的资本积累后，应该积极把握大生意机会。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <PieChart class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">房地产卡</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                房地产投资卡包括单户住宅、多户公寓、商业地产等。房地产既能产生月度租金现金流，
                又能在市场行情好时通过出售获得资本利得。是游戏中实现财务自由最常见的途径之一。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <TrendingUp class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">股票 / 基金卡</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                股票和共同基金投资具有高流动性和高波动性。价格会随市场风云卡而大幅波动，
                低买高卖是获利的关键。股票投资不产生被动现金流（无分红机制），
                主要靠市场差价获利，适合短线操作。
              </p>
            </div>

            <div class="rounded-lg border border-border bg-card p-6">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Zap class="h-5 w-5" />
                </div>
                <h2 class="text-lg font-semibold">市场风云卡</h2>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                市场风云卡影响各类资产的市场价格。可能是好消息（如股票暴涨、房地产热潮），
                让你有机会高价卖出资产获利；也可能是坏消息（如市场崩盘、经济衰退），
                导致资产贬值。关注市场动态，把握买卖时机，是投资成功的关键。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
