<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="guide-page">
    <div class="guide-back">
      <button class="back-btn" @click="goBack">← 返回</button>
    </div>
    <div class="guide-wrap">
      <header class="guide-hero">
        <div class="hero-badge">财商教育模拟游戏</div>
        <h1>新手简介<span class="accent">：30 秒看懂怎么致富</span></h1>
        <p class="tagline">一款教你看懂钱、模拟走向财富自由的游戏 —— 玩几分钟你就明白「现金流」是怎么回事</p>
      </header>

      <div class="lead-card">
        一句话：<b>游戏里你要做的是——靠「买东西」攒出够多的<em>被动收入</em>，交得起每个月的生活开销，然后彻底不靠工资生活。</b>
      </div>

      <!-- 概念 -->
      <section>
        <h2><span class="step">1</span>先把 3 个词搞懂，你就不再迷茫</h2>
        <div class="grid">
          <div class="concept">
            <h3>💸 收入 vs 支出</h3>
            <p class="k">一个月赚多少（收入）、花多少（支出），每月净剩 = <b class="g">现金流</b>。</p>
            <div class="eg">👷 工资 = 主动收入，一旦你停下来或失业，就没了。</div>
          </div>
          <div class="concept">
            <h3>📦 资产 vs 负债</h3>
            <p class="k">让你<b class="g">钱越来越多</b>的是资产；让你<b class="r">钱往外流</b>的是负债。</p>
            <div class="eg">🏠 收租的房子 = 资产 &nbsp;·&nbsp; 🚗 每月还贷的车 = 负债</div>
          </div>
          <div class="concept">
            <h3>🐔 被动收入</h3>
            <p class="k">「不用干活也进账」的钱，来自你买的资产。这可是你<b class="gold">要赢的目标</b>。</p>
            <div class="eg">买下现金流转正的资产 → 被动收入上涨 → 财富自由</div>
          </div>
        </div>
      </section>

      <!-- 怎么赢 -->
      <section>
        <h2><span class="step">2</span>怎么算赢？</h2>
        <div class="win-flow">
          <p><span class="pill how">老鼠赛跑</span> 开局在圈里打转攒资产 → <span class="pill win">被动收入 ≥ 总支出</span> 财务自由，跳出圈 → <span class="pill at">快车道</span> 高速积累，<b class="gold">实现你的梦想</b>（环游世界、买个小岛…）</p>
        </div>
      </section>

      <!-- 怎么玩 -->
      <section>
        <h2><span class="step">3</span>一局怎么玩？5 步上手</h2>
        <ol class="play-steps">
          <li><b>选职业</b>选一个角色：工程师、医生、兽医… 不同职业薪水、开销、难度都不同。</li>
          <li><b>选梦想</b>选你「这辈子最想干的事」，那就是你要攒到的东西。</li>
          <li><b>掷骰子走格</b>一圈圈走，落到不同格子触发不同事情。</li>
          <li><b>碰到机会就判断买不买</b>用现金「首付」买资产，让它持续带来现金流——这是你翻身的核心。</li>
          <li><b>盯住报表</b>右侧/下方面比例、资产负债报表是你的体检报告：现金、现金流、净资产都在这里。</li>
        </ol>
      </section>

      <!-- 棋盘 -->
      <section>
        <h2><span class="step">4</span>棋盘格子什么意思？</h2>
        <div class="cells">
          <div class="cell"><span class="dot" style="background:#22c55e"></span><b>发薪日</b>领工资，现金到账</div>
          <div class="cell"><span class="dot" style="background:#8b5cf6"></span><b>机会 / 大机会</b>有资产可买，抓它</div>
          <div class="cell"><span class="dot" style="background:#60a5fa"></span><b>市场风云</b>行情波动，可卖资产赚差价</div>
          <div class="cell"><span class="dot" style="background:#f59e0b"></span><b>慈善</b>捐点钱换额外走步保险</div>
          <div class="cell"><span class="dot" style="background:#ef4444"></span><b>裁员 / 生活意外</b>额外花钱或失业，注意风险</div>
          <div class="cell"><span class="dot" style="background:#a855f7"></span><b>历史故事</b>小事件，可能赚也可能亏</div>
        </div>
      </section>

      <!-- 新手建议 -->
      <section>
        <h2><span class="step">5</span>给新手的 3 句话</h2>
        <ul class="tips">
          <li>别只看「存款」。<b>每月净剩多少（现金流）</b>才是关键，那才是你持续买资产的本钱。</li>
          <li>优先买「<b>现金流转正</b>」的机会——花点首付、换一份长期被动收入，通常划算。</li>
          <li>别把现金烧光硬买。<b>留点儿应急钱</b>，否则碰到裁员/意外就破产了。</li>
        </ul>
      </section>

      <footer class="foot">
        Ledger 是一款财商教育模拟游戏：它想教你「让钱为你工作」才能走向财富自由。现实中那些宣称「躺着暴富」的高息借贷、赌博投机，恰恰相反——它们是让钱往外流的负资产。请理性看待游戏与现实。
        <div class="foot-note">本简介仅为玩家引导，不构成任何投资建议。</div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.guide-page { min-height: 100vh; background: radial-gradient(1200px 600px at 30% -10%, rgba(139,92,246,.18), transparent 60%), #0b0b10; color: #ececf1; }
.guide-back { max-width: 880px; margin: 0 auto; padding: 16px 20px 0; }
.back-btn { background: transparent; border: 1px solid #2a2a38; color: #9a9aa8; border-radius: 99px; padding: 6px 14px; font-size: .85rem; cursor: pointer; }
.back-btn:hover { color: #ececf1; border-color: #8b5cf6; }
.guide-wrap { max-width: 880px; margin: 0 auto; padding: 8px 20px 56px; }
.guide-hero { text-align: center; padding: 20px 0 14px; }
.hero-badge { display: inline-block; background: rgba(139,92,246,.15); color: #a855f7; border-radius: 99px; padding: 3px 12px; font-size: .78rem; font-weight: 600; margin-bottom: 12px; }
.guide-hero h1 { font-size: 1.7rem; margin: 0 0 6px; }
.guide-hero h1 .accent { color: #a855f7; }
.tagline { color: #9a9aa8; margin: 0 auto; max-width: 560px; }
.lead-card { background: linear-gradient(135deg, rgba(139,92,246,.14), rgba(168,85,247,.06)); border: 1px solid rgba(139,92,246,.3); border-radius: 14px; padding: 14px 18px; margin: 22px 0 30px; font-size: 1.02rem; line-height: 1.7; }
.lead-card em { font-style: normal; color: #a855f7; }
section { margin: 32px 0; }
h2 { font-size: 1.25rem; display: flex; align-items: center; gap: 10px; margin: 0 0 14px; }
.step { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg,#8b5cf6,#a855f7); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px,1fr)); gap: 12px; }
.concept { background: #15151d; border: 1px solid #2a2a38; border-radius: 14px; padding: 14px 16px; }
.concept h3 { margin: 0 0 6px; font-size: 1rem; }
.concept .k { font-size: .84rem; color: #9a9aa8; margin: 0; }
.concept .eg { font-size: .84rem; background: #1d1d28; border-radius: 8px; padding: 8px 10px; margin-top: 10px; }
.g { color: #34d399; } .r { color: #f87171; } .gold { color: #fbbf24; }
.win-flow { background: #15151d; border: 1px solid #2a2a38; border-radius: 14px; padding: 14px 18px; line-height: 2; }
.pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .75rem; font-weight: 600; margin: 0 2px; }
.pill.how { background: rgba(139,92,246,.18); color: #a855f7; }
.pill.win { background: rgba(52,211,153,.16); color: #34d399; }
.pill.at { background: rgba(219,39,119,.14); color: #f9a8d4; }
.play-steps { counter-reset: s; list-style: none; padding: 0; margin: 0; }
.play-steps li { position: relative; padding: 12px 0 12px 46px; border-bottom: 1px dashed #2a2a38; font-size: .95rem; }
.play-steps li:last-child { border-bottom: 0; }
.play-steps li::before { counter-increment: s; content: counter(s); position: absolute; left: 0; top: 11px; width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg,#8b5cf6,#a855f7); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.cells { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 8px; }
.cell { background: #1d1d28; border: 1px solid #2a2a38; border-radius: 10px; padding: 9px 12px; font-size: .85rem; }
.cell .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 7px; }
.cell b { display: block; margin-bottom: 2px; font-size: .9rem; }
.tips { background: linear-gradient(135deg, rgba(139,92,246,.14), rgba(168,85,247,.06)); border: 1px solid rgba(139,92,246,.3); border-radius: 14px; padding: 16px 18px 16px 36px; }
.tips li { margin: 8px 0; font-size: .95rem; }
.foot { font-size: .82rem; color: #9a9aa8; border-top: 1px solid #2a2a38; margin-top: 34px; padding-top: 14px; text-align: center; line-height: 1.8; }
.foot-note { opacity: .7; margin-top: 4px; }
@media (max-width: 560px) { .guide-hero h1 { font-size: 1.35rem; } }
</style>