<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Crown, Copy, Check, Loader2, ArrowLeft, Users, RefreshCw, ChevronDown, Info, X, Shuffle } from 'lucide-vue-next'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { CAREERS, getCareerById, getRandomCareer } from '@/data/careers'
import { DREAMS, getRandomDream } from '@/data/dreams'
import { PLAYER_COLORS, type Career, type Dream } from '@/types/game'
import CareerSelectorModal from '@/components/CareerSelectorModal.vue'
import DreamSelectorModal from '@/components/DreamSelectorModal.vue'
import CareerDetailCard from '@/components/CareerDetailCard.vue'

const router = useRouter()
const store = useMultiplayerStore()
const { isMobile } = useDisplayMode()

const copied = ref(false)
const selectedCareer = ref('')
const selectedDream = ref('')
const selectedColor = ref('blue')

// 选择器模态框（v2.4 Phase 8：平铺列表改为模态框，Mobile 一屏半完成 Setup）
const careerModalOpen = ref(false)
const dreamModalOpen = ref(false)

// 职业详情弹窗
const careerDetailOpen = ref(false)
const careerDetailTarget = ref<Career | null>(null)
const dreamDetailOpen = ref(false)
const dreamDetailTarget = ref<Dream | null>(null)

const myPid = computed(() => store.session?.playerId ?? '')
const myNickname = computed(() => store.session?.nickname ?? store.nickname ?? '')

const statusLabel = computed(() => {
  switch (store.status) {
    case 'open':
      return '已连接'
    case 'connecting':
      return '连接中…'
    case 'error':
      return '连接异常'
    default:
      return '未连接'
  }
})

const isConnecting = computed(() => store.status === 'connecting' || store.status === 'idle' || !store.room)

const selectedCareerName = computed(() => {
  if (!selectedCareer.value) return '请选择职业'
  return getCareerById(selectedCareer.value)?.name ?? selectedCareer.value
})
const selectedDreamName = computed(() => {
  if (!selectedDream.value) return '请选择梦想'
  return DREAMS.find((d) => d.id === selectedDream.value)?.name ?? selectedDream.value
})

function getCareerName(p: { careerId?: string }): string {
  if (!p.careerId) return '未选择'
  return CAREERS.find((c) => c.id === p.careerId)?.name ?? p.careerId
}
function getDreamName(p: { dreamId?: string }): string {
  if (!p.dreamId) return '未选梦想'
  return DREAMS.find((d) => d.id === p.dreamId)?.name ?? p.dreamId
}

function copyCode() {
  if (!store.room) return
  navigator.clipboard?.writeText(store.room.code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function applySetup() {
  if (!selectedCareer.value) return
  store.setSetup(selectedCareer.value, selectedDream.value || undefined, selectedColor.value)
}

function onCareerSelected(careerId: string) {
  selectedCareer.value = careerId
  applySetup()
}
function onDreamSelected(dreamId: string) {
  selectedDream.value = dreamId
  applySetup()
}
function randomDream() {
  onDreamSelected(getRandomDream().id)
}
function onColor(colorId: string) {
  selectedColor.value = colorId
  applySetup()
}

function openCareerDetail(career: Career) {
  careerDetailTarget.value = career
  careerDetailOpen.value = true
}
function closeCareerDetail() {
  careerDetailOpen.value = false
  careerDetailTarget.value = null
}
function showSelectedCareerDetail() {
  const career = getCareerById(selectedCareer.value)
  if (career) openCareerDetail(career)
}
function showSelectedDreamDetail() {
  const dream = DREAMS.find((item) => item.id === selectedDream.value)
  if (dream) {
    dreamDetailTarget.value = dream
    dreamDetailOpen.value = true
  }
}
function randomCareer() {
  onCareerSelected(getRandomCareer().id)
}
function closeDreamDetail() {
  dreamDetailOpen.value = false
  dreamDetailTarget.value = null
}

function toggleReady() {
  if (!selectedCareer.value) {
    store.lastError = '请先选择职业'
    return
  }
  store.setReady(!store.ready)
}

function doStart() {
  store.startGame()
}

function leave() {
  store.leaveRoom()
  router.push({ name: 'home' })
}

watch(
  () => store.room?.status,
  (s) => {
    if (s === 'playing' && store.sessionInfo && store.gameState) {
      router.push({ name: 'multiplayer-game' })
    }
  },
)
</script>

<template>
  <main :data-mode="isMobile ? 'mobile' : 'desktop'">
    <div v-if="isConnecting" class="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="text-sm text-muted-foreground">正在进入房间…</p>
      <button type="button" data-testid="lobby-back" class="text-sm text-muted-foreground underline" @click="router.push({ name: 'home' })">
        返回首页
      </button>
    </div>

    <div v-else-if="store.room" class="mx-auto min-h-screen max-w-xl px-4 py-6" :class="isMobile ? 'pb-32' : 'pb-10'">
      <!-- 顶栏 -->
      <div class="mb-4 flex items-center justify-between">
        <button type="button" class="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary" @click="leave">
          <ArrowLeft class="h-4 w-4" />
          离开
        </button>
        <div v-if="!isMobile" class="flex items-center gap-2 text-xs">
          <span class="h-2 w-2 rounded-full" :class="store.status === 'open' ? 'bg-success' : 'bg-warning'"></span>
          <span class="text-muted-foreground">{{ statusLabel }}</span>
        </div>
      </div>

      <div v-if="store.lastError" data-testid="lobby-error" class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ store.lastError }}
      </div>

      <div v-if="store.roomPaused" class="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        房间已暂停：当前回合玩家离线，等待其重连。
      </div>

      <!-- 房间信息 -->
      <div class="mb-6 flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-5 py-4">
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold text-foreground">{{ store.room.name }}</h1>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ store.room.players.length }} / {{ store.room.config.maxPlayers }} 人
            · {{ store.room.status === 'paused' ? '已暂停' : store.room.status === 'playing' ? '进行中' : '等待中' }}
          </p>
        </div>
        <button
          type="button"
          data-testid="lobby-copy-code"
          class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 px-3 font-mono text-sm font-bold tracking-[0.2em] text-primary transition hover:bg-primary/5"
          @click="copyCode"
        >
          <Check v-if="copied" class="h-4 w-4" />
          <Copy v-else class="h-4 w-4" />
          {{ copied ? '已复制' : store.room.code }}
        </button>
      </div>

      <!-- 玩家列表 -->
      <section class="mb-6 rounded-2xl border border-border bg-secondary/10 p-4">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users class="h-4 w-4" />
          玩家（{{ store.room.players.length }}/{{ store.room.config.maxPlayers }}）
        </h2>
        <ul class="space-y-2" data-testid="lobby-players">
          <li
            v-for="p in store.room.players"
            :key="p.playerId"
            data-testid="lobby-player"
            class="flex items-center justify-between rounded-lg bg-background px-3 py-2.5"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                :style="{ backgroundColor: PLAYER_COLORS.find((c) => c.id === p.colorId)?.value ?? '#888' }"
              >
                {{ (p.careerId ? getCareerName(p) : p.nickname[0] ?? '?').slice(0, 1) }}
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span class="truncate">{{ p.nickname }}</span>
                  <Crown v-if="p.playerId === store.room.hostPlayerId" class="h-3.5 w-3.5 text-amber-500" />
                  <span v-if="p.playerId === myPid" class="text-xs text-muted-foreground">（我）</span>
                </div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ p.careerId ? getCareerName(p) + ' · ' + getDreamName(p) : '尚未选择职业' }}
                </div>
              </div>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="p.status === 'ready' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'"
            >
              {{ p.status === 'ready' ? '已准备' : '未准备' }}
            </span>
          </li>
          <li
            v-if="store.room.players.length < store.room.config.maxPlayers"
            class="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground"
          >
            <RefreshCw class="h-3.5 w-3.5" />
            等待更多玩家… 分享房间码 <span class="font-mono font-bold text-primary">{{ store.room.code }}</span> 给朋友
          </li>
        </ul>
      </section>

      <!-- 我的设定 -->
      <template v-if="store.room.status === 'waiting' || store.room.status === 'starting'">
        <section class="rounded-2xl border border-border bg-secondary/10 p-4">
          <h2 class="mb-1 text-sm font-semibold text-foreground">我的设定</h2>
          <p class="mb-4 text-xs text-muted-foreground">选择职业与梦想，然后点击“准备”</p>

          <!-- 职业选择行 -->
          <label class="mb-1.5 block text-xs font-medium text-muted-foreground">职业</label>
          <div class="mb-4 flex gap-2">
            <button
              type="button"
              data-testid="open-career-selector"
              class="flex h-11 flex-1 items-center justify-between rounded-xl border border-border bg-background px-3 text-left transition hover:border-primary/50"
              @click="careerModalOpen = true"
            >
              <span
                class="min-w-0 flex-1 truncate text-sm font-medium"
                :class="selectedCareer ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ selectedCareerName }}
              </span>
              <ChevronDown class="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              type="button"
              data-testid="career-detail-current"
              title="查看职业详情"
              :disabled="!selectedCareer"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              @click="showSelectedCareerDetail"
            >
              <Info class="h-4 w-4" />
            </button>
            <button
              type="button"
              data-testid="random-career"
              title="随机选择职业"
              class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              @click="randomCareer"
            >
              <Shuffle class="h-3.5 w-3.5" />
              随机
            </button>
          </div>

          <!-- 梦想选择行 -->
          <label class="mb-1.5 block text-xs font-medium text-muted-foreground">梦想</label>
          <div class="mb-4 flex gap-2">
            <button
              type="button"
              data-testid="open-dream-selector"
              class="flex h-11 flex-1 items-center justify-between rounded-xl border border-border bg-background px-3 text-left transition hover:border-primary/50"
              @click="dreamModalOpen = true"
            >
              <span
                class="min-w-0 flex-1 truncate text-sm font-medium"
                :class="selectedDream ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ selectedDreamName }}
              </span>
              <ChevronDown class="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              type="button"
              data-testid="dream-detail-current"
              title="查看梦想详情"
              :disabled="!selectedDream"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              @click="showSelectedDreamDetail"
            >
              <Info class="h-4 w-4" />
            </button>
            <button
              type="button"
              data-testid="random-dream"
              title="随机选择梦想"
              class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              @click="randomDream"
            >
              <Shuffle class="h-3.5 w-3.5" />
              随机
            </button>
          </div>

          <!-- 颜色 -->
          <label class="mb-1.5 block text-xs font-medium text-muted-foreground">颜色</label>
          <div class="flex flex-wrap gap-2" data-testid="lobby-colors">
            <button
              v-for="c in PLAYER_COLORS"
              :key="c.id"
              type="button"
              :aria-label="c.name"
              :data-testid="`color-${c.id}`"
              class="h-9 w-9 rounded-full border-2 transition"
              :class="selectedColor === c.id ? 'border-foreground ring-2 ring-primary/40' : 'border-transparent'"
              :style="{ backgroundColor: c.value }"
              @click="onColor(c.id)"
            ></button>
          </div>
        </section>
      </template>
    </div>

    <!-- 底部操作区 -->
    <div
      v-if="store.room && store.room.status !== 'playing'"
      class="bg-background/95 backdrop-blur"
      :class="isMobile ? 'fixed inset-x-0 bottom-0 z-20 border-t border-border px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3' : 'mx-auto mt-2 max-w-xl'"
    >
      <button
        v-if="store.isHost"
        type="button"
        data-testid="lobby-start"
        :disabled="!store.canStart"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        @click="doStart"
      >
        {{ store.canStart ? `开始游戏（${store.room.players.length} 人）` : '等待全部玩家准备' }}
      </button>
      <button
        v-else
        type="button"
        data-testid="lobby-ready"
        :disabled="!selectedCareer"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-6 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="store.ready ? 'border-success/50 bg-success/10 text-success' : 'border-primary/40 text-primary hover:bg-primary/5'"
        @click="toggleReady"
      >
        {{ store.ready ? '已准备（点击取消）' : '准备' }}
      </button>
    </div>

    <!-- 职业选择器 Modal -->
    <CareerSelectorModal
      v-model="careerModalOpen"
      :selected-career-id="selectedCareer"
      :player-name="myNickname"
      auto-confirm
      :show-random="false"
      @confirm="onCareerSelected"
      @detail="openCareerDetail"
    />

    <!-- 梦想选择器 Modal -->
    <DreamSelectorModal
      v-model="dreamModalOpen"
      :selected-dream-id="selectedDream"
      :player-name="myNickname"
      auto-confirm
      :show-random="false"
      @confirm="onDreamSelected"
    />

    <!-- 职业详情 Modal -->
    <Teleport to="body">
      <div
        v-if="careerDetailOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeCareerDetail"
      >
        <div class="relative w-full max-w-sm">
          <button
            type="button"
            class="absolute -top-2 -right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors shadow-lg"
            @click="closeCareerDetail"
          >
            <X class="w-4 h-4" />
          </button>
          <CareerDetailCard v-if="careerDetailTarget" :career="careerDetailTarget" />
        </div>
      </div>
    </Teleport>

    <!-- 梦想详情 Modal -->
    <Teleport to="body">
      <div
        v-if="dreamDetailOpen && dreamDetailTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="closeDreamDetail"
      >
        <div class="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
          <button
            type="button"
            aria-label="关闭梦想详情"
            class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            @click="closeDreamDetail"
          >
            <X class="h-4 w-4" />
          </button>
          <h3 class="pr-8 text-lg font-semibold text-foreground">{{ dreamDetailTarget.name }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ dreamDetailTarget.description }}</p>
          <div class="mt-4 flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
            <span class="text-xs text-muted-foreground">目标成本</span>
            <span class="font-semibold text-success">${{ dreamDetailTarget.price.toLocaleString() }}</span>
          </div>
          <p class="mt-4 text-sm leading-6 text-foreground/80">{{ dreamDetailTarget.story }}</p>
        </div>
      </div>
    </Teleport>
  </main>
</template>
