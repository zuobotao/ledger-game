import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Asset,
  CardHistoryRecord,
  CardHistoryType,
  DoodadCard,
  FinancialSnapshot,
  FinancialStatementKey,
  FinancialStatementNumberField,
  FinancialStatementState,
  GameConfig,
  GamePhase,
  GameState,
  Liability,
  MarketEventCard,
  MarketEventState,
  OpportunityCard,
  PendingAction,
  Player,
  PlayerColorId,
  StoryCard,
  StockSellOpportunityState,
  TransactionRecord,
  TransactionType,
  TurnStatus,
} from '@/types/game'
import {
  BANK_CONFIG,
  FAST_TRACK_BOARD_SIZE,
  MAX_AGE_MONTHS,
  MAX_CHILDREN,
  PLAYER_COLORS,
  RAT_RACE_BOARD_SIZE,
  START_AGE,
  UNEMPLOYMENT_INSURANCE_RATE,
} from '@/types/game'
import { getCareerById, getRandomCareer } from '@/data/careers'
import { getFastTrackCell, getRatRaceCell } from '@/data/board'
import {
  createDecks,
  drawDoodadCard,
  drawFastTrackOpportunity,
  drawMarketCard,
  drawOpportunityCard,
  drawSmallOpportunityCard,
  drawBigOpportunityCard,
  drawStoryCard,
} from '@/data/cards'
import { getDreamById, getRandomDream } from '@/data/dreams'
import type { CardDeck } from '@/types/game'
import { AIDecision } from '@/utils/aiDecision'
import type { AIDifficulty } from '@/utils/aiDecision'

const STORAGE_KEY = 'cashflow101-game-state'

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function createFinancialStatement(): FinancialStatementState {
  return {
    userTotalAssets: null,
    userTotalLiabilities: null,
    userNetWorth: null,
    userPassiveIncome: null,
    userTotalIncome: null,
    userTotalExpenses: null,
    userMonthlyCashFlow: null,
    userOtherAssets: null,
    userOtherLiabilities: null,
    userOtherExpenses: null,
    verified: {},
    viewedAnswers: [],
  }
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
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

function createCareerLiabilities(career: Player['career']): Liability[] {
  const liabilities: Liability[] = []
  if (career.expenses.mortgage > 0) {
    liabilities.push({
      id: createId(),
      name: '房屋抵押贷款',
      amount: career.expenses.mortgage * 120,
      monthlyPayment: career.expenses.mortgage,
      category: 'mortgage',
    })
  }
  if (career.expenses.schoolLoan > 0) {
    liabilities.push({
      id: createId(),
      name: '学生贷款',
      amount: career.expenses.schoolLoan * 60,
      monthlyPayment: career.expenses.schoolLoan,
      category: 'school_loan',
    })
  }
  if (career.expenses.carLoan > 0) {
    liabilities.push({
      id: createId(),
      name: '汽车贷款',
      amount: career.expenses.carLoan * 60,
      monthlyPayment: career.expenses.carLoan,
      category: 'car_loan',
    })
  }
  if (career.expenses.creditCard > 0) {
    liabilities.push({
      id: createId(),
      name: '信用卡欠款',
      amount: career.expenses.creditCard * 24,
      monthlyPayment: career.expenses.creditCard,
      category: 'credit_card',
    })
  }
  return liabilities
}

function recalcPlayerFinancials(player: Player): void {
  player.passiveIncome = player.assets.reduce((sum, asset) => sum + asset.cashFlow * asset.quantity, 0)
  player.expenses.child = player.childrenCount * player.career.expenses.child

  const salary = player.isUnemployed ? 0 : player.salary
  player.totalIncome = salary + player.passiveIncome
  player.totalExpenses = totalExpenses(player.expenses)
  player.cashFlow = player.totalIncome - player.totalExpenses
}

function calcPlayerNetWorth(player: Player): number {
  const assetsValue = player.assets.reduce(
    (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity,
    0,
  )
  const totalAssets = player.cash + player.savings + assetsValue
  const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return totalAssets - totalLiabilities
}

function createFinancialSnapshot(player: Player, turn: number): FinancialSnapshot {
  const stockValue = player.assets
    .filter((a) => a.type === 'stock')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const realEstateValue = player.assets
    .filter((a) => a.type === 'real_estate')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const businessValue = player.assets
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)
  const otherAssetsValue = player.assets
    .filter((a) => a.type === 'other')
    .reduce((sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity, 0)

  const totalAssets = player.cash + player.savings + stockValue + realEstateValue + businessValue + otherAssetsValue
  const totalLiabilities = player.liabilities.reduce((sum, l) => sum + l.amount, 0)

  return {
    turn,
    cash: player.cash + player.savings,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalIncome: player.totalIncome,
    totalExpenses: player.totalExpenses,
    monthlyCashFlow: player.cashFlow,
    stockValue,
    realEstateValue,
    businessValue,
  }
}

function createPlayer(
  name: string,
  colorId: PlayerColorId,
  careerId: string,
  config: GameConfig,
  dreamId?: string,
  isAI = false,
  aiDifficulty?: AIDifficulty,
): Player {
  const career = careerId === 'random' ? getRandomCareer() : getCareerById(careerId) ?? getRandomCareer()
  const color = PLAYER_COLORS.find((c) => c.id === colorId)?.value ?? PLAYER_COLORS[0].value
  const expenses: Player['expenses'] = { ...career.expenses, child: 0 }
  if (config.mortgage) {
    expenses.mortgage = Math.round(expenses.mortgage * 1.5)
  }
  const startingCash = config.fastStart ? career.salary : career.startingCash
  const liabilities = createCareerLiabilities({ ...career, expenses })
  const dream = dreamId ? getDreamById(dreamId) : undefined

  const player: Player = {
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
    savings: 0,
    assets: [],
    liabilities,
    ratRacePosition: 0,
    fastTrackPosition: 0,
    isUnemployed: false,
    unemploymentTurns: 0,
    hasInsurance: config.insurance,
    hasUnemploymentInsurance: false,
    childrenCount: 0,
    doubleDiceNextTurn: false,
    charityProtection: false,
    ageMonths: 0,
    dream,
    isAI,
    aiDifficulty,
    isBankrupt: false,
    financialStatement: createFinancialStatement(),
    financialSnapshots: [],
  }

  recalcPlayerFinancials(player)
  return player
}

function rollDiceValues(count = 1): number[] {
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(Math.floor(Math.random() * 6) + 1)
  }
  return values
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
    ageLimit: true,
  })
  const winnerId = ref<string | null>(null)
  const gameEndReason = ref<'victory' | 'retirement' | 'bankrupt' | null>(null)
  const turnStatus = ref<TurnStatus>('idle')
  const lastRoll = ref(0)
  const lastDiceValues = ref<number[]>([])
  const turnNumber = ref(1)
  const gameMonth = ref(0)
  const pendingAction = ref<PendingAction>({ type: null, card: null, message: '' })
  const marketEvent = ref<MarketEventCard | null>(null)
  const marketEventState = ref<MarketEventState | null>(null)
  const stockSellOpportunity = ref<OpportunityCard | null>(null)
  const stockSellOpportunityState = ref<StockSellOpportunityState | null>(null)
  const decks = ref<CardDeck>(createDecks())
  const transactions = ref<TransactionRecord[]>([])
  const cardHistory = ref<CardHistoryRecord[]>([])
  const isAIThinking = ref(false)
  const viewingPlayerId = ref<string | null>(null)
  const viewingPhase = ref<'rat_race' | 'fast_track' | null>(null)
  const learningMode = ref(false)
  const gameStartTime = ref(0)
  const ratRaceTurns = ref(0)
  const fastTrackTurns = ref(0)

  const currentPlayer = computed<Player | null>(() => players.value[currentPlayerIndex.value] ?? null)

  // 主玩家（第一个非AI玩家，如果全是AI则用第一个）
  const mainPlayer = computed<Player | null>(() => {
    const human = players.value.find((p) => !p.isAI)
    return human ?? players.value[0] ?? null
  })
  const isGameStarted = computed(() => phase.value === 'rat_race' || phase.value === 'fast_track')

  const currentPlayerAge = computed(() => {
    const totalMonths = gameMonth.value
    const years = START_AGE + Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    const percent = Math.min(100, (totalMonths / MAX_AGE_MONTHS) * 100)
    return { years, months, percent, totalMonths }
  })

  // 当前查看的玩家（用于多人模式下切换查看其他玩家面板）
  const viewingPlayer = computed<Player | null>(() => {
    if (viewingPlayerId.value) {
      return players.value.find((p) => p.id === viewingPlayerId.value) ?? null
    }
    return currentPlayer.value
  })

  const canCurrentPlayerEnterFastTrack = computed(() => {
    const p = currentPlayer.value
    if (!p || phase.value !== 'rat_race') return false
    return p.passiveIncome >= p.totalExpenses
  })

  // ========== 财务报表计算属性（正确答案） ==========
  const correctTotalAssets = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    // 现金 + 储蓄 + 所有资产市值
    const assetsValue = p.assets.reduce((sum, a) => {
      return sum + (a.marketPrice ?? a.cost) * a.quantity
    }, 0)
    return p.cash + p.savings + assetsValue
  })

  const correctTotalLiabilities = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    return p.liabilities.reduce((sum, l) => sum + l.amount, 0)
  })

  const correctNetWorth = computed(() => {
    return correctTotalAssets.value - correctTotalLiabilities.value
  })

  const correctPassiveIncome = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    return p.passiveIncome
  })

  const correctTotalIncome = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    return p.totalIncome
  })

  const correctTotalExpenses = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    return p.totalExpenses
  })

  const correctMonthlyCashFlow = computed(() => {
    const p = currentPlayer.value
    if (!p) return 0
    return p.cashFlow
  })

  function getStockHolding(symbol: string): Asset | undefined {
    const p = currentPlayer.value
    if (!p) return undefined
    return p.assets.find((a) => a.type === 'stock' && a.symbol === symbol)
  }

  function recordTransaction(
    type: TransactionType,
    amount: number,
    description: string,
    playerId?: string,
    extra?: Partial<TransactionRecord>,
  ) {
    const record: TransactionRecord = {
      id: createId(),
      turnNumber: turnNumber.value,
      playerId: playerId ?? currentPlayer.value?.id ?? '',
      type,
      amount,
      description,
      timestamp: Date.now(),
      ...extra,
    }
    transactions.value.push(record)
  }

  function recordCardDrawn(
    type: CardHistoryType,
    card: { id: string; title: string; description: string },
    playerId?: string,
    action?: CardHistoryRecord['action'],
    amount?: number,
  ) {
    const record: CardHistoryRecord = {
      id: createId(),
      turnNumber: turnNumber.value,
      playerId: playerId ?? currentPlayer.value?.id ?? '',
      type,
      cardId: card.id,
      cardTitle: card.title,
      cardDescription: card.description,
      action,
      amount,
      timestamp: Date.now(),
    }
    cardHistory.value.push(record)
  }

  // ========== 财务报表教育功能 ==========
  function setFinancialStatementValue(field: FinancialStatementNumberField, value: number | null) {
    const p = currentPlayer.value
    if (!p) return
    const fs = p.financialStatement as unknown as Record<string, number | null>
    fs[field] = value
    // 修改后清除该字段的校验状态
    delete p.financialStatement.verified[field]
    saveState()
  }

  function verifyFinancialItem(item: FinancialStatementKey): boolean {
    const p = currentPlayer.value
    if (!p) return false

    const fs = p.financialStatement as unknown as Record<string, number | null>
    const userValue = fs[item]
    if (userValue === null || userValue === undefined) return false

    const correctMap: Record<FinancialStatementKey, number> = {
      userTotalAssets: correctTotalAssets.value,
      userTotalLiabilities: correctTotalLiabilities.value,
      userNetWorth: correctNetWorth.value,
      userPassiveIncome: correctPassiveIncome.value,
      userTotalIncome: correctTotalIncome.value,
      userTotalExpenses: correctTotalExpenses.value,
      userMonthlyCashFlow: correctMonthlyCashFlow.value,
    }

    const correct = correctMap[item]
    if (correct === undefined) return false

    const isCorrect = Math.round(userValue) === Math.round(correct)
    p.financialStatement.verified[item] = isCorrect
    saveState()
    return isCorrect
  }

  function viewAnswer(item: string) {
    const p = currentPlayer.value
    if (!p) return
    if (!p.financialStatement.viewedAnswers.includes(item)) {
      p.financialStatement.viewedAnswers.push(item)
    }
    saveState()
  }

  function saveState() {
    const state: GameState = {
      players: players.value,
      currentPlayerIndex: currentPlayerIndex.value,
      phase: phase.value,
      config: config.value,
      winnerId: winnerId.value,
      gameEndReason: gameEndReason.value,
      turnStatus: turnStatus.value,
      lastRoll: lastRoll.value,
      turnNumber: turnNumber.value,
      gameMonth: gameMonth.value,
      pendingAction: pendingAction.value,
      marketEvent: marketEvent.value,
      marketEventState: marketEventState.value,
      decks: decks.value,
      transactions: transactions.value,
      cardHistory: cardHistory.value,
      gameStartTime: gameStartTime.value,
      ratRaceTurns: ratRaceTurns.value,
      fastTrackTurns: fastTrackTurns.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const state: GameState = JSON.parse(raw)
      players.value = state.players.map((p) => {
        const patched: Player = { ...p }
        patched.unemploymentTurns ??= 0
        patched.doubleDiceNextTurn ??= false
        patched.charityProtection ??= false
        patched.isAI ??= false
        patched.ageMonths ??= 0
        patched.hasUnemploymentInsurance ??= false
        if (!patched.financialStatement) {
          patched.financialStatement = createFinancialStatement()
        }
        if (!patched.financialSnapshots) {
          patched.financialSnapshots = []
        }
        return patched
      })
      currentPlayerIndex.value = state.currentPlayerIndex ?? 0
      phase.value = state.phase ?? 'setup'
      config.value = state.config ?? config.value
      winnerId.value = state.winnerId ?? null
      gameEndReason.value = state.gameEndReason ?? null
      turnStatus.value = state.turnStatus ?? 'idle'
      lastRoll.value = state.lastRoll ?? 0
      turnNumber.value = state.turnNumber ?? 1
      gameMonth.value = state.gameMonth ?? 0
      pendingAction.value = state.pendingAction ?? { type: null, card: null, message: '' }
      marketEvent.value = state.marketEvent ?? null
      marketEventState.value = state.marketEventState ?? null
      decks.value = state.decks ?? createDecks()
      transactions.value = state.transactions ?? []
      cardHistory.value = state.cardHistory ?? []
      gameStartTime.value = state.gameStartTime ?? 0
      ratRaceTurns.value = state.ratRaceTurns ?? 0
      fastTrackTurns.value = state.fastTrackTurns ?? 0
      players.value.forEach(recalcPlayerFinancials)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function startGame(
    setupConfig: GameConfig,
    playerSetups: {
      name: string
      colorId: PlayerColorId
      careerId: string
      dreamId?: string
      isAI?: boolean
      aiDifficulty?: AIDifficulty
    }[],
  ) {
    const validSetups = playerSetups.slice(0, setupConfig.playerCount)
    if (validSetups.length === 0) return false

    config.value = { ...setupConfig }
    players.value = validSetups.map((setup) =>
      createPlayer(
        setup.name,
        setup.colorId,
        setup.careerId,
        config.value,
        setup.dreamId,
        setup.isAI ?? false,
        setup.aiDifficulty,
      ),
    )
    currentPlayerIndex.value = 0
    phase.value = 'rat_race'
    winnerId.value = null
    gameEndReason.value = null
    turnStatus.value = 'idle'
    lastRoll.value = 0
    turnNumber.value = 1
    gameMonth.value = 0
    gameStartTime.value = Date.now()
    ratRaceTurns.value = 0
    fastTrackTurns.value = 0
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
    marketEventState.value = null
    decks.value = createDecks()
    transactions.value = []
    cardHistory.value = []
    // 记录初始财务快照
    players.value.forEach((p) => {
      p.financialSnapshots.push(createFinancialSnapshot(p, 0))
    })
    saveState()

    // 如果第一个玩家是 AI，自动开始 AI 回合
    const firstPlayer = players.value[0]
    if (firstPlayer?.isAI && phase.value === 'rat_race') {
      setTimeout(() => {
        runAITurn()
      }, 500)
    }

    return true
  }

  function resetGame() {
    players.value = []
    currentPlayerIndex.value = 0
    phase.value = 'setup'
    winnerId.value = null
    gameEndReason.value = null
    turnStatus.value = 'idle'
    lastRoll.value = 0
    turnNumber.value = 1
    gameMonth.value = 0
    gameStartTime.value = 0
    ratRaceTurns.value = 0
    fastTrackTurns.value = 0
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
    marketEventState.value = null
    decks.value = createDecks()
    transactions.value = []
    cardHistory.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  function setPending(
    type: PendingAction['type'],
    message: string,
    card: PendingAction['card'] = null,
    meta?: Record<string, unknown>,
    messageType?: PendingAction['messageType'],
  ) {
    pendingAction.value = { type, card, message, meta, messageType }
  }

  /** 设置纯消息型 toast（type=null，带消息类型） */
  function setMessageToast(message: string, messageType: PendingAction['messageType'] = 'info') {
    pendingAction.value = { type: null, card: null, message, messageType }
  }

  function setPendingMessage(message: string, messageType?: PendingAction['messageType']) {
    pendingAction.value = {
      ...pendingAction.value,
      message,
      messageType,
    }
  }

  function clearPending() {
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
    marketEventState.value = null
    stockSellOpportunity.value = null
    stockSellOpportunityState.value = null
  }

  function setViewingPlayer(playerId: string | null) {
    viewingPlayerId.value = playerId
    saveState()
  }

  function setViewingPhase(phase: 'rat_race' | 'fast_track' | null) {
    viewingPhase.value = phase
    saveState()
  }

  function toggleLearningMode() {
    learningMode.value = !learningMode.value
    saveState()
  }

  // 当前显示的阶段（用于跨阶段观战）
  const displayPhase = computed(() => viewingPhase.value ?? phase.value)

  // 是否处于跨阶段观战模式
  const isSpectatingOtherPhase = computed(() => viewingPhase.value !== null && viewingPhase.value !== phase.value)

  function moveToNextPlayer() {
    const count = players.value.length
    if (count === 0) return
    // 为当前玩家记录财务快照
    const currentP = currentPlayer.value
    if (currentP) {
      currentP.financialSnapshots.push(createFinancialSnapshot(currentP, turnNumber.value))
      // 最多保留 100 个快照
      if (currentP.financialSnapshots.length > 100) {
        currentP.financialSnapshots.shift()
      }
    }

    // 寻找下一个未破产的玩家
    let nextIndex = currentPlayerIndex.value
    const wasLastPlayer = nextIndex === count - 1
    let skippedCount = 0
    do {
      nextIndex = (nextIndex + 1) % count
      skippedCount++
      // 防止死循环（所有玩家都破产的极端情况）
      if (skippedCount > count) {
        break
      }
    } while (players.value[nextIndex]?.isBankrupt)

    currentPlayerIndex.value = nextIndex
    if (wasLastPlayer) {
      turnNumber.value += 1
      // 按阶段累计回合数
      if (phase.value === 'rat_race') {
        ratRaceTurns.value += 1
      } else if (phase.value === 'fast_track') {
        fastTrackTurns.value += 1
      }
    }
    const p = currentPlayer.value
    if (!p) return

    if (p.unemploymentTurns > 0) {
      p.unemploymentTurns -= 1
      if (p.unemploymentTurns === 0) {
        p.isUnemployed = false
      }
      recalcPlayerFinancials(p)
    }
    turnStatus.value = 'idle'
    lastRoll.value = 0
    clearPending()

    // 检查是否因破产只剩一名玩家（多人模式胜利条件）
    checkBankruptcyVictory()

    saveState()

    // 如果下一个玩家是 AI，自动执行 AI 回合
    const nextPlayer = currentPlayer.value
    if (
      autoAITrigger.value &&
      nextPlayer?.isAI &&
      !nextPlayer.isBankrupt &&
      (phase.value === 'rat_race' || phase.value === 'fast_track')
    ) {
      // 用 setTimeout 避免在 moveToNextPlayer 中嵌套调用
      setTimeout(() => {
        runAITurn()
      }, 100)
    }
  }

  function handlePayday(player: Player): string {
    let msg = ''
    if (player.isUnemployed) {
      if (player.hasUnemploymentInsurance) {
        // 失业+有失业保险：领全额工资
        player.cash += player.cashFlow
        recordTransaction('unemployment_insurance_benefit', player.cashFlow, '失业保险金', player.id)
        msg = `失业中：失业保险生效，领取 ${formatMoney(player.cashFlow)} 全额工资。`
      } else {
        // 失业+无保险：扣支出
        player.cash -= player.totalExpenses
        recordTransaction('expense', -player.totalExpenses, '失业支出', player.id)
        msg = `失业中：没有工资，仍需支付 ${formatMoney(player.totalExpenses)} 支出。`
      }
    } else {
      // 就业：先扣失业保险保费，再发工资
      let premium = 0
      if (player.hasUnemploymentInsurance) {
        premium = Math.round(player.salary * UNEMPLOYMENT_INSURANCE_RATE)
        player.cash -= premium
        recordTransaction('unemployment_insurance_premium', -premium, '失业保险保费', player.id)
      }
      player.cash += player.cashFlow
      recordTransaction('salary', player.cashFlow, '发工资', player.id)
      msg = `发工资：获得 ${formatMoney(player.cashFlow)} 现金流${premium > 0 ? `，扣除失业保险 ${formatMoney(premium)}` : ''}。`
    }

    // 年龄递增（全局游戏时间）
    gameMonth.value += 1

    // 检查退休
    if (config.value.ageLimit && gameMonth.value >= MAX_AGE_MONTHS) {
      triggerRetirement()
    }

    return msg
  }

  function requireLoanForPayment(amount: number, reason: string, onResolved: () => void): boolean {
    const player = currentPlayer.value
    if (!player) return false
    if (player.cash >= amount) {
      onResolved()
      return true
    }
    const shortfall = amount - player.cash
    const needed = Math.ceil(shortfall / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
    setPending(
      'need_loan',
      `${reason} 需要 ${formatMoney(amount)}，你当前现金 ${formatMoney(player.cash)}，差额 ${formatMoney(shortfall)}。是否申请银行贷款 ${formatMoney(needed)}？`,
      null,
      { amount, needed, onResolved: onResolved as unknown as () => void },
    )
    return false
  }

  function applyDoodad(card: DoodadCard, player: Player): string {
    const paid = requireLoanForPayment(card.cost, `生活意外：${card.title}`, () => {
      player.cash -= card.cost
      recordTransaction('doodad', -card.cost, card.title, player.id)
      setPending(null, `生活意外：${card.title}，支出 ${formatMoney(card.cost)}。`)
      turnStatus.value = 'resolving'
      saveState()
    })
    if (!paid) {
      pendingAction.value.card = card
      return pendingAction.value.message
    }
    return `生活意外：${card.title}，支出 ${formatMoney(card.cost)}。`
  }

  function applyStoryCard(card: StoryCard, player: Player): string {
    const effect = card.effect
    let message = ''

    switch (effect.type) {
      case 'cash': {
        const amount = effect.amount ?? 0
        if (amount >= 0) {
          player.cash += amount
          recordTransaction('story_gain', amount, `${card.title} - ${effect.description}`, player.id)
          message = `${card.title}：${effect.description}`
        } else {
          // 负数：现金减少
          const absAmount = Math.abs(amount)
          const paid = requireLoanForPayment(absAmount, `故事卡：${card.title}`, () => {
            player.cash += amount // amount is negative
            recordTransaction('story_loss', amount, `${card.title} - ${effect.description}`, player.id)
            setPending('story', `${card.title}：${effect.description}`, card)
            turnStatus.value = 'resolving'
            saveState()
          })
          if (!paid) {
            pendingAction.value.card = card
            return pendingAction.value.message
          }
          message = `${card.title}：${effect.description}`
        }
        break
      }
      case 'passive_income': {
        const amount = effect.amount ?? 0
        // 被动收入增加/减少：通过创建一个特殊的"故事收入"资产来实现
        const existingStoryAsset = player.assets.find(
          (a) => a.type === 'other' && a.name === '历史故事收入',
        )
        if (existingStoryAsset) {
          existingStoryAsset.cashFlow += amount
          existingStoryAsset.quantity += 1
        } else {
          player.assets.push({
            id: createId(),
            name: '历史故事收入',
            type: 'other',
            cost: 0,
            cashFlow: amount,
            quantity: 1,
          })
        }
        recalcPlayerFinancials(player)
        recordTransaction(
          amount >= 0 ? 'story_gain' : 'story_loss',
          amount,
          `${card.title} - ${effect.description}`,
          player.id,
        )
        message = `${card.title}：${effect.description}`
        break
      }
      default:
        message = `${card.title}：故事结束。`
    }

    return message
  }

  function applyMarketEvent(card: MarketEventCard, _player: Player): string {
    // 先对所有玩家应用价格变动（贬值/升值都更新市价）
    for (const p of players.value) {
      p.assets
        .filter((a) => card.targetType === 'all' || a.type === card.targetType ||
          (card.targetType === 'stock' && card.targetSymbol && a.symbol === card.targetSymbol))
        .forEach((a) => {
          a.marketPrice = (a.marketPrice ?? a.cost) * card.multiplier
        })
    }

    if (card.multiplier < 1) {
      return `${card.title}：受影响的资产贬值 ${Math.round((1 - card.multiplier) * 100)}%。`
    }

    // 升值：进入多玩家轮询模式
    marketEvent.value = card
    marketEventState.value = {
      card,
      responderIndex: currentPlayerIndex.value,
      respondedIds: [],
      phase: 'current_player',
    }
    return card.description
  }

  // 资本游戏阶段的市场事件：仅更新价格，不进入多玩家轮询
  function applyMarketEventFastTrack(card: MarketEventCard, _player: Player): string {
    for (const p of players.value) {
      p.assets
        .filter((a) => card.targetType === 'all' || a.type === card.targetType ||
          (card.targetType === 'stock' && card.targetSymbol && a.symbol === card.targetSymbol))
        .forEach((a) => {
          a.marketPrice = (a.marketPrice ?? a.cost) * card.multiplier
        })
    }
    if (card.multiplier < 1) {
      return `资产贬值 ${Math.round((1 - card.multiplier) * 100)}%`
    }
    return `资产升值 ${Math.round((card.multiplier - 1) * 100)}%`
  }

  // 检查玩家是否有可卖出的相关资产
  function hasSellableAssetsForMarket(player: Player, card: MarketEventCard): boolean {
    return player.assets.some((a) => {
      if (card.targetType === 'all') return true
      if (card.targetType === 'stock' && card.targetSymbol) {
        return a.type === 'stock' && a.symbol === card.targetSymbol
      }
      return a.type === card.targetType
    })
  }

  // 获取下一个有可卖资产的玩家索引
  function findNextResponder(startIndex: number): number | null {
    const card = marketEventState.value?.card
    if (!card) return null
    const count = players.value.length
    for (let i = 1; i <= count; i++) {
      const idx = (startIndex + i) % count
      const p = players.value[idx]
      if (!p) continue
      // 跳过已回应的
      if (marketEventState.value?.respondedIds.includes(p.id)) continue
      // 跳过没有可卖资产的玩家
      if (!hasSellableAssetsForMarket(p, card)) continue
      return idx
    }
    return null
  }

  // 推进到下一个回应玩家
  function advanceMarketResponder() {
    const state = marketEventState.value
    if (!state) return
    const currentPlayer = players.value[state.responderIndex]
    if (currentPlayer && !state.respondedIds.includes(currentPlayer.id)) {
      state.respondedIds.push(currentPlayer.id)
    }

    const nextIdx = findNextResponder(state.responderIndex)
    if (nextIdx === null) {
      // 所有玩家都处理完了
      state.phase = 'done'
      state.responderIndex = currentPlayerIndex.value
      return
    }

    state.responderIndex = nextIdx
    state.phase = 'other_players'
  }

  // 获取当前市场事件的回应玩家
  const marketResponder = computed<Player | null>(() => {
    const state = marketEventState.value
    if (!state) return null
    return players.value[state.responderIndex] ?? null
  })

  // 当前是否是我（当前回合玩家）在操作市场
  const isMarketMyTurn = computed(() => {
    const state = marketEventState.value
    if (!state) return false
    return state.responderIndex === currentPlayerIndex.value
  })

  function sellAssetToMarket(assetId: string, quantity?: number) {
    const state = marketEventState.value
    const card = marketEvent.value
    if (!state || !card) return false
    const player = players.value[state.responderIndex]
    if (!player) return false

    const assetIndex = player.assets.findIndex((a) => a.id === assetId)
    if (assetIndex === -1) return false
    const asset = player.assets[assetIndex]!

    const sellQty = Math.min(quantity ?? asset.quantity, asset.quantity)
    if (sellQty <= 0) return false

    let price = 0
    if (card.targetType === 'stock' && card.targetSymbol && asset.symbol === card.targetSymbol) {
      price = (card.fixedPrice ?? asset.cost) * sellQty
    } else if (card.targetType === asset.type) {
      price = asset.cost * card.multiplier * sellQty
    } else if (card.targetType === 'all') {
      price = asset.cost * card.multiplier * sellQty
    } else {
      return false
    }

    asset.quantity -= sellQty
    if (asset.quantity <= 0) {
      player.assets.splice(assetIndex, 1)
    }
    player.cash += price
    recalcPlayerFinancials(player)

    const txType: TransactionType =
      asset.type === 'stock' ? 'stock_sell' : asset.type === 'real_estate' ? 'real_estate_sell' : 'business_sell'
    recordTransaction(txType, price, `卖出 ${asset.name}`, player.id, {
      assetSymbol: asset.symbol,
      assetQuantity: sellQty,
      unitPrice: price / sellQty,
      costBasis: asset.cost * sellQty,
      assetName: asset.name,
      assetType: asset.type,
    })

    const msg = `${player.name} 卖出 ${asset.name} ×${sellQty}，获得 ${formatMoney(price)}。可继续卖出其他资产，或点击结束。`
    setPending('market', msg, card)
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  function dismissMarketEvent() {
    const state = marketEventState.value
    if (!state) {
      setPending(null, '市场风云结束。')
      turnStatus.value = 'resolving'
      saveState()
      return
    }

    // 当前回应玩家完成
    advanceMarketResponder()

    if (state.phase === 'done') {
      // 全部完成
      marketEvent.value = null
      marketEventState.value = null
      setPending(null, '市场风云结束，所有玩家已操作。')
      turnStatus.value = 'resolving'
    } else {
      // 切换到下一个玩家
      const nextPlayer = players.value[state.responderIndex]
      setPending('market', `${state.card.title} — 轮到 ${nextPlayer?.name ?? '?'} 操作。`, state.card)
      turnStatus.value = 'resolving'

      // 如果下一个回应玩家是 AI，自动处理
      if (nextPlayer?.isAI && autoAITrigger.value) {
        setTimeout(() => {
          aiHandleMarketEvent()
        }, 300)
      }
    }
    saveState()
  }

  // 检查玩家是否持有特定股票
  function hasStockHolding(player: Player, symbol: string): boolean {
    return player.assets.some((a) => a.type === 'stock' && a.symbol === symbol)
  }

  // 获取下一个持有特定股票的玩家索引（多人股票卖出机会）
  function findNextStockSeller(startIndex: number, symbol: string): number | null {
    const state = stockSellOpportunityState.value
    if (!state) return null
    const count = players.value.length
    for (let i = 1; i <= count; i++) {
      const idx = (startIndex + i) % count
      const p = players.value[idx]
      if (!p) continue
      if (state.respondedIds.includes(p.id)) continue
      if (!hasStockHolding(p, symbol)) continue
      return idx
    }
    return null
  }

  // 推进股票卖出机会的下一个玩家
  function advanceStockSellResponder() {
    const state = stockSellOpportunityState.value
    if (!state) return
    const currPlayer = players.value[state.responderIndex]
    if (currPlayer && !state.respondedIds.includes(currPlayer.id)) {
      state.respondedIds.push(currPlayer.id)
    }

    const nextIdx = findNextStockSeller(state.responderIndex, state.symbol)
    if (nextIdx === null) {
      state.phase = 'done'
      state.responderIndex = currentPlayerIndex.value
      return
    }
    state.responderIndex = nextIdx
    state.phase = 'other_players'
  }

  // 当前股票卖出机会的回应玩家
  const stockSellResponder = computed<Player | null>(() => {
    const state = stockSellOpportunityState.value
    if (!state) return null
    return players.value[state.responderIndex] ?? null
  })

  // 当前是否是我（当前回合玩家）在操作股票卖出机会
  const isStockSellMyTurn = computed(() => {
    const state = stockSellOpportunityState.value
    if (!state) return false
    return state.responderIndex === currentPlayerIndex.value
  })

  // 玩家通过股票卖出机会卖出股票
  function sellStockFromOpportunity(symbol: string, price: number, quantity: number): boolean {
    const state = stockSellOpportunityState.value
    if (!state) return false
    const player = players.value[state.responderIndex]
    if (!player) return false

    const asset = player.assets.find((a) => a.type === 'stock' && a.symbol === symbol)
    if (!asset) return false

    const sellQty = Math.min(quantity, asset.quantity)
    if (sellQty <= 0) return false

    const total = price * sellQty
    player.cash += total
    asset.quantity -= sellQty
    if (asset.quantity <= 0) {
      player.assets = player.assets.filter((a) => a.id !== asset.id)
    }

    recordTransaction('stock_sell', total, `机会卖出 ${symbol} 股票`, player.id, {
      assetSymbol: symbol,
      unitPrice: price,
      assetQuantity: sellQty,
    })
    recalcPlayerFinancials(player)
    return true
  }

  // 结束当前股票卖出回应，推进到下一个玩家
  function dismissStockSellOpportunity() {
    const state = stockSellOpportunityState.value
    if (!state) return

    advanceStockSellResponder()

    if (state.phase === 'done') {
      stockSellOpportunity.value = null
      stockSellOpportunityState.value = null
      setPending(null, '股票卖出机会结束，所有持有人已操作。')
      turnStatus.value = 'resolving'
    } else {
      const nextPlayer = players.value[state.responderIndex]
      setPending(
        'stock_sell_opportunity',
        `股票卖出机会：${state.card.title} — 轮到 ${nextPlayer?.name ?? '?'} 操作。`,
        state.card,
      )
      turnStatus.value = 'resolving'

      if (nextPlayer?.isAI && autoAITrigger.value) {
        setTimeout(() => {
          aiHandleStockSellOpportunity()
        }, 300)
      }
    }
    saveState()
  }

  function ratRaceRollDice() {
    const player = currentPlayer.value
    if (!player || phase.value !== 'rat_race' || turnStatus.value !== 'idle') return

    const diceCount = player.doubleDiceNextTurn ? 2 : 1
    player.doubleDiceNextTurn = false
    const diceValues = rollDiceValues(diceCount)
    lastDiceValues.value = diceValues
    const roll = diceValues.reduce((a, b) => a + b, 0)
    lastRoll.value = roll
    turnStatus.value = 'rolling'

    const oldPosition = player.ratRacePosition
    player.ratRacePosition = (player.ratRacePosition + roll) % RAT_RACE_BOARD_SIZE
    const newPosition = player.ratRacePosition

    const messages: string[] = [`掷出 ${roll} 点，移动到 ${newPosition + 1} 格。`]

    // Payday for passing or landing on payday cells
    for (let i = 1; i <= roll; i++) {
      const pos = (oldPosition + i) % RAT_RACE_BOARD_SIZE
      const cell = getRatRaceCell(pos)
      if (cell.type === 'payday') {
        messages.push(handlePayday(player))
        // 退休后停止处理
        if (phase.value === 'finished') {
          turnStatus.value = 'finished'
          saveState()
          return
        }
      }
    }

    const landedCell = getRatRaceCell(newPosition)
    switch (landedCell.type) {
      case 'opportunity':
      case 'small_opportunity':
      case 'big_opportunity': {
        const isBig = landedCell.type === 'big_opportunity'
        const deckKey = isBig ? 'bigOpportunity' : 'smallOpportunity'
        const drawFn = isBig ? drawBigOpportunityCard : drawSmallOpportunityCard
        const { card, remaining } = drawFn(decks.value[deckKey])
        decks.value[deckKey] = remaining
        recordCardDrawn('opportunity', card)

        // 多人模式下，小机会的股票卖出卡：所有持有人都可以卖
        if (
          !isBig &&
          card.type === 'stock' &&
          card.action === 'sell' &&
          card.symbol &&
          players.value.length > 1
        ) {
          const hasAnyHolder = players.value.some((p) => hasStockHolding(p, card.symbol!))
          if (hasAnyHolder) {
            // 进入多人股票卖出轮询模式
            stockSellOpportunity.value = card
            stockSellOpportunityState.value = {
              card,
              responderIndex: currentPlayerIndex.value,
              respondedIds: [],
              phase: 'current_player',
              price: card.cost,
              symbol: card.symbol,
            }
            setPending(
              'stock_sell_opportunity',
              `小机会：${card.title} — 所有持有 ${card.symbol} 的玩家都可以卖出。`,
              card,
            )
            break
          }
        }

        setPending('opportunity', `你遇到了一个${isBig ? '大' : '小'}机会。`, card)
        break
      }
      case 'doodad': {
        const { card, remaining } = drawDoodadCard(decks.value.doodad)
        decks.value.doodad = remaining
        recordCardDrawn('doodad', card)
        const msg = applyDoodad(card, player)
        if (pendingAction.value.type === 'need_loan') {
          turnStatus.value = 'resolving'
          saveState()
          return
        }
        // 已成功支付 → 纯消息提示（顶部 toast，损失类型）
        setMessageToast(msg, 'loss')
        break
      }
      case 'market': {
        const { card, remaining } = drawMarketCard(decks.value.market)
        decks.value.market = remaining
        recordCardDrawn('market', card)
        const msg = applyMarketEvent(card, player)
        setPending('market', msg, card)
        break
      }
      case 'child': {
        const maxChildren = config.value.bigFamily ? MAX_CHILDREN.bigFamily : MAX_CHILDREN.normal
        if (player.childrenCount < maxChildren) {
          player.childrenCount += 1
          recalcPlayerFinancials(player)
          setMessageToast(`孩子出生！你现在有 ${player.childrenCount} 个孩子，子女支出增加。`, 'major')
        } else {
          setPending(null, '孩子数量已达上限。')
        }
        break
      }
      case 'charity': {
        const donation = Math.round(player.totalIncome * 0.1)
        setPending(
          'charity',
          `慈善：是否捐赠 ${formatMoney(donation)}（总收入的 10%）以获得下回合双骰？`,
        )
        break
      }
      case 'layoff': {
        if (player.charityProtection) {
          player.charityProtection = false
          setPending('layoff', '你的慈善捐赠为你赢得了人脉支持，这次裁员安然无恙！')
          recordTransaction('charity_protect', 0, '慈善保护：避免失业', player.id)
        } else if (player.hasInsurance) {
          player.hasInsurance = false
          setPending('layoff', '你遭遇了裁员，但保险生效，避免了失业。')
        } else {
          player.isUnemployed = true
          player.unemploymentTurns = 1
          recalcPlayerFinancials(player)
          setPending('layoff', '裁员：你失去了工作，将跳过 1 个回合的工资。')
        }
        break
      }
      case 'story': {
        const { card, remaining } = drawStoryCard(decks.value.story)
        decks.value.story = remaining
        recordCardDrawn('story', { id: card.id, title: card.title, description: card.story })
        const msg = applyStoryCard(card, player)
        if (pendingAction.value.type === 'need_loan') {
          turnStatus.value = 'resolving'
          saveState()
          return
        }
        setPending('story', msg, card)
        break
      }
      case 'payday':
        // Already handled while passing
        setMessageToast(messages[messages.length - 1] ?? '发工资', 'gain')
        break
      default:
        setPending(null, `落在 ${landedCell.name}。`)
    }

    turnStatus.value = 'resolving'
    saveState()
  }

  function acceptCharity() {
    const player = currentPlayer.value
    if (!player || pendingAction.value.type !== 'charity') return
    const donation = Math.round(player.totalIncome * 0.1)
    const paid = requireLoanForPayment(donation, '慈善捐赠', () => {
      player.cash -= donation
      player.doubleDiceNextTurn = true
      player.charityProtection = true
      recordTransaction('charity', -donation, '慈善捐赠')
      setMessageToast(`你捐赠了 ${formatMoney(donation)}，下回合掷双骰，同时获得慈善保护（下次裁员免疫）。`, 'major')
      turnStatus.value = 'resolving'
      saveState()
    })
    if (!paid) {
      pendingAction.value.meta = { ...pendingAction.value.meta, kind: 'charity', donation }
    }
  }

  function declineCharity() {
    setPending(null, '你放弃了慈善捐赠。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function sellOpportunityStock(symbol: string, price: number, quantity: number): boolean {
    const player = currentPlayer.value
    if (!player) return false

    const assetIndex = player.assets.findIndex((a) => a.type === 'stock' && a.symbol === symbol)
    if (assetIndex === -1) return false
    const asset = player.assets[assetIndex]!

    if (asset.quantity < quantity) return false

    const total = price * quantity
    asset.quantity -= quantity
    if (asset.quantity <= 0) {
      player.assets.splice(assetIndex, 1)
    }
    player.cash += total
    recalcPlayerFinancials(player)

    recordTransaction('stock_sell', total, `卖出 ${symbol} 股票`, player.id, {
      assetSymbol: symbol,
      assetQuantity: quantity,
      unitPrice: price,
      costBasis: asset.cost * quantity,
      assetName: asset.name,
      assetType: 'stock',
    })

    setPending(null, `卖出 ${symbol} ×${quantity}，获得 ${formatMoney(total)}`)
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  // 股票交易卡：买入（执行后关闭卡片，显示结果消息）
  function tradeBuyStock(quantity: number): boolean {
    const player = currentPlayer.value
    const card = pendingAction.value.card as OpportunityCard | null
    if (!player || pendingAction.value.type !== 'opportunity' || !card) return false
    if (card.type !== 'stock' || !card.symbol) return false

    const cost = card.cost * quantity
    if (player.cash < cost) return false

    player.cash -= cost
    const existing = player.assets.find((a) => a.type === 'stock' && a.symbol === card.symbol)
    if (existing) {
      // 计算加权平均成本
      const totalCost = existing.cost * existing.quantity + card.cost * quantity
      existing.quantity += quantity
      existing.cost = totalCost / existing.quantity
    } else {
      const asset: Asset = {
        id: createId(),
        name: card.title,
        type: 'stock',
        cost: card.cost,
        cashFlow: 0,
        quantity,
        symbol: card.symbol,
        marketPrice: card.cost,
      }
      player.assets.push(asset)
    }
    recalcPlayerFinancials(player)
    recordTransaction('stock_buy', -cost, `买入 ${card.symbol} 股票`, player.id, {
      assetSymbol: card.symbol,
      assetQuantity: quantity,
      unitPrice: card.cost,
      assetName: card.title,
      assetType: 'stock',
    })
    recordCardDrawn('opportunity', card, player.id, 'accepted', cost)

    // 关闭卡片，显示结果 toast
    setMessageToast(`已买入 ${card.symbol} ×${quantity}，支出 ${formatMoney(cost)}。`, 'loss')
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  // 股票交易卡：卖出（执行后关闭卡片，显示结果消息）
  function tradeSellStock(quantity: number): boolean {
    const player = currentPlayer.value
    const card = pendingAction.value.card as OpportunityCard | null
    if (!player || pendingAction.value.type !== 'opportunity' || !card) return false
    if (card.type !== 'stock' || !card.symbol) return false

    const symbol = card.symbol
    const price = card.cost

    const assetIndex = player.assets.findIndex((a) => a.type === 'stock' && a.symbol === symbol)
    if (assetIndex === -1) return false
    const asset = player.assets[assetIndex]!

    if (asset.quantity < quantity) return false

    const total = price * quantity
    asset.quantity -= quantity
    if (asset.quantity <= 0) {
      player.assets.splice(assetIndex, 1)
    }
    player.cash += total
    recalcPlayerFinancials(player)

    recordTransaction('stock_sell', total, `卖出 ${symbol} 股票`, player.id, {
      assetSymbol: symbol,
      assetQuantity: quantity,
      unitPrice: price,
      costBasis: asset.cost * quantity,
      assetName: asset.name,
      assetType: 'stock',
    })
    recordCardDrawn('opportunity', card, player.id, 'sold', total)

    // 关闭卡片，显示结果 toast
    setMessageToast(`已卖出 ${symbol} ×${quantity}，获得 ${formatMoney(total)}。`, 'gain')
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  function buyOpportunity(quantity = 1) {
    const player = currentPlayer.value
    const card = pendingAction.value.card as OpportunityCard | null
    const isOpportunity = pendingAction.value.type === 'opportunity'
    const isFtOpportunity = pendingAction.value.type === 'fast_track_opportunity'
    const cardTypeForRecord = isFtOpportunity ? 'fast_track_opportunity' : 'opportunity'
    if (!player || (!isOpportunity && !isFtOpportunity) || !card) return false

    // 股票拆分/合股卡（自动生效）
    if (card.splitRatio !== undefined) {
      const symbol = card.symbol!
      const ratio = card.splitRatio
      const holding = player.assets.find((a) => a.type === 'stock' && a.symbol === symbol)

      let oldQuantity = 0
      let oldMarketPrice = 0

      if (holding) {
        oldQuantity = holding.quantity
        oldMarketPrice = holding.marketPrice ?? holding.cost

        holding.quantity = Math.floor(holding.quantity * ratio)
        holding.cost = Math.round(holding.cost / ratio)
        holding.marketPrice = Math.round(oldMarketPrice * ratio)

        // 记录交易
        recordTransaction(
          'stock_split',
          0,
          ratio > 1 ? `${symbol} ${ratio}:1 拆分` : `${symbol} ${Math.round(1 / ratio)}合1`,
          player.id,
          {
            assetSymbol: symbol,
            assetQuantity: holding.quantity,
            unitPrice: holding.marketPrice,
          },
        )
      }

      recordCardDrawn(cardTypeForRecord, card, player.id, 'accepted')
      const action = ratio > 1 ? '拆分' : '合股'
      const newPrice = holding?.marketPrice ?? 0
      setPending(
        null,
        holding
          ? `${symbol}${action}！你持有 ${oldQuantity} 股 → ${holding.quantity} 股，价格 ${formatMoney(oldMarketPrice)} → ${formatMoney(newPrice)}`
          : `${symbol}${action}！你当前不持有该股票。`,
      )
      turnStatus.value = 'resolving'
      saveState()
      return true
    }

    // 卖出股票的机会卡
    if (card.type === 'stock' && card.action === 'sell') {
      const symbol = card.symbol!
      const price = card.cost
      const ok = sellOpportunityStock(symbol, price, quantity)
      if (ok) {
        recordCardDrawn(cardTypeForRecord, card, player.id, 'sold', price * quantity)
      }
      return ok
    }

    // 企业和房产类型一次只能购买 1 份（平衡性）
    if ((card.type === 'real_estate' || card.type === 'business') && quantity > 1) {
      quantity = 1
    }

    const cost = card.cost * quantity
    if (player.cash < cost) return false

    player.cash -= cost
    const existing = player.assets.find((a) => a.type === card.type && a.symbol && a.symbol === card.symbol)
    if (existing && card.type === 'stock') {
      // 计算加权平均成本
      const totalCost = existing.cost * existing.quantity + card.cost * quantity
      existing.quantity += quantity
      existing.cost = totalCost / existing.quantity
    } else {
      const asset: Asset = {
        id: createId(),
        name: card.title,
        type: card.type,
        cost: card.cost,
        cashFlow: card.cashFlow,
        quantity,
        symbol: card.symbol,
        marketPrice: card.type === 'stock' ? card.cost : undefined,
      }
      player.assets.push(asset)
    }
    recalcPlayerFinancials(player)
    const txType: TransactionType =
      card.type === 'stock' ? 'stock_buy' : card.type === 'real_estate' ? 'real_estate_buy' : 'business_buy'
    recordTransaction(txType, -cost, `买入 ${card.title}`, player.id, {
      assetSymbol: card.symbol,
      assetQuantity: quantity,
      unitPrice: card.cost,
      assetName: card.title,
      assetType: card.type,
    })
    recordCardDrawn(cardTypeForRecord, card, player.id, 'accepted', cost)
    setPending(null, `买入 ${card.title} ×${quantity}，支出 ${formatMoney(cost)}。`)
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  function declineOpportunity() {
    const card = pendingAction.value.card as OpportunityCard | null
    const isFtOpportunity = pendingAction.value.type === 'fast_track_opportunity'
    if (card) {
      recordCardDrawn(
        isFtOpportunity ? 'fast_track_opportunity' : 'opportunity',
        card,
        undefined,
        'declined',
      )
    }
    setPending(null, '你放弃了这个机会。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function dismissDoodad() {
    const card = pendingAction.value.card as DoodadCard | null
    if (card) {
      recordCardDrawn('doodad', card, undefined, 'ignored', card.cost)
    }
    clearPending()
    turnStatus.value = 'resolving'
    saveState()
  }

  function dismissStoryCard() {
    const card = pendingAction.value.card as StoryCard | null
    if (card) {
      recordCardDrawn(
        'story',
        { id: card.id, title: card.title, description: card.story },
        undefined,
        'ignored',
        card.effect?.amount ?? 0,
      )
    }
    clearPending()
    turnStatus.value = 'resolving'
    saveState()
  }

  function confirmLoanForPending(): boolean {
    if (pendingAction.value.type !== 'need_loan') return false
    const player = currentPlayer.value
    if (!player) return false
    const needed = (pendingAction.value.meta?.needed as number) ?? 0
    if (needed <= 0) return false
    const ok = takeBankLoan(needed)
    if (!ok) return false
    const onResolved = pendingAction.value.meta?.onResolved as (() => void) | undefined
    if (onResolved) {
      onResolved()
    } else {
      turnStatus.value = 'resolving'
      saveState()
    }
    return true
  }

  function declineLoanForPending() {
    if (pendingAction.value.type !== 'need_loan') return
    const player = currentPlayer.value
    const amount = (pendingAction.value.meta?.amount as number) ?? 0

    // 检查玩家是否完全无力支付（即使最大化贷款也不行）
    if (player && !canPlayerAfford(player, amount)) {
      // 无力支付 → 宣告破产
      declareBankruptcy()
      return
    }

    // 有能力支付但选择不贷款 → 交易取消
    setPending(null, '你拒绝了贷款，交易取消。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function acknowledgeMessage() {
    // 清除 pending message 和 type，让浮层消失，露出结束回合按钮
    pendingAction.value = { type: null, card: null, message: '' }
    turnStatus.value = 'resolving'
    saveState()
  }

  function totalBankLoanAmount(player: Player): number {
    return player.liabilities
      .filter((l) => l.category === 'bank_loan')
      .reduce((sum, l) => sum + l.amount, 0)
  }

  function maxBankLoanAmount(player: Player): number {
    const base = player.totalIncome * BANK_CONFIG.maxLoanMultiple
    const existing = totalBankLoanAmount(player)
    const available = Math.max(0, base - existing)
    return Math.floor(available / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
  }

  function takeBankLoan(amount: number): boolean {
    const player = currentPlayer.value
    if (!player || amount < BANK_CONFIG.minLoanAmount) return false
    const rounded = Math.floor(amount / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
    if (rounded > maxBankLoanAmount(player)) return false

    player.cash += rounded
    const payment = Math.round(rounded * BANK_CONFIG.interestRate)
    player.liabilities.push({
      id: createId(),
      name: `银行贷款 ${formatMoney(rounded)}`,
      amount: rounded,
      monthlyPayment: payment,
      category: 'bank_loan',
    })
    player.expenses.other += payment
    recalcPlayerFinancials(player)
    recordTransaction('bank_loan', rounded, '银行贷款')
    saveState()
    return true
  }

  function repayBankLoan(liabilityId: string, amount: number): boolean {
    const player = currentPlayer.value
    if (!player || amount <= 0) return false

    const index = player.liabilities.findIndex((l) => l.id === liabilityId && l.category === 'bank_loan')
    if (index === -1) return false
    const loan = player.liabilities[index]!
    const repayAmount = Math.min(amount, loan.amount)
    if (player.cash < repayAmount) return false

    player.cash -= repayAmount
    loan.amount -= repayAmount
    if (loan.amount <= 0) {
      player.expenses.other -= loan.monthlyPayment
      player.liabilities.splice(index, 1)
    }
    recalcPlayerFinancials(player)
    recordTransaction('loan_repay', -repayAmount, `还款 ${loan.name}`)
    saveState()
    return true
  }

  // 检查玩家是否可以支付（现金 + 可售资产价值 + 剩余贷款额度）
  function canPlayerAfford(player: Player, amount: number): boolean {
    // 现金足够
    if (player.cash >= amount) return true
    // 加上剩余贷款额度
    const remainingLoan = maxBankLoanAmount(player)
    if (player.cash + remainingLoan >= amount) return true
    // 加上可变现资产价值（按市价的70%估算）
    const assetValue = player.assets.reduce(
      (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity * 0.7,
      0,
    )
    return player.cash + remainingLoan + assetValue >= amount
  }

  // 宣告破产
  function declareBankruptcy(): void {
    const player = currentPlayer.value
    if (!player) return

    player.isBankrupt = true
    // 清空所有资产和负债
    player.assets = []
    player.liabilities = player.liabilities.filter(
      (l) => l.category !== 'bank_loan',
    )
    player.cash = 0
    player.savings = 0
    player.passiveIncome = 0
    recalcPlayerFinancials(player)

    recordTransaction('bankrupt', 0, '宣告破产', player.id)

    // 检查是否所有玩家都破产了，或多人模式只剩一人
    const remainingActive = players.value.filter((p) => !p.isBankrupt)
    if (remainingActive.length === 0) {
      gameEndReason.value = 'bankrupt'
      phase.value = 'finished'
      turnStatus.value = 'finished'
      saveState()
      return
    }
    if (remainingActive.length === 1 && players.value.length > 1) {
      // 多人模式下只剩一名玩家，该玩家获胜
      winnerId.value = remainingActive[0]!.id
      gameEndReason.value = 'victory'
      phase.value = 'finished'
      turnStatus.value = 'finished'
      saveState()
      return
    }

    setPending(
      'bankrupt',
      `${player.name} 已宣告破产，退出游戏。`,
      null,
    )
    turnStatus.value = 'resolving'
    saveState()
  }

  // 确认破产并进入下一位玩家回合
  function resolveBankruptcy(): void {
    if (pendingAction.value.type !== 'bankrupt') return
    moveToNextPlayer()
  }

  // 获取活跃玩家（未破产）
  const activePlayers = computed(() => players.value.filter((p) => !p.isBankrupt))

  // 检查游戏是否因破产而结束
  function checkBankruptcyVictory(): void {
    const active = activePlayers.value
    if (active.length === 0) {
      // 所有玩家都破产了，游戏结束
      gameEndReason.value = 'bankrupt'
      phase.value = 'finished'
      turnStatus.value = 'finished'
      saveState()
    } else if (active.length === 1 && players.value.length > 1) {
      // 多人模式下只剩一名玩家，该玩家获胜
      winnerId.value = active[0]!.id
      gameEndReason.value = 'victory'
      phase.value = 'finished'
      turnStatus.value = 'finished'
      saveState()
    }
  }

  // 存款：从现金转入储蓄
  function depositToSavings(amount: number): boolean {
    const player = currentPlayer.value
    if (!player || amount < BANK_CONFIG.minDeposit) return false
    const rounded = Math.floor(amount / BANK_CONFIG.depositStep) * BANK_CONFIG.depositStep
    if (rounded > player.cash) return false

    player.cash -= rounded
    player.savings += rounded
    recordTransaction('savings_deposit', -rounded, '存款')
    saveState()
    return true
  }

  // 取款：从储蓄转出现金
  function withdrawFromSavings(amount: number): boolean {
    const player = currentPlayer.value
    if (!player || amount <= 0) return false
    const rounded = Math.floor(amount / BANK_CONFIG.depositStep) * BANK_CONFIG.depositStep
    if (rounded > player.savings) return false

    player.savings -= rounded
    player.cash += rounded
    recordTransaction('savings_withdraw', rounded, '取款')
    saveState()
    return true
  }

  // 统一还款：按比例偿还所有银行贷款
  function repayAllBankLoans(amount: number): boolean {
    const player = currentPlayer.value
    if (!player || amount <= 0) return false
    if (player.cash < amount) return false

    const totalLoan = totalBankLoanAmount(player)
    if (totalLoan <= 0) return false

    const repayAmount = Math.min(amount, totalLoan)
    let remaining = repayAmount

    // 按贷款金额从大到小依次偿还
    const bankLoans = player.liabilities
      .filter((l) => l.category === 'bank_loan')
      .sort((a, b) => b.amount - a.amount)

    for (const loan of bankLoans) {
      if (remaining <= 0) break
      const pay = Math.min(remaining, loan.amount)
      const idx = player.liabilities.findIndex((l) => l.id === loan.id)
      if (idx === -1) continue

      player.liabilities[idx]!.amount -= pay
      remaining -= pay

      if (player.liabilities[idx]!.amount <= 0) {
        player.expenses.other -= player.liabilities[idx]!.monthlyPayment
        player.liabilities.splice(idx, 1)
      }
    }

    player.cash -= repayAmount
    recalcPlayerFinancials(player)
    recordTransaction('loan_repay', -repayAmount, '偿还银行贷款')
    saveState()
    return true
  }

  function payoffLiability(liabilityId: string): boolean {
    const player = currentPlayer.value
    if (!player) return false

    const index = player.liabilities.findIndex((l) => l.id === liabilityId)
    if (index === -1) return false
    const loan = player.liabilities[index]!
    if (player.cash < loan.amount) return false

    player.cash -= loan.amount
    switch (loan.category) {
      case 'mortgage':
        player.expenses.mortgage = 0
        break
      case 'school_loan':
        player.expenses.schoolLoan = 0
        break
      case 'car_loan':
        player.expenses.carLoan = 0
        break
      case 'credit_card':
        player.expenses.creditCard = 0
        break
    }
    player.liabilities.splice(index, 1)
    recalcPlayerFinancials(player)
    recordTransaction('loan_repay', -loan.amount, `还清 ${loan.name}`)
    saveState()
    return true
  }

  function checkFinancialFreedom(): boolean {
    const player = currentPlayer.value
    if (!player || phase.value !== 'rat_race') return false
    return player.passiveIncome >= player.totalExpenses
  }

  function buyInsurance(): boolean {
    const player = currentPlayer.value
    if (!player || phase.value !== 'rat_race' || player.hasInsurance) return false
    const cost = player.totalExpenses * 6
    if (player.cash < cost) return false
    player.cash -= cost
    player.hasInsurance = true
    recordTransaction('insurance_buy', -cost, '购买保险')
    saveState()
    return true
  }

  function toggleUnemploymentInsurance(): boolean {
    const player = currentPlayer.value
    if (!player || phase.value !== 'rat_race') return false
    player.hasUnemploymentInsurance = !player.hasUnemploymentInsurance
    const action = player.hasUnemploymentInsurance ? '参保' : '停保'
    recordTransaction('other', 0, `失业保险${action}`, player.id)
    saveState()
    return true
  }

  function triggerRetirement() {
    const activePlayers = players.value.filter((p) => !p.isBankrupt)
    if (activePlayers.length === 0) {
      phase.value = 'finished'
      turnStatus.value = 'finished'
      saveState()
      return
    }
    // 按净资产排序
    const sorted = [...activePlayers].sort((a, b) => {
      const netA = calcPlayerNetWorth(a)
      const netB = calcPlayerNetWorth(b)
      return netB - netA
    })
    winnerId.value = sorted[0].id
    gameEndReason.value = 'retirement'
    phase.value = 'finished'
    turnStatus.value = 'finished'
    recordTransaction('age_retire', 0, '退休结算')
    saveState()
  }

  function enterFastTrack(): boolean {
    const player = currentPlayer.value
    if (!player || !checkFinancialFreedom()) return false

    phase.value = 'fast_track'
    player.fastTrackPosition = 0
    player.cash += player.cashFlow * 100
    player.dream = getRandomDream()
    player.isUnemployed = false
    player.unemploymentTurns = 0
    player.doubleDiceNextTurn = false
    player.hasUnemploymentInsurance = false
    player.hasInsurance = false
    turnStatus.value = 'idle'
    lastRoll.value = 0
    clearPending()
    saveState()
    return true
  }

  function fastTrackRollDice() {
    const player = currentPlayer.value
    if (!player || phase.value !== 'fast_track' || turnStatus.value !== 'idle') return

    const diceValues = rollDiceValues(2)
    lastDiceValues.value = diceValues
    const roll = diceValues.reduce((a, b) => a + b, 0)
    lastRoll.value = roll
    turnStatus.value = 'rolling'

    player.fastTrackPosition = (player.fastTrackPosition + roll) % FAST_TRACK_BOARD_SIZE
    const cell = getFastTrackCell(player.fastTrackPosition)

    switch (cell.type) {
      case 'cashflow': {
        const payout = player.cashFlow * 100
        player.cash += payout
        recordTransaction('salary', payout, '现金流日', player.id)
        // FastTrack 现金流日也推进年龄（全局游戏时间）
        gameMonth.value += 1
        if (config.value.ageLimit && gameMonth.value >= MAX_AGE_MONTHS) {
          triggerRetirement()
          turnStatus.value = 'finished'
          saveState()
          return
        }
        setPending(null, `现金流日：获得 ${formatMoney(payout)}。`)
        break
      }
      case 'opportunity':
      case 'deal': {
        const { card, remaining } = drawFastTrackOpportunity(decks.value)
        decks.value.fastTrackOpportunity = remaining
        setPending('fast_track_opportunity', cell.type === 'deal' ? `大宗交易：${card.title}` : `资本游戏机会：${card.title}`, card)
        break
      }
      case 'investment': {
        const { card, remaining } = drawFastTrackOpportunity(decks.value)
        decks.value.fastTrackOpportunity = remaining
        setPending('fast_track_opportunity', `不动产投资：${card.title}`, card)
        break
      }
      case 'stock': {
        const { card, remaining } = drawMarketCard(decks.value.market)
        decks.value.market = remaining
        recordCardDrawn('market', card)
        const result = applyMarketEvent(card, player)
        setPending('market', `股票交易：${result}`, card)
        break
      }
      case 'market': {
        const { card, remaining } = drawMarketCard(decks.value.market)
        decks.value.market = remaining
        recordCardDrawn('market', card)
        const result = applyMarketEvent(card, player)
        setPending('market', `市场风云：${result}`, card)
        break
      }
      case 'charity': {
        const donation = Math.floor(player.cashFlow * 5)
        if (player.cash >= donation) {
          player.cash -= donation
          setPending(null, `慈善捐赠：捐赠了 ${formatMoney(donation)}，获得心灵满足。`)
        } else {
          setPending(null, `慈善捐赠：现金不足，跳过本次捐赠。`)
        }
        break
      }
      case 'doodad': {
        const cost = Math.max(5000, player.cashFlow * 10)
        const paid = requireLoanForPayment(cost, '资本游戏 生活意外', () => {
          player.cash -= cost
          setPending(null, `资本游戏 生活意外：支出 ${formatMoney(cost)}。`)
          turnStatus.value = 'resolving'
          saveState()
        })
        if (!paid) return
        break
      }
      case 'dream': {
        setPending('fast_track_dream', `你到达了梦想格：${player.dream?.name ?? '购买梦想'}。`)
        break
      }
      default:
        setPending(null, `落在 ${cell.name}。`)
    }

    turnStatus.value = 'resolving'
    saveState()
  }

  function buyDream(): boolean {
    const player = currentPlayer.value
    if (!player || phase.value !== 'fast_track' || pendingAction.value.type !== 'fast_track_dream') {
      return false
    }
    const dream = player.dream
    if (!dream) return false
    if (player.cash < dream.price) return false

    player.cash -= dream.price
    winnerId.value = player.id
    gameEndReason.value = 'victory'
    phase.value = 'finished'
    turnStatus.value = 'finished'
    saveState()
    return true
  }

  // ==================== AI 回合逻辑 ====================

  const aiSpeedMultiplier = ref(1)
  const autoAITrigger = ref(true) // 是否自动触发AI回合（测试时设为false）

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms * aiSpeedMultiplier.value))
  }

  function setAISpeed(multiplier: number) {
    aiSpeedMultiplier.value = Math.max(0.01, Math.min(10, multiplier))
  }

  function setAutoAITrigger(enabled: boolean) {
    autoAITrigger.value = enabled
  }

  async function runAITurn(): Promise<void> {
    const player = currentPlayer.value
    if (!player || !player.isAI) return
    if (phase.value !== 'rat_race' && phase.value !== 'fast_track') return

    isAIThinking.value = true
    try {
      // 1. 等待 500ms（让玩家看清）
      await sleep(500)

      // 2. 掷骰子
      if (phase.value === 'rat_race') {
        ratRaceRollDice()
      } else {
        fastTrackRollDice()
      }

      // 3. 等待骰子动画完成（约 800ms）
      await sleep(800)

      // 4-5. 处理 pending action（AI 自动决策）
      await aiHandlePendingAction()

      // 6. AI 买保险（仅老鼠圈）
      if (phase.value === 'rat_race' && !player.hasInsurance && turnStatus.value === 'resolving') {
        const difficulty: AIDifficulty = (player.aiDifficulty as AIDifficulty) ?? 'medium'
        if (AIDecision.decideBuyInsurance(player, difficulty)) {
          await sleep(300)
          buyInsurance()
        }
      }

      // 6.5 AI 失业保险决策（仅老鼠圈）
      if (phase.value === 'rat_race' && turnStatus.value === 'resolving') {
        const difficulty: AIDifficulty = (player.aiDifficulty as AIDifficulty) ?? 'medium'
        const shouldInsure = AIDecision.decideUnemploymentInsurance(player, difficulty)
        if (shouldInsure !== player.hasUnemploymentInsurance) {
          await sleep(200)
          toggleUnemploymentInsurance()
        }
      }

      // 7. AI 考虑还款（两个阶段都有）
      if (turnStatus.value === 'resolving') {
        const difficulty: AIDifficulty = (player.aiDifficulty as AIDifficulty) ?? 'medium'
        const repayAmount = AIDecision.decideRepayLoan(player, difficulty)
        if (repayAmount > 0) {
          await sleep(300)
          repayAllBankLoans(repayAmount)
        }
      }

      // 7.5 老鼠圈阶段：检测是否满足进入资本游戏条件，满足则自动进入
      if (phase.value === 'rat_race' && checkFinancialFreedom()) {
        await sleep(500)
        enterFastTrack()

        // 进入资本游戏后，执行第一个快车道回合
        await sleep(500)

        // 掷骰子（快车道）
        fastTrackRollDice()
        await sleep(800)

        // 处理快车道 pending action
        await aiHandlePendingAction()

        // 快车道阶段也考虑还款
        if (turnStatus.value === 'resolving') {
          const difficulty: AIDifficulty = (player.aiDifficulty as AIDifficulty) ?? 'medium'
          const repayAmount = AIDecision.decideRepayLoan(player, difficulty)
          if (repayAmount > 0) {
            await sleep(300)
            repayAllBankLoans(repayAmount)
          }
        }

        await sleep(300)
      }

      // 8. 等待 300ms
      await sleep(300)

      // 9. 结束回合
      moveToNextPlayer()
    } finally {
      isAIThinking.value = false
    }
  }

  async function aiHandlePendingAction(): Promise<void> {
    const player = currentPlayer.value
    if (!player || !player.isAI) return

    const difficulty: AIDifficulty = (player.aiDifficulty as AIDifficulty) ?? 'medium'
    const action = pendingAction.value

    switch (action.type) {
      case 'opportunity': {
        const card = action.card as OpportunityCard
        if (!card) return
        await sleep(400)

        // 股票拆分/合股卡：自动确认
        if (card.splitRatio !== undefined) {
          buyOpportunity(1)
          return
        }

        // 卖出股票的机会卡
        if (card.type === 'stock' && card.action === 'sell') {
          const holding = getStockHolding(card.symbol!)
          if (holding && holding.quantity > 0) {
            // AI 决定卖多少
            const sellQty = AIDecision.decideSellMarket(player, holding, card.cost, difficulty)
            if (sellQty > 0) {
              buyOpportunity(sellQty)
            } else {
              declineOpportunity()
            }
          } else {
            declineOpportunity()
          }
          return
        }

        // 买入决策
        const decision = AIDecision.decideBuyOpportunity(player, card, difficulty)
        if (decision.buy && decision.quantity > 0) {
          // 如果现金不够，考虑贷款
          const totalCost = card.cost * decision.quantity
          if (player.cash < totalCost) {
            const needed = totalCost - player.cash
            const loanAmount = AIDecision.decideBankLoan(player, difficulty)
            if (loanAmount >= needed) {
              takeBankLoan(Math.ceil(needed / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep)
              await sleep(200)
            } else {
              // 能买多少买多少
              const affordableQty = Math.floor(player.cash / card.cost)
              if (affordableQty > 0) {
                buyOpportunity(affordableQty)
              } else {
                declineOpportunity()
              }
              return
            }
          }
          buyOpportunity(decision.quantity)
        } else {
          declineOpportunity()
        }
        break
      }

      case 'market': {
        await aiHandleMarketEvent()
        break
      }

      case 'stock_sell_opportunity': {
        await aiHandleStockSellOpportunity()
        break
      }

      case 'doodad': {
        await sleep(300)
        // 如果需要贷款，AI 自动确认贷款
        if (pendingAction.value.type === 'need_loan') {
          confirmLoanForPending()
        } else {
          dismissDoodad()
        }
        break
      }

      case 'charity': {
        await sleep(400)
        const donation = Math.round(player.totalIncome * 0.1)
        if (AIDecision.decideCharity(player, donation, difficulty)) {
          acceptCharity()
          // 如果接受后触发了贷款需求
          if (pendingAction.value.type === 'need_loan') {
            await sleep(200)
            confirmLoanForPending()
          }
        } else {
          declineCharity()
        }
        break
      }

      case 'layoff': {
        await sleep(300)
        acknowledgeMessage()
        break
      }

      case 'story': {
        await sleep(300)
        if (pendingAction.value.type === 'need_loan') {
          confirmLoanForPending()
        } else {
          dismissStoryCard()
        }
        break
      }

      case 'need_loan': {
        await sleep(300)
        const ok = confirmLoanForPending()
        if (!ok) {
          // 贷不到款 → 宣告破产
          declareBankruptcy()
        }
        break
      }

      case 'fast_track_opportunity': {
        const card = action.card as OpportunityCard
        if (!card) return
        await sleep(400)

        const decision = AIDecision.decideBuyFastTrackOpportunity(player, card, difficulty)
        if (decision.buy && decision.quantity > 0) {
          const totalCost = card.cost * decision.quantity
          if (player.cash < totalCost) {
            const needed = totalCost - player.cash
            const loanAmount = AIDecision.decideBankLoan(player, difficulty)
            if (loanAmount >= needed) {
              takeBankLoan(Math.ceil(needed / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep)
              await sleep(200)
            } else {
              // 现金不够也贷不到，放弃
              declineOpportunity()
              return
            }
          }
          buyOpportunity(decision.quantity)
        } else {
          declineOpportunity()
        }
        break
      }

      case 'fast_track_dream': {
        await sleep(500)
        const dream = player.dream
        if (dream && AIDecision.decideBuyDream(player, dream, difficulty)) {
          buyDream()
        } else {
          // 放弃梦想格（继续游戏）
          acknowledgeMessage()
        }
        break
      }

      case 'bankrupt': {
        // AI 破产，自动确认并进入下一位玩家
        await sleep(800)
        resolveBankruptcy()
        break
      }

      default: {
        // 没有待处理的 action（如 payday 等），不需要额外操作
        break
      }
    }
  }

  async function aiHandleMarketEvent(): Promise<void> {
    const state = marketEventState.value
    const card = marketEvent.value
    if (!state || !card) return

    // 处理所有 AI 玩家的市场事件回应
    while (state.phase !== 'done') {
      const responder = players.value[state.responderIndex]
      if (!responder) break

      // 如果当前回应玩家是 AI，自动处理
      if (responder.isAI) {
        const difficulty: AIDifficulty = (responder.aiDifficulty as AIDifficulty) ?? 'medium'
        await sleep(400)

        // 找出可卖资产并决定是否卖出
        const sellable = responder.assets.filter((a) => {
          if (card.targetType === 'all') return true
          if (card.targetType === 'stock' && card.targetSymbol) {
            return a.type === 'stock' && a.symbol === card.targetSymbol
          }
          return a.type === card.targetType
        })

        for (const asset of sellable) {
          let sellPrice = 0
          if (card.targetType === 'stock' && card.targetSymbol && asset.symbol === card.targetSymbol) {
            sellPrice = card.fixedPrice ?? asset.cost
          } else {
            sellPrice = asset.cost * card.multiplier
          }
          const sellQty = AIDecision.decideSellMarket(responder, asset, sellPrice, difficulty)
          if (sellQty > 0) {
            // 切换到该玩家的上下文中卖出
            const originalIndex = currentPlayerIndex.value
            currentPlayerIndex.value = state.responderIndex
            sellAssetToMarket(asset.id, sellQty)
            currentPlayerIndex.value = originalIndex
            await sleep(200)
          }
        }

        // AI 玩家处理完毕，推进到下一个
        advanceMarketResponder()
      } else {
        // 遇到人类玩家，暂停让人类操作
        break
      }
    }

    // 如果全部处理完了，设置状态
    if (state.phase === 'done') {
      marketEvent.value = null
      marketEventState.value = null
      setPending(null, '市场风云结束，所有玩家已操作。')
      turnStatus.value = 'resolving'
      saveState()
    }
  }

  async function aiHandleStockSellOpportunity(): Promise<void> {
    const state = stockSellOpportunityState.value
    const card = stockSellOpportunity.value
    if (!state || !card || !card.symbol) return

    while (state.phase !== 'done') {
      const responder = players.value[state.responderIndex]
      if (!responder) break

      if (responder.isAI) {
        const difficulty: AIDifficulty = (responder.aiDifficulty as AIDifficulty) ?? 'medium'
        await sleep(400)

        const asset = responder.assets.find(
          (a) => a.type === 'stock' && a.symbol === card.symbol,
        )
        if (asset) {
          const sellQty = AIDecision.decideSellMarket(responder, asset, state.price, difficulty)
          if (sellQty > 0) {
            const originalIndex = currentPlayerIndex.value
            currentPlayerIndex.value = state.responderIndex
            sellStockFromOpportunity(state.symbol, state.price, sellQty)
            currentPlayerIndex.value = originalIndex
            await sleep(200)
          }
        }

        advanceStockSellResponder()
      } else {
        break
      }
    }

    if (state.phase === 'done') {
      stockSellOpportunity.value = null
      stockSellOpportunityState.value = null
      setPending(null, '股票卖出机会结束，所有持有人已操作。')
      turnStatus.value = 'resolving'
      saveState()
    }
  }

  loadState()

  return {
    players,
    currentPlayerIndex,
    phase,
    config,
    winnerId,
    gameEndReason,
    turnStatus,
    lastRoll,
    lastDiceValues,
    turnNumber,
    gameMonth,
    currentPlayerAge,
    pendingAction,
    marketEvent,
    marketEventState,
    marketResponder,
    isMarketMyTurn,
    stockSellOpportunity,
    stockSellOpportunityState,
    stockSellResponder,
    isStockSellMyTurn,
    decks,
    transactions,
    cardHistory,
    isAIThinking,
    viewingPlayerId,
    viewingPlayer,
    viewingPhase,
    displayPhase,
    isSpectatingOtherPhase,
    learningMode,
    toggleLearningMode,
    currentPlayer,
    isGameStarted,
    canCurrentPlayerEnterFastTrack,
    correctTotalAssets,
    correctTotalLiabilities,
    correctNetWorth,
    correctPassiveIncome,
    correctTotalIncome,
    correctTotalExpenses,
    correctMonthlyCashFlow,
    setFinancialStatementValue,
    verifyFinancialItem,
    viewAnswer,
    getStockHolding,
    startGame,
    resetGame,
    saveState,
    ratRaceRollDice,
    fastTrackRollDice,
    buyOpportunity,
    sellOpportunityStock,
    tradeBuyStock,
    tradeSellStock,
    declineOpportunity,
    sellAssetToMarket,
    dismissMarketEvent,
    sellStockFromOpportunity,
    dismissStockSellOpportunity,
    acceptCharity,
    declineCharity,
    dismissDoodad,
    dismissStoryCard,
    takeBankLoan,
    repayBankLoan,
    repayAllBankLoans,
    depositToSavings,
    withdrawFromSavings,
    payoffLiability,
    confirmLoanForPending,
    declineLoanForPending,
    moveToNextPlayer,
    setViewingPlayer,
    setViewingPhase,
    checkFinancialFreedom,
    enterFastTrack,
    buyDream,
    buyInsurance,
    toggleUnemploymentInsurance,
    acknowledgeMessage,
    maxBankLoanAmount,
    totalBankLoanAmount,
    runAITurn,
    aiHandlePendingAction,
    aiHandleMarketEvent,
    aiHandleStockSellOpportunity,
    setAISpeed,
    setAutoAITrigger,
    declareBankruptcy,
    resolveBankruptcy,
    activePlayers,
    canPlayerAfford,
    mainPlayer,
    gameStartTime,
    ratRaceTurns,
    fastTrackTurns,
    // 测试用导出
    handlePayday,
    recalcPlayerFinancials,
    getFastTrackCell,
    setPending,
    checkBankruptcyVictory,
    declineOpportunity,
    endTurn: moveToNextPlayer,
    applyMarketEventFastTrack,
    pendingAction,
    turnStatus,
    calcPlayerNetWorth,
    drawFastTrackOpportunityCard: drawFastTrackOpportunity,
  }
})
