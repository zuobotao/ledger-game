<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Users, Briefcase, Palette, Settings, ChevronDown, ArrowLeft } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { CAREERS } from '@/data/careers'
import { PLAYER_COLORS, type PlayerColorId } from '@/types/game'
import type { GameConfig } from '@/types/game'

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
}

const playerSetups = reactive<PlayerSetup[]>(
  Array.from({ length: 6 }, (_, i) => ({
    name: `玩家 ${i + 1}`,
    careerId: 'random',
    colorId: 'random',
  })),
)

const activeSetups = computed(() => playerSetups.slice(0, config.playerCount))

watch(
  () => config.playerCount,
  (count) => {
    for (let i = 0; i < count; i++) {
      if (!playerSetups[i]?.name) {
        playerSetups[i] = { ...(playerSetups[i] ?? { careerId: 'random', colorId: 'random' }), name: `玩家 ${i + 1}` }
      }
    }
  },
)

const canStart = computed(() => {
  return activeSetups.value.every((p) => p.name.trim().length > 0)
})

const errorMessage = ref('')

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
            <div class="sm:col-span-4">
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
            <div class="sm:col-span-4">
              <label
                :for="`player-career-${index}`"
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >职业</label
              >
              <select
                :id="`player-career-${index}`"
                v-model="setup.careerId"
                class="w-full h-10 px-3 pr-8 appearance-none bg-background border border-input rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option
                  v-for="career in careerOptions"
                  :key="career.id"
                  :value="career.id"
                >
                  {{ career.name }}
                </option>
              </select>
            </div>
            <div class="sm:col-span-4">
              <label
                :for="`player-color-${index}`"
                class="block text-xs font-medium text-muted-foreground mb-1.5"
                >颜色</label
              >
              <select
                :id="`player-color-${index}`"
                v-model="setup.colorId"
                class="w-full h-10 px-3 pr-8 appearance-none bg-background border border-input rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option v-for="color in colorOptions" :key="color.id" :value="color.id">
                  {{ color.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <hr class="border-border" />

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
  </main>
</template>
