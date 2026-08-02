<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Users,
  Briefcase,
  Palette,
  Settings,
  ChevronDown,
  ArrowLeft,
  X,
  Info,
  Sparkles,
  Shuffle,
  Bot,
} from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { CAREERS, getCareerById, getRandomCareer } from '@/data/careers'
import { DREAMS, getRandomDream } from '@/data/dreams'
import { PLAYER_COLORS, type PlayerColorId } from '@/types/game'
import type { GameConfig, Career } from '@/types/game'
import CareerDetailCard from '@/components/CareerDetailCard.vue'
import DreamSelector from '@/components/DreamSelector.vue'
import CareerSelectorModal from '@/components/CareerSelectorModal.vue'

const router = useRouter()
const gameStore = useGameStore()

const playerCountOptions = [1, 2, 3, 4, 5, 6]
const careerOptions = [
  { id: 'random', name: '随机职业' },
  ...CAREERS.map((c) => ({ id: c.id, name: c.name })),
]
const colorOptions = [
  { id: 'random', name: '随机颜色' },
  ...PLAYER_COLORS.map((c) => ({ id: c.id, name: c.name })),
]

const config = reactive<GameConfig>({
  playerCount: 2,
  insurance: false,
  bigFamily: false,
  mortgage: false,
  fastStart: false,
})

interface PlayerSetup {
  name: string
  careerId: string
  colorId: PlayerColorId | 'random'
  dreamId: string
  isAI: boolean
  aiDifficulty: 'easy' | 'medium' | 'hard'
}

const playerTypeOptions = [
  { id: 'human', name: '人类玩家' },
  { id: 'easy', name: 'AI（简单）' },
  { id: 'medium', name: 'AI（中等）' },
  { id: 'hard', name: 'AI（困难）' },
] as const

const playerSetups = reactive<PlayerSetup[]>(
  Array.from({ length: 6 }, (_, i) => ({
    name: `玩家 ${i + 1}`,
    careerId: 'random',
    colorId: 'random',
    dreamId: '',
    isAI: false,
    aiDifficulty: 'medium' as const,
  })),
)

const activeSetups = computed(() => playerSetups.slice(0, config.playerCount))

// 当前选中的玩家索引（用于梦想选择）
const activePlayerIndex = ref(0)
const activeDreamId = computed({
  get: () => playerSetups[activePlayerIndex.value]?.dreamId ?? '',
  set: (val: string) => {
    if (playerSetups[activePlayerIndex.value]) {
      playerSetups[activePlayerIndex.value]!.dreamId = val
    }
  },
})

watch(
  () => config.playerCount,
  (count) => {
    for (let i = 0; i < count; i++) {
      if (!playerSetups[i]?.name) {
        playerSetups[i] = {
          ...(playerSetups[i] ?? { careerId: 'random', colorId: 'random', dreamId: '', isAI: false, aiDifficulty: 'medium' as const }),
          name: `玩家 ${i + 1}`,
        }
      }
    }
    if (activePlayerIndex.value >= count) {
      activePlayerIndex.value = 0
    }
  },
)

const canStart = computed(() => {
  return activeSetups.value.every((p) => p.name.trim().length > 0)
})

const errorMessage = ref('')

// 职业详情 modal
const careerDetailModalOpen = ref(false)
const careerDetailCareer = ref<Career | null>(null)

// 职业选择器 modal
const careerSelectorOpen = ref(false)
const careerSelectorPlayerIndex = ref(0)

function openCareerSelector(index: number) {
  careerSelectorPlayerIndex.value = index
  careerSelectorOpen.value = true
}

function onCareerSelected(careerId: string) {
  if (playerSetups[careerSelectorPlayerIndex.value]) {
    playerSetups[careerSelectorPlayerIndex.value]!.careerId = careerId
  }
}

function openCareerDetail(careerId: string) {
  const career = careerId === 'random' ? getRandomCareer() : getCareerById(careerId)
  if (career) {
    careerDetailCareer.value = career
    careerDetailModalOpen.value = true
  }
}

function closeCareerDetail() {
  careerDetailModalOpen.value = false
  careerDetailCareer.value = null
}

function randomCareerForPlayer(index: number) {
  const career = getRandomCareer()
  playerSetups[index]!.careerId = career.id
}

function randomDreamForPlayer(index: number) {
  const dream = getRandomDream()
  playerSetups[index]!.dreamId = dream.id
}

function randomDreamForAll() {
  for (let i = 0; i < config.playerCount; i++) {
    const dream = getRandomDream()
    playerSetups[i]!.dreamId = dream.id
  }
}

function beginGame() {
  errorMessage.value = ''
  if (!canStart.value) {
    errorMessage.value = '请为所有玩家填写姓名'
    return
  }

  const setups = activeSetups.value.map((p) => ({
    name: p.name.trim(),
    careerId: p.careerId,
    colorId: p.colorId === 'random' ? getRandomColorId() : p.colorId,
    dreamId: p.dreamId || undefined,
    isAI: p.isAI,
    aiDifficulty: p.isAI ? p.aiDifficulty : undefined,
  }))

  const usedColors = new Set<string>()
  for (const setup of setups) {
    if (usedColors.has(setup.colorId)) {
      setup.colorId = getRandomColorId(usedColors)
    }
    usedColors.add(setup.colorId)
  }

  const ok = gameStore.startGame(config, setups)
  if (ok) {
    router.push({ name: 'rat-race' })
  } else {
    errorMessage.value = '创建游戏失败，请检查玩家设置'
  }
}

function getRandomColorId(exclude?: Set<string>): PlayerColorId {
  const available = PLAYER_COLORS.filter((c) => !exclude?.has(c.id)).map((c) => c.id)
  const pool = available.length > 0 ? available : PLAYER_COLORS.map((c) => c.id)
  return pool[Math.floor(Math.random() * pool.length)] as PlayerColorId
}

function goHome() {
  router.push({ name: 'home' })
}

function getDreamName(dreamId: string): string {
  if (!dreamId) return '未选择'
  return DREAMS.find((d) => d.id === dreamId)?.name ?? '未知'
}

function getCareerDisplayName(careerId: string): string {
  if (careerId === 'random') return '随机职业'
  const career = getCareerById(careerId)
  return career?.name ?? '未知职业'
}
</script>

<template>
  <main class="w-full min-h-screen flex items-start justify-center px-4 py-8 sm:py-12 bg-background">
    <form
      class="w-full max-w-[720px] bg-card text-card-foreground border border-border rounded-[var(--radius-md)] shadow-md p-6 sm:p-8 space-y-6"
      autocomplete="off"
      @submit.prevent="beginGame"
    >
      <div class="space-y-1">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          创建新游戏
        </h1>
        <p class="text-sm text-muted-foreground">
          配置玩家、职业与可选规则，开始你的现金流之旅。
        </p>
      </div>

      <!-- Step 1: 玩家人数 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2 text-foreground">
          <Users class="w-5 h-5 text-muted-foreground" />
          <h2 class="text-sm font-semibold uppercase tracking-wide">玩家人数</h2>
        </div>
        <div class="relative">
          <select
            id="player-count"
            v-model.number="config.playerCount"
            class="w-full h-11 px-3 pr-10 appearance-none bg-background border border-input rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option v-for="n in playerCountOptions" :key="n" :value="n">{{ n }} 人</option>
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <ChevronDown class="w-4 h-4" />
          </span>
        </div>
      </section>

      <hr class="border-border" />

      <!-- Step 2: 玩家设置 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2 text-foreground">
          <Briefcase class="w-5 h-5 text-muted-foreground" />
          <Palette class="w-5 h-5 text-muted-foreground" />
          <h2 class="text-sm font-semibold uppercase tracking-wide">玩家设置</h2>
        </div>
        <div class="space-y-3">
          <div
            v-for="(setup, index) in activeSetups"
            :key="index"
            class="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-background"
          >
            <div class="sm:col-span-3">
              <label
                :for="`player-name-${index}`"
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >姓名</label
              >
              <input
                :id="`player-name-${index}`"
                v-model="setup.name"
                type="text"
                :placeholder="`玩家 ${index + 1}`"
                class="w-full h-10 px-3 bg-background border border-input rounded-[var(--radius-md)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
            <div class="sm:col-span-5">
              <label
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >职业</label
              >
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 h-10 px-3 bg-background border border-input rounded-[var(--radius-md)] text-foreground text-left text-sm hover:border-ring hover:ring-2 hover:ring-ring/20 transition-colors flex items-center justify-between"
                  @click="openCareerSelector(index)"
                >
                  <span class="truncate">
                    {{ getCareerDisplayName(setup.careerId) }}
                  </span>
                  <ChevronDown class="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                <button
                  type="button"
                  title="查看职业详情"
                  class="flex-shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  @click="openCareerDetail(setup.careerId)"
                >
                  <Info class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="随机职业"
                  class="flex-shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  @click="randomCareerForPlayer(index)"
                >
                  <Shuffle class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="sm:col-span-2">
              <label
                :for="`player-color-${index}`"
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >颜色</label
              >
              <div class="relative">
                <select
                  :id="`player-color-${index}`"
                  v-model="setup.colorId"
                  class="w-full h-10 px-3 pr-8 appearance-none bg-background border border-input rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option v-for="color in colorOptions" :key="color.id" :value="color.id">
                    {{ color.name }}
                  </option>
                </select>
                <span
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <ChevronDown class="w-4 h-4" />
                </span>
              </div>
            </div>
            <div class="sm:col-span-2">
              <label
                :for="`player-type-${index}`"
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >玩家类型</label
              >
              <div class="relative">
                <select
                  :id="`player-type-${index}`"
                  :value="setup.isAI ? setup.aiDifficulty : 'human'"
                  class="w-full h-10 px-3 pr-8 appearance-none bg-background border border-input rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  @change="(e: Event) => {
                    const val = (e.target as HTMLSelectElement).value
                    if (val === 'human') {
                      setup.isAI = false
                    } else {
                      setup.isAI = true
                      setup.aiDifficulty = val as 'easy' | 'medium' | 'hard'
                    }
                  }"
                >
                  <option
                    v-for="pt in playerTypeOptions"
                    :key="pt.id"
                    :value="pt.id"
                  >
                    {{ pt.name }}
                  </option>
                </select>
                <span
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <ChevronDown class="w-4 h-4" />
                </span>
              </div>
            </div>
            <!-- 梦想显示 -->
            <div class="sm:col-span-12">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles class="w-3.5 h-3.5" />
                  <span>梦想：</span>
                  <span class="text-foreground font-medium">
                    {{ getDreamName(setup.dreamId) }}
                  </span>
                </div>
                <button
                  type="button"
                  class="text-xs text-primary hover:text-primary/80 transition-colors"
                  @click="activePlayerIndex = index"
                >
                  选择梦想
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr class="border-border" />

      <!-- Step 3: 选择梦想 -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-foreground">
            <Sparkles class="w-5 h-5 text-muted-foreground" />
            <h2 class="text-sm font-semibold uppercase tracking-wide">选择梦想</h2>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            @click="randomDreamForAll"
          >
            <Shuffle class="w-3.5 h-3.5" />
            全部随机
          </button>
        </div>

        <!-- 玩家切换 tabs -->
        <div
          v-if="config.playerCount > 1"
          class="flex flex-wrap gap-2"
        >
          <button
            v-for="(setup, index) in activeSetups"
            :key="index"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors"
            :class="[
              activePlayerIndex === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ]"
            @click="activePlayerIndex = index"
          >
            <span
              class="w-2 h-2 rounded-full"
              :style="{
                backgroundColor:
                  setup.colorId === 'random'
                    ? '#9ca3af'
                    : PLAYER_COLORS.find((c) => c.id === setup.colorId)?.value ?? '#9ca3af',
              }"
            ></span>
            <Bot v-if="setup.isAI" class="w-3 h-3 opacity-70" />
            {{ setup.name }}
          </button>
        </div>

        <!-- 梦想选择器 -->
        <DreamSelector
          v-model="activeDreamId"
          :dreams="DREAMS"
        />
      </section>

      <hr class="border-border" />

      <!-- Step 4: 可选规则 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2 text-foreground">
          <Settings class="w-5 h-5 text-muted-foreground" />
          <h2 class="text-sm font-semibold uppercase tracking-wide">可选规则</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            class="group flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-background cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              v-model="config.insurance"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <div>
              <span class="block text-sm font-medium text-foreground">保险</span>
              <span class="block text-xs text-muted-foreground">避免裁员</span>
            </div>
          </label>
          <label
            class="group flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-background cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              v-model="config.bigFamily"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <div>
              <span class="block text-sm font-medium text-foreground">大家庭</span>
              <span class="block text-xs text-muted-foreground">提高孩子上限</span>
            </div>
          </label>
          <label
            class="group flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-background cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              v-model="config.mortgage"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <div>
              <span class="block text-sm font-medium text-foreground">抵押贷款</span>
              <span class="block text-xs text-muted-foreground">真实月供</span>
            </div>
          </label>
          <label
            class="group flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-background cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              v-model="config.fastStart"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <div>
              <span class="block text-sm font-medium text-foreground">速开</span>
              <span class="block text-xs text-muted-foreground">起始储蓄 = 总收入</span>
            </div>
          </label>
        </div>
      </section>

      <hr class="border-border" />

      <div
        v-if="errorMessage"
        class="rounded-[var(--radius-md)] bg-destructive/10 text-destructive text-sm px-4 py-2"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div
        class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2"
      >
        <button
          type="button"
          class="inline-flex items-center justify-center h-11 px-4 rounded-[var(--radius-md)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          @click="goHome"
        >
          <ArrowLeft class="w-4 h-4 mr-1" />
          返回首页
        </button>
        <button
          type="submit"
          data-dom-id="btn-begin"
          class="inline-flex items-center justify-center h-12 px-6 rounded-[var(--radius-md)] bg-primary text-primary-foreground text-base font-semibold shadow-sm hover:brightness-[0.96] transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canStart"
        >
          开始游戏
        </button>
      </div>
    </form>

    <!-- 职业详情 Modal -->
    <Teleport to="body">
      <div
        v-if="careerDetailModalOpen"
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
          <CareerDetailCard v-if="careerDetailCareer" :career="careerDetailCareer" />
        </div>
      </div>
    </Teleport>

    <!-- 职业选择器 Modal -->
    <CareerSelectorModal
      v-model="careerSelectorOpen"
      :selected-career-id="playerSetups[careerSelectorPlayerIndex]?.careerId ?? ''"
      :player-name="playerSetups[careerSelectorPlayerIndex]?.name ?? ''"
      @confirm="onCareerSelected"
    />
  </main>
</template>
