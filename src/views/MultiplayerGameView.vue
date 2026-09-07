<script setup lang="ts">
/**
 * MultiplayerGameView — 多人玩法容器（v2.4.3 w1 接线）
 *
 * 只负责：route / room session / adapter selection / shared game mount。
 * 玩法 UI 全部走共享组件 <RatRaceGame> / <FastTrackGame>（GameplayContract），
 * 不再在此处独立实现玩法（禁止双轨扩张，见执行约束 §2.1）。
 *
 * 多人专属会话信息（房间码 / 连接状态 / 离开）作为顶部细条保留在本视图；
 * 玩法区与 Single 使用同一套渲染，仅通过 MultiplayerGameplayAdapter 访问服务器权威状态。
 */
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Loader2, Trophy } from 'lucide-vue-next'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { createMultiplayerGameplayAdapter } from '@/gameplay/adapters/multiplayerGameplayAdapter'
import RatRaceGame from '@/gameplay/components/rat-race/RatRaceGame.vue'
import FastTrackGame from '@/gameplay/components/fast-track/FastTrackGame.vue'

const router = useRouter()
const store = useMultiplayerStore()

const adapter = createMultiplayerGameplayAdapter(store)
onMounted(() => {
  // 直接刷新对局路由时 store 会重新创建，必须恢复本地会话才能收到游戏快照。
  if (store.gameState || store.status === 'connecting' || store.status === 'open') return
  store.autoReconnect()
})
onBeforeUnmount(() => adapter.dispose())

// ============ 会话信息 ============
const vm = computed(() => adapter.viewModel.value)
const currentPhase = computed(() => vm.value.currentPlayer?.phase ?? 'rat_race')

const roomStatusText = computed(() => {
  switch (store.status) {
    case 'open':
      return store.roomPaused ? '已暂停' : '已连接'
    case 'connecting':
      return '连接中…'
    case 'error':
      return '连接失败'
    default:
      return store.status
  }
})

const roomStatusClass = computed(() => {
  if (store.roomPaused) return 'bg-amber-500/15 text-amber-500'
  if (store.status === 'open') return 'bg-success/15 text-success'
  return 'bg-destructive/15 text-destructive'
})

const finishedWinnerName = computed(() => {
  const id = store.finishedWinnerRoomPlayerId
  if (!id) return '（平局）'
  return store.room?.players.find((p) => p.playerId === id)?.nickname ?? '未知'
})

// ============ 导航 ============
function goLobby() {
  router.push({ name: 'room-lobby' })
}

function leave() {
  store.leaveRoom()
  router.push({ name: 'home' })
}

function onBack() {
  if (store.finished) {
    goLobby()
  } else {
    leave()
  }
}

function onGameOver() {
  // 共享 FastTrackGame 已显示获胜者覆盖层；多人无需额外路由
}
</script>

<template>
  <div class="flex h-screen w-full flex-col overflow-hidden bg-background">
    <!-- 会话细条（房间码 / 连接状态 / 离开） -->
    <div
      class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          data-testid="mp-back-lobby"
          @click="goLobby"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          大厅
        </button>
        <span class="hidden truncate text-xs text-muted-foreground sm:inline">
          {{ store.room?.name }}
        </span>
        <span class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-widest text-primary">
          {{ store.room?.code }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          :class="roomStatusClass"
          data-testid="mp-conn-status"
        >
          <Loader2 v-if="store.status === 'connecting'" class="h-3 w-3 animate-spin" />
          {{ roomStatusText }}
        </span>
        <button
          type="button"
          class="text-xs text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
          @click="leave"
        >
          离开
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="!store.gameState" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="text-sm text-muted-foreground">等待游戏开始…</p>
    </div>

    <!-- 玩法区：与 Single 共用同一套共享组件 -->
    <template v-else>
      <!-- 错误横幅 -->
      <div
        v-if="store.lastError"
        class="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        data-testid="mp-error-banner"
      >
        {{ store.lastError }}
      </div>

      <!-- 本局结束横幅（胜利者 + replay 校验信息） -->
      <div
        v-if="store.finished"
        class="shrink-0 border-b border-success/30 bg-success/10 px-4 py-2.5"
        data-testid="mp-finished"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span class="flex items-center gap-1.5 font-semibold text-foreground">
            <Trophy class="h-4 w-4 text-amber-500" />
            本局结束 · 胜利者：{{ finishedWinnerName }}
          </span>
          <span
            v-if="store.finishedReplayHash"
            class="break-all font-mono text-[11px] text-muted-foreground"
          >
            Replay #{{ store.finishedReplayHash }}（{{ store.finishedActionCount }} 动作 /
            {{ store.finishedEventCount }} 事件）
          </span>
        </div>
      </div>

      <!-- 共享玩法挂载：按当前行动玩家阶段选择老鼠圈 / 资本游戏 -->
      <div class="min-h-0 flex-1">
        <RatRaceGame
          v-if="currentPhase === 'rat_race'"
          :adapter="adapter"
          :show-back="false"
          @back="onBack"
          @enter-fast-track="adapter.commands.resolvePendingAction({ kind: 'enter_fast_track' })"
        />
        <FastTrackGame
          v-else
          :adapter="adapter"
          :show-back="false"
          @back="onBack"
          @game-over="onGameOver"
        />
      </div>
    </template>
  </div>
</template>
