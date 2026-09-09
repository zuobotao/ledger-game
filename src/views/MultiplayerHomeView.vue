<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Users, LogIn, ArrowLeft, Loader2, ServerOff } from 'lucide-vue-next'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { isRoomServerConfigured } from '@/network/endpoint'

const router = useRouter()
const store = useMultiplayerStore()

const nickname = ref(localStorage.getItem('ledger.room.nickname') ?? '')
const roomName = ref('周末家庭局')
const maxPlayers = ref(6)
const roomCode = ref('')
const busy = ref<'idle' | 'create' | 'join'>('idle')
const roomServerReady = isRoomServerConfigured()

const joinLabel = computed(() => {
  switch (store.joinStatus) {
    case 'connecting':
      return '连接中…'
    case 'joining':
      return '加入中…'
    case 'bootstrapping':
      return '确认身份…'
    case 'syncing':
      return '同步房间…'
    default:
      return '加入房间'
  }
})

function persistNickname() {
  const n = nickname.value.trim()
  if (n) localStorage.setItem('ledger.room.nickname', n)
}

async function doCreate() {
  const n = nickname.value.trim()
  if (!n) {
    store.lastError = '请先填写你的昵称'
    return
  }
  busy.value = 'create'
  persistNickname()
  const ok = await store.createRoom({ nickname: n, name: roomName.value.trim(), maxPlayers: maxPlayers.value })
  busy.value = 'idle'
  if (ok) router.push({ name: 'room-lobby' })
}

async function doJoin() {
  const n = nickname.value.trim()
  const code = roomCode.value.trim().toUpperCase()
  if (!n) {
    store.lastError = '请先填写你的昵称'
    return
  }
  if (code.length !== 6) {
    store.lastError = '房间码为 6 位'
    return
  }
  busy.value = 'join'
  persistNickname()
  // joinRoom 只有在 socket open + bootstrap + 快照 + 找到自己 后才 resolve；失败会回填 lastError
  const res = await store.joinRoom({ roomCode: code, nickname: n })
  busy.value = 'idle'
  if (res.ok) router.push({ name: 'room-lobby' })
}

onMounted(() => {
  // 若已有本地会话（刷新），自动返回原房间（无需再次输入）
  if (store.autoReconnect()) {
    router.push({ name: 'room-lobby' })
  }
})
</script>

<template>
  <main>
    <div class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <button
        type="button"
        class="mb-6 inline-flex h-9 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition hover:text-primary"
        data-testid="mp-back-home"
        @click="router.push({ name: 'home' })"
      >
        <ArrowLeft class="h-4 w-4" />
        返回首页
      </button>

      <div
        v-if="store.lastError"
        data-testid="mp-error"
        class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {{ store.lastError }}
      </div>

      <h1 class="mb-1 text-2xl font-semibold text-foreground">多人房间</h1>
      <p class="mb-8 text-sm text-muted-foreground">
        与家人朋友共享同一个经济世界，一起迈向财务自由。
      </p>

      <div
        v-if="!roomServerReady"
        data-testid="mp-server-unavailable"
        class="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning"
        role="status"
      >
        当前线上版本尚未配置公网房间服务，创建和加入多人房间暂不可用。请稍后重试或联系管理员完成房间服务部署。
      </div>

      <label class="mb-1.5 block text-sm font-medium text-foreground" for="mp-nickname">昵称</label>
      <input
        id="mp-nickname"
        v-model="nickname"
        maxlength="20"
        data-testid="mp-nickname"
        placeholder="请输入昵称（最多 20 字）"
        class="mb-6 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary"
      />

      <!-- 创建房间 -->
      <section data-testid="mp-create" class="mb-8 rounded-2xl border border-border bg-secondary/20 p-5">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users class="h-4 w-4" />
          创建房间
        </h2>
        <label class="mb-1 block text-xs text-muted-foreground" for="mp-room-name">房间名称</label>
        <input
          id="mp-room-name"
          v-model="roomName"
          maxlength="30"
          class="mb-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
        />
        <div class="mb-4 flex items-center justify-between">
          <span class="text-sm text-muted-foreground">最多人数</span>
          <select
            v-model.number="maxPlayers"
            class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            data-testid="mp-max-players"
          >
            <option :value="2">2 人</option>
            <option :value="3">3 人</option>
            <option :value="4">4 人</option>
            <option :value="5">5 人</option>
            <option :value="6">6 人</option>
          </select>
        </div>
        <button
          type="button"
          data-testid="mp-create-btn"
          :disabled="busy !== 'idle' || !roomServerReady"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] disabled:opacity-50"
          @click="doCreate"
        >
          <Loader2 v-if="busy === 'create'" class="h-4 w-4 animate-spin" />
          {{ busy === 'create' ? '创建中…' : '创建房间' }}
        </button>
      </section>

      <!-- 加入房间 -->
      <section data-testid="mp-join" class="rounded-2xl border border-border bg-secondary/20 p-5">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LogIn class="h-4 w-4" />
          加入房间
        </h2>
        <div class="mb-3 flex gap-2">
          <input
            v-model="roomCode"
            maxlength="6"
            data-testid="mp-code"
            placeholder="输入 6 位房间码"
            class="h-11 w-full flex-1 rounded-xl border border-border bg-background px-4 text-center text-base font-mono uppercase tracking-[0.4em] text-foreground outline-none transition focus:border-primary"
            @keyup.enter="doJoin"
          />
        </div>
        <button
          type="button"
          data-testid="mp-join-btn"
          :disabled="busy !== 'idle' || !roomServerReady"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 px-6 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-50"
          @click="doJoin"
        >
          <Loader2 v-if="busy === 'join'" class="h-4 w-4 animate-spin" />
          {{ busy === 'join' ? joinLabel : '加入房间' }}
        </button>
      </section>

      <div class="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
        <ServerOff class="h-3.5 w-3.5" />
        本机开发请启动 npm run server；线上需要配置公网 HTTP / WebSocket 房间服务。
      </div>
    </div>
  </main>
</template>
