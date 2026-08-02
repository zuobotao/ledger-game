import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GameConfig, GamePhase, GameState, Player, PlayerColorId } from '@/types/game'
import { PLAYER_COLORS } from '@/types/game'
import { getCareerById, getRandomCareer } from '@/data/careers'

const STORAGE_KEY = 'cashflow101-game-state'

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function totalExpenses(expenses: Player['expenses']): number {
  return (
    expenses.taxes +
    expenses.mortgage +
    expenses.schoolLoan +
    expenses.carLoan +
    expenses.creditCard +
    expenses.other +
    expenses.child
  )
}

function createPlayer(
  name: string,
  colorId: PlayerColorId,
  careerId: string,
  config: GameConfig,
): Player {
  const career = careerId === 'random' ? getRandomCareer() : getCareerById(careerId) ?? getRandomCareer()
  const color = PLAYER_COLORS.find((c) => c.id === colorId)?.value ?? PLAYER_COLORS[0].value
  const expenses = { ...career.expenses }
  const startingCash = config.fastStart ? career.salary : career.startingCash

  return {
    id: createId(),
    name: name.trim() || '未命名玩家',
    color,
    career,
    salary: career.salary,
    passiveIncome: 0,
    totalIncome: career.salary,
    expenses,
    totalExpenses: totalExpenses(expenses),
    cashFlow: career.salary - totalExpenses(expenses),
    cash: startingCash,
    assets: [],
    liabilities: [],
    ratRacePosition: 0,
    fastTrackPosition: 0,
    isUnemployed: false,
    hasInsurance: config.insurance,
    childrenCount: 0,
  }
}

export const useGameStore = defineStore('game', () => {
  const players = ref<Player[]>([])
  const currentPlayerIndex = ref(0)
  const phase = ref<GamePhase>('setup')
  const config = ref<GameConfig>({
    playerCount: 2,
    insurance: false,
    bigFamily: false,
    mortgage: false,
    fastStart: false,
  })
  const winnerId = ref<string | null>(null)

  const currentPlayer = computed<Player | null>(() => players.value[currentPlayerIndex.value] ?? null)
  const isGameStarted = computed(() => phase.value === 'rat_race' || phase.value === 'fast_track')

  function startGame(setupConfig: GameConfig, playerSetups: { name: string; colorId: PlayerColorId; careerId: string }[]) {
    const validSetups = playerSetups.slice(0, setupConfig.playerCount)
    if (validSetups.length === 0) return false

    config.value = { ...setupConfig }
    players.value = validSetups.map((setup) => createPlayer(setup.name, setup.colorId, setup.careerId, config.value))
    currentPlayerIndex.value = 0
    phase.value = 'rat_race'
    winnerId.value = null
    saveState()
    return true
  }

  function resetGame() {
    players.value = []
    currentPlayerIndex.value = 0
    phase.value = 'setup'
    winnerId.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const state: GameState = JSON.parse(raw)
      players.value = state.players
      currentPlayerIndex.value = state.currentPlayerIndex
      phase.value = state.phase
      config.value = state.config
      winnerId.value = state.winnerId
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function saveState() {
    const state: GameState = {
      players: players.value,
      currentPlayerIndex: currentPlayerIndex.value,
      phase: phase.value,
      config: config.value,
      winnerId: winnerId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  loadState()

  return {
    players,
    currentPlayerIndex,
    phase,
    config,
    winnerId,
    currentPlayer,
    isGameStarted,
    startGame,
    resetGame,
    saveState,
  }
})
