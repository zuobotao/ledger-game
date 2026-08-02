<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Layers, Eye, ArrowLeftRight } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const isSpectator = computed(() => route.query.spectator === 'true')

// 统计各阶段玩家数量
const ratRacePlayers = computed(() =>
  gameStore.players.filter(
    (p) => !p.isBankrupt && (p.fastTrackPosition === undefined || p.fastTrackPosition === null),
  ),
)

const fastTrackPlayers = computed(() =>
  gameStore.players.filter(
    (p) => !p.isBankrupt && p.fastTrackPosition !== undefined && p.fastTrackPosition !== null,
  ),
)

const hasPlayersInBothPhases = computed(() =>
  ratRacePlayers.value.length > 0 && fastTrackPlayers.value.length > 0,
)

const currentPhaseIsRatRace = computed(() => gameStore.phase === 'rat_race')

function goToRatRace() {
  if (currentPhaseIsRatRace.value && !isSpectator.value) return
  router.push({ name: 'rat-race', query: { spectator: currentPhaseIsRatRace.value ? 'false' : 'true' } })
}

function goToFastTrack() {
  if (!currentPhaseIsRatRace.value && !isSpectator.value) return
  router.push({ name: 'fast-track', query: { spectator: !currentPhaseIsRatRace.value ? 'false' : 'true' } })
}

function returnToCurrentPhase() {
  if (currentPhaseIsRatRace.value) {
    router.push({ name: 'rat-race' })
  } else {
    router.push({ name: 'fast-track' })
  }
}
</script>

<template>
  <div v-if="hasPlayersInBothPhases" class="phase-switcher">
    <div class="switcher-header">
      <ArrowLeftRight class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-xs font-medium text-muted-foreground">跨阶段观战</span>
    </div>
    <div class="switcher-buttons">
      <button
        type="button"
        class="switcher-btn"
        :class="{
          active: (currentPhaseIsRatRace && !isSpectator) || (!currentPhaseIsRatRace && isSpectator),
        }"
        @click="goToRatRace"
      >
        <span class="btn-label">原始积累</span>
        <span class="btn-count">{{ ratRacePlayers.length }}人</span>
      </button>
      <button
        type="button"
        class="switcher-btn"
        :class="{
          active: (!currentPhaseIsRatRace && !isSpectator) || (currentPhaseIsRatRace && isSpectator),
        }"
        @click="goToFastTrack"
      >
        <span class="btn-label">资本游戏</span>
        <span class="btn-count">{{ fastTrackPlayers.length }}人</span>
      </button>
    </div>
    <div v-if="isSpectator" class="spectator-hint">
      <Eye class="h-3 w-3" />
      <span class="hint-text">观战模式</span>
      <button type="button" class="return-btn" @click="returnToCurrentPhase">
        返回回合
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/base.css";

.phase-switcher {
  @apply rounded-xl border border-border bg-secondary/30 p-3 backdrop-blur-sm;
}

.switcher-header {
  @apply mb-2 flex items-center gap-1.5;
}

.switcher-buttons {
  @apply flex gap-1;
}

.switcher-btn {
  @apply flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-transparent px-2 py-1.5 text-xs transition;
  @apply hover:bg-muted/50;
}

.switcher-btn.active {
  @apply border-primary/30 bg-primary/10 text-primary;
}

.btn-label {
  @apply font-medium;
}

.btn-count {
  @apply text-[10px] text-muted-foreground;
}

.switcher-btn.active .btn-count {
  @apply text-primary/70;
}

.spectator-hint {
  @apply mt-2 flex items-center justify-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-400;
}

.hint-text {
  @apply font-medium;
}

.return-btn {
  @apply ml-auto rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30;
}
</style>
