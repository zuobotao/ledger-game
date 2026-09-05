<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Dices,
  Wallet,
  TrendingUp,
  PiggyBank,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Ban,
} from 'lucide-vue-next'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { useMultiplayerStore } from '@/stores/multiplayer'
import RatRaceBoard from '@/components/RatRaceBoard.vue'
import FastTrackBoard from '@/components/FastTrackBoard.vue'
import { PLAYER_COLORS, type Player } from '@/types/game'
import type { GameAction } from '@/engine/contract'

const router = useRouter()
const store = useMultiplayerStore()
const { isMobile } = useDisplayMode()

const myPid = computed(() => store.session?.playerId ?? '')

const currentGamePlayer = computed<Player | null>(() => {
  if (!store.gameState) return null
  return store.gameState.players[store.gameState.currentPlayerIndex] ?? null
})

const isCurrentPlayerMe = computed<boolean>(() => {
  const cur = currentGamePlayer.value
  return Boolean(cur && store.myGamePlayerId === cur.id)
})

const currentPhase = computed<'rat_race' | 'fast_track'>(() => currentGamePlayer.value?.phase ?? 'rat_race')

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function netWorth(p: Player): number {
  const assets = (p.assets ?? []).reduce((a, x) => a + (x.marketPrice ?? x.cost) * (x.quantity || 1), 0)
  const liabs = (p.liabilities ?? []).reduce((a, x) => a + (x.amount || 0), 0)
  return p.cash + p.savings + assets - liabs
}

interface PendingCardLike {
  name?: string
  title?: string
  description?: string
}

const pendingCard = computed<PendingCardLike | null>(() => {
  const card = store.gameState?.pendingAction?.card
  return card ? (card as unknown as PendingCardLike) : null
})

function colorValue(p: { career?: { name?: string }; color?: string }): string {
  return p.color ?? '#888'
}

// ==================== 动作面板 ====================

function myPlayerIdOrThrow(): string {
  const id = store.myGamePlayerId
  if (!id) throw new Error('unknown game player')
  return id
}

// 服务器端以 pendingAction 权威裁决（忽略客户端回传的 card 等冗余字段），
// 客户端只提交“意图”，故此处按协议 GameAction 形状构造并交由服务端校验。
function dispatchRaw(action: Record<string, unknown>) {
  store.dispatch(action as unknown as GameAction)
}

function rollDice() {
  dispatchRaw({ type: 'roll_dice', playerId: myPlayerIdOrThrow() })
}
function endTurn() {
  dispatchRaw({ type: 'end_turn', playerId: myPlayerIdOrThrow() })
}
function buyOpportunity() {
  dispatchRaw({ type: 'buy_opportunity', playerId: myPlayerIdOrThrow() })
}
function declineOpportunity() {
  dispatchRaw({ type: 'decline_opportunity', playerId: myPlayerIdOrThrow() })
}
function acceptCharity() {
  dispatchRaw({ type: 'handle_charity', playerId: myPlayerIdOrThrow(), accepted: true })
}
function declineCharity() {
  dispatchRaw({ type: 'handle_charity', playerId: myPlayerIdOrThrow(), accepted: false })
}
function dismissMarket() {
  dispatchRaw({ type: 'handle_market', playerId: myPlayerIdOrThrow(), sellAssetIds: [] })
}
function dismissDoodad() {
  dispatchRaw({ type: 'handle_doodad', playerId: myPlayerIdOrThrow() })
}
function dismissStory() {
  dispatchRaw({ type: 'handle_story', playerId: myPlayerIdOrThrow() })
}
function takeLoan() {
  dispatchRaw({ type: 'take_bank_loan', playerId: myPlayerIdOrThrow() })
}
function declareBankruptcy() {
  dispatchRaw({ type: 'declare_bankruptcy', playerId: myPlayerIdOrThrow() })
}
function acceptFastTrackOpportunity() {
  dispatchRaw({ type: 'fast_track_opportunity', playerId: myPlayerIdOrThrow(), accepted: true })
}
function acceptDream() {
  dispatchRaw({ type: 'fast_track_dream', playerId: myPlayerIdOrThrow(), accepted: true })
}
function sellStockOpportunity() {
  const sso = (store.gameState as unknown as { stockSellOpportunity?: { price: number; symbol: string; card?: { assetId?: string; name?: string } } })
    ?.stockSellOpportunity
  const asset = sso?.card?.assetId
  dispatchRaw({
    type: 'sell_opportunity',
    playerId: myPlayerIdOrThrow(),
    assetId: asset ?? sso?.symbol ?? '',
    price: sso?.price ?? 0,
    quantity: 1,
  })
}

const isMyTurn = computed(() => store.isMyTurn)

const actionButtons = computed<{ key: string; label: string; handler: () => void; variant: 'primary' | 'ghost' | 'danger' }[]>(() => {
  const set = new Set(store.turn?.allowedActions ?? [])
  const buttons: { key: string; label: string; handler: () => void; variant: 'primary' | 'ghost' | 'danger' }[] = []
  if (set.has('roll_dice')) buttons.push({ key: 'roll_dice', label: '掷骰子', handler: rollDice, variant: 'primary' })
  if (set.has('end_turn')) buttons.push({ key: 'end_turn', label: '结束回合', handler: endTurn, variant: 'primary' })
  if (set.has('buy_opportunity')) buttons.push({ key: 'buy_opportunity', label: '购入机会', handler: buyOpportunity, variant: 'primary' })
  if (set.has('decline_opportunity')) buttons.push({ key: 'decline_opportunity', label: '放弃机会', handler: declineOpportunity, variant: 'ghost' })
  if (set.has('handle_charity')) {
    buttons.push({ key: 'charity_y', label: '捐 10% 换取好运', handler: acceptCharity, variant: 'primary' })
    buttons.push({ key: 'charity_n', label: '不捐款', handler: declineCharity, variant: 'ghost' })
  }
  if (set.has('handle_market')) buttons.push({ key: 'handle_market', label: '查看市场风云', handler: dismissMarket, variant: 'primary' })
  if (set.has('handle_doodad')) buttons.push({ key: 'handle_doodad', label: '支付生活意外', handler: dismissDoodad, variant: 'primary' })
  if (set.has('handle_story')) buttons.push({ key: 'handle_story', label: '继续', handler: dismissStory, variant: 'primary' })
  if (set.has('take_bank_loan')) buttons.push({ key: 'take_bank_loan', label: '向银行贷款', handler: takeLoan, variant: 'primary' })
  if (set.has('declare_bankruptcy')) buttons.push({ key: 'bankrupt', label: '申请破产重整', handler: declareBankruptcy, variant: 'danger' })
  if (set.has('fast_track_opportunity')) buttons.push({ key: 'ft_opp', label: '把握机会', handler: acceptFastTrackOpportunity, variant: 'primary' })
  if (set.has('fast_track_dream')) buttons.push({ key: 'ft_dream', label: '购买梦想', handler: acceptDream, variant: 'primary' })
  if (set.has('sell_opportunity')) buttons.push({ key: 'sell_opportunity', label: '出售股份回笼资金', handler: sellStockOpportunity, variant: 'primary' })
  return buttons
})

// ==================== 状态提示 ====================

const currentPlayerName = computed(() => currentGamePlayer.value?.name ?? '')
const turnBanner = computed(() => {
  if (store.roomPaused) return '房间已暂停，等待当前玩家重连…'
  if (isCurrentPlayerMe.value) return '轮到你行动'
  if (currentPlayerName.value) return `等待 ${currentPlayerName.value} 行动…`
  return '等待…'
})

const lastToast = computed(() => {
  const ev = [...store.lastEvents].reverse().find((e) => e.type === 'dice_rolled')
  if (ev) return `掷出 ${ev.total}`
  return store.lastResult?.error ? store.lastResult.error : ''
})

// 返回大厅 / 离开
function goLobby() {
  router.push({ name: 'room-lobby' })
}
function leave() {
  store.leaveRoom()
  router.push({ name: 'home' })
}

watch(
  () => store.room?.status,
  (s) => {
    // 游戏中断回大厅
    if ((s === 'waiting' || s === 'starting') && !store.finished) router.push({ name: 'room-lobby' })
  },
)
</script>

<template>
  <main :data-mode="isMobile ? 'mobile' : 'desktop'">
    <div v-if="!store.gameState" class="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="text-sm text-muted-foreground">等待游戏开始…</p>
    </div>

    <div v-else class="min-h-screen pb-36" :class="isMobile ? 'px-3 pt-3' : 'px-6 pb-10 pt-4'">
      <!-- 顶栏 -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary" @click="goLobby">
            <ArrowLeft class="h-4 w-4" />
            大厅
          </button>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <span class="hidden truncate sm:inline">{{ store.room?.name }}</span>
          <span class="font-mono font-bold tracking-widest text-primary">{{ store.room?.code }}</span>
          <button type="button" class="underline" @click="leave">离开</button>
        </div>
      </div>

      <div v-if="store.lastError" class="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
        {{ store.lastError }}
      </div>

      <!-- 结果横幅 -->
      <div v-if="store.finished" data-testid="mp-finished" class="mb-4 rounded-2xl border border-success/40 bg-success/10 p-5 text-center">
        <div class="mb-1 flex items-center justify-center gap-2 text-xl font-bold text-foreground">
          <Trophy class="h-6 w-6 text-amber-500" />
          本局结束
        </div>
        <p class="text-sm text-muted-foreground">
          胜利者：{{ store.finishedWinnerRoomPlayerId ? store.room?.players.find((p) => p.playerId === store.finishedWinnerRoomPlayerId)?.nickname : '（平局）' }}
        </p>
        <p v-if="store.finalStateHash" class="mt-2 break-all font-mono text-xs text-muted-foreground">
          最终 StateHash：{{ store.finalStateHash }}
        </p>
        <p v-if="store.finishedReplayHash" class="mt-1 break-all font-mono text-[11px] text-muted-foreground">
          Replay #{{ store.finishedReplayHash }}（{{ store.finishedActionCount }} 动作 / {{ store.finishedEventCount }} 事件）
        </p>
      </div>

      <!-- 回合横幅 -->
      <div
        :class="isCurrentPlayerMe ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-secondary/20 text-foreground'"
        class="mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5"
      >
        <span class="text-sm font-semibold">{{ turnBanner }}</span>
        <span class="font-mono text-xs text-muted-foreground">第 {{ store.sessionInfo?.turnNumber ?? 0 }} 回合</span>
      </div>

      <!-- 权威同步指示：所有客户端应显示相同的 StateHash（Phase 7 验收） -->
      <div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs">
        <span class="text-muted-foreground">同步状态</span>
        <span v-if="store.stateHash" data-testid="mp-state-hash" class="font-mono font-semibold tracking-wide text-success">
          {{ store.stateHash }}
        </span>
        <span v-else class="text-muted-foreground">等待服务器快照…</span>
      </div>

      <!-- 棋盘 -->
      <div :class="isMobile ? 'mb-4' : 'mb-6'">
        <RatRaceBoard
          v-if="currentPhase === 'rat_race'"
          :players="store.gameState.players"
          :current-position="currentGamePlayer?.ratRacePosition ?? 0"
          :last-roll="store.gameState.lastRoll"
          :turn-number="store.sessionInfo?.turnNumber ?? 0"
          :current-player-name="currentPlayerName"
        />
        <FastTrackBoard
          v-else
          :players="store.gameState.players"
          :current-position="currentGamePlayer?.fastTrackPosition ?? 0"
          :last-roll="store.gameState.lastRoll"
          :turn-number="store.sessionInfo?.turnNumber ?? 0"
          :current-player-name="currentPlayerName"
          :dream="currentGamePlayer?.dream ?? null"
        />
      </div>

      <div class="grid gap-4" :class="isMobile ? '' : 'lg:grid-cols-2'">
        <!-- 玩家状态 -->
        <section data-testid="mp-players" class="rounded-2xl border border-border bg-secondary/10 p-4">
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users class="h-4 w-4" />
            玩家
          </h2>
          <ul class="space-y-2">
            <li
              v-for="(p, idx) in store.gameState.players"
              :key="p.id"
              class="rounded-xl border px-3 py-2.5"
              :class="p.id === currentGamePlayer?.id ? 'border-primary bg-primary/5' : 'border-border bg-background'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" :style="{ backgroundColor: colorValue(p) }">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-sm font-medium text-foreground">{{ p.name }}</span>
                  <span v-if="p.id === store.myGamePlayerId" class="text-xs text-muted-foreground">（我）</span>
                  <span v-if="p.id === currentGamePlayer?.id" class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">行动中</span>
                </div>
                <span v-if="p.phase === 'fast_track'" class="text-[10px] text-foreground/70">快车道</span>
              </div>
              <div class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span class="flex items-center gap-1"><Wallet class="h-3 w-3" /> 现金 {{ money(p.cash) }}</span>
                <span class="flex items-center gap-1"><PiggyBank class="h-3 w-3" /> 存款 {{ money(p.savings) }}</span>
                <span class="flex items-center gap-1"><TrendingUp class="h-3 w-3" /> 现金流 {{ money(p.cashFlow) }}/月</span>
                <span>净资产 {{ money(netWorth(p)) }}</span>
                <span>资产 {{ p.assets?.length ?? 0 }} · 负债 {{ p.liabilities?.length ?? 0 }}</span>
                <span>孩子 {{ p.childrenCount ?? 0 }} · {{ p.phase === 'fast_track' ? '快车道' : '老鼠圈' }}</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- 当前待处理事件卡片 -->
        <section class="rounded-2xl border border-border bg-secondary/10 p-4">
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">当前事件</h2>
          <template v-if="pendingCard">
            <div class="rounded-xl bg-background p-4" data-testid="mp-pending-card">
              <div class="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div class="text-base font-semibold text-foreground">{{ pendingCard.name ?? '事件' }}</div>
                  <div class="mt-0.5 text-xs text-muted-foreground">{{ pendingCard.title ?? '' }}</div>
                </div>
                <span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {{ store.gameState.pendingAction?.type }}
                </span>
              </div>
              <p class="text-sm leading-relaxed text-muted-foreground">
                {{ pendingCard.description ?? store.gameState.pendingAction?.message }}
              </p>
            </div>
          </template>
          <template v-else>
            <div class="rounded-xl bg-background p-4 text-sm text-muted-foreground" data-testid="mp-pending-empty">
              {{ store.gameState.pendingAction?.message || '当前回合无事发生，等待掷骰或结束回合。' }}
            </div>
          </template>

          <div v-if="lastToast" class="mt-3 text-xs text-foreground/70">{{ lastToast }}</div>

          <!-- 动作按钮 -->
          <div class="mt-4 flex flex-col gap-2" data-testid="mp-actions">
            <template v-if="!isMyTurn">
              <div class="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
                等待当前玩家操作…
              </div>
            </template>
            <template v-else>
              <button
                v-for="b in actionButtons"
                :key="b.key"
                type="button"
                :data-testid="`act-${b.key}`"
                class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm transition"
                :class="
                  b.variant === 'primary'
                    ? 'bg-primary text-primary-foreground hover:brightness-[0.96]'
                    : b.variant === 'danger'
                      ? 'bg-destructive text-destructive-foreground hover:brightness-[0.95]'
                      : 'border border-border bg-background text-foreground hover:bg-muted/60'
                "
                @click="b.handler"
              >
                <Dices v-if="b.key === 'roll_dice'" class="h-4 w-4" />
                <CheckCircle2 v-else-if="b.key === 'end_turn'" class="h-4 w-4" />
                <XCircle v-else-if="b.key === 'bankrupt'" class="h-4 w-4" />
                {{ b.label }}
              </button>
            </template>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>