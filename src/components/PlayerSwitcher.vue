<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import type { Player } from '@/types/game'

const gameStore = useGameStore()

const showDropdown = defineModel<boolean>('show', { default: false })

function selectPlayer(player: Player) {
  if (player.id === gameStore.currentPlayer?.id) {
    gameStore.setViewingPlayer(null)
  } else {
    gameStore.setViewingPlayer(player.id)
  }
  showDropdown.value = false
}

function isViewing(player: Player): boolean {
  return gameStore.viewingPlayer?.id === player.id
}

function isCurrentTurn(player: Player): boolean {
  return gameStore.currentPlayer?.id === player.id
}
</script>

<template>
  <div class="player-switcher relative">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
      @click="showDropdown = !showDropdown"
    >
      <span class="flex items-center gap-2">
        <span
          class="h-3 w-3 rounded-full border border-white/20"
          :style="{ backgroundColor: gameStore.viewingPlayer?.color ?? '#888' }"
        />
        <span class="truncate">
          {{ gameStore.viewingPlayer?.name ?? '未选择' }}
          <span v-if="gameStore.viewingPlayer?.isBankrupt" class="text-xs text-destructive">
            · 已破产
          </span>
          <span v-else-if="isCurrentTurn(gameStore.viewingPlayer!)" class="text-xs text-primary">
            · 当前回合
          </span>
          <span v-else class="text-xs text-muted-foreground">
            · 观战
          </span>
        </span>
      </span>
      <Users class="h-4 w-4 text-muted-foreground" />
    </button>

    <Transition name="dropdown">
      <div
        v-if="showDropdown"
        class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-xl backdrop-blur-md"
      >
        <div class="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          切换查看玩家
        </div>
        <div class="max-h-60 overflow-y-auto py-1">
          <button
            v-for="player in gameStore.players"
            :key="player.id"
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted"
            :class="{
              'bg-primary/10': isViewing(player),
              'opacity-50': player.isBankrupt,
            }"
            @click="selectPlayer(player)"
          >
            <span
              class="h-3 w-3 shrink-0 rounded-full border border-white/20"
              :style="{ backgroundColor: player.color }"
            />
            <span class="flex-1 truncate font-medium">
              {{ player.name }}
              <span v-if="player.isAI" class="text-xs text-muted-foreground"> (AI)</span>
              <span v-if="player.isBankrupt" class="text-xs text-destructive"> · 破产</span>
            </span>
            <span v-if="isCurrentTurn(player)" class="text-xs text-primary font-medium">
              回合中
            </span>
            <span v-else-if="isViewing(player)" class="text-xs text-primary">
              查看中
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
