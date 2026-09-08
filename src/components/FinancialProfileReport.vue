<script setup lang="ts">
import { computed } from 'vue'
import { Activity, ShieldCheck, Sparkles, Wallet } from 'lucide-vue-next'
import type { CardHistoryRecord, Player, TransactionRecord } from '@/types/game'
import { buildFinancialProfile } from '@/utils/financialProfile'

const props = defineProps<{
  player: Player
  transactions: TransactionRecord[]
  cardHistory: CardHistoryRecord[]
}>()

const profile = computed(() => buildFinancialProfile(props))
const icons = [Wallet, ShieldCheck, Activity, Sparkles]
</script>

<template>
  <div class="financial-profile-report">
    <div class="profile-intro">
      <div>
        <p class="profile-kicker">本局行为画像</p>
        <p class="profile-description">四个稳定维度，帮助你读懂这一局的财务决策。</p>
      </div>
      <span class="profile-badge">游戏化复盘</span>
    </div>
    <div class="profile-grid">
      <article v-for="(dimension, index) in profile.dimensions" :key="dimension.key" class="profile-card">
        <div class="profile-card-heading">
          <component :is="icons[index]" class="h-4 w-4 text-primary" />
          <span>{{ dimension.title }}</span>
          <span class="profile-level">{{ dimension.level }}</span>
        </div>
        <div class="profile-score-row">
          <strong>{{ dimension.level }}</strong>
          <span>{{ dimension.score }}/100</span>
        </div>
        <div class="profile-meter"><span :style="{ width: `${dimension.score}%` }" /></div>
        <p class="profile-summary">{{ dimension.summary }}</p>
        <div class="profile-evidence">
          <div v-for="item in dimension.evidence" :key="item.label" class="profile-evidence-row">
            <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </div>
    <p class="profile-disclaimer">{{ profile.disclaimer }}</p>
  </div>
</template>

<style scoped>
.financial-profile-report { display: flex; flex-direction: column; gap: 14px; }
.profile-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.profile-kicker { margin: 0; font-size: 15px; font-weight: 700; color: var(--color-foreground); }
.profile-description { margin: 4px 0 0; font-size: 12px; color: var(--color-muted-foreground); }
.profile-badge { flex-shrink: 0; padding: 4px 8px; border-radius: 999px; background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary); font-size: 10px; }
.profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.profile-card { padding: 12px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-secondary); }
.profile-card-heading, .profile-score-row, .profile-evidence-row { display: flex; align-items: center; gap: 6px; }
.profile-card-heading { font-size: 12px; font-weight: 600; color: var(--color-foreground); }
.profile-level { margin-left: auto; color: var(--color-primary); font-size: 11px; }
.profile-score-row { justify-content: space-between; margin-top: 10px; font-size: 12px; color: var(--color-muted-foreground); }
.profile-score-row strong { color: var(--color-foreground); }
.profile-meter { height: 5px; margin: 7px 0 9px; overflow: hidden; border-radius: 999px; background: var(--color-muted); }
.profile-meter span { display: block; height: 100%; border-radius: inherit; background: var(--color-primary); }
.profile-summary { min-height: 36px; margin: 0 0 10px; font-size: 11px; line-height: 1.55; color: var(--color-muted-foreground); }
.profile-evidence { display: flex; flex-direction: column; gap: 5px; padding-top: 8px; border-top: 1px solid var(--color-border); }
.profile-evidence-row { justify-content: space-between; font-size: 10px; color: var(--color-muted-foreground); }
.profile-evidence-row strong { color: var(--color-foreground); font-weight: 600; }
.profile-disclaimer { margin: 0; font-size: 10px; line-height: 1.5; color: var(--color-muted-foreground); }
@media (max-width: 480px) { .profile-grid { grid-template-columns: 1fr; } }
</style>
