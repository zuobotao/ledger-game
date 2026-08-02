import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Asset,
  DoodadCard,
  GameConfig,
  GamePhase,
  GameState,
  Liability,
  MarketEventCard,
  OpportunityCard,
  PendingAction,
  Player,
  PlayerColorId,
  TurnStatus,
} from '@/types/game'
import {
  BANK_CONFIG,
  FAST_TRACK_BOARD_SIZE,
  MAX_CHILDREN,
  PLAYER_COLORS,
  RAT_RACE_BOARD_SIZE,
} from '@/types/game'
import { getCareerById, getRandomCareer } from '@/data/careers'
import { getFastTrackCell, getRatRaceCell } from '@/data/board'
import {
  createDecks,
  drawDoodadCard,
  drawFastTrackOpportunity,
  drawMarketCard,
  drawOpportunityCard,
} from '@/data/cards'
import { getRandomDream } from '@/data/dreams'
import type { CardDeck } from '@/types/game'

const STORAGE_KEY = 'cashflow101-game-state'

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

function createPlayer(
  name: string,
  colorId: PlayerColorId,
  careerId: string,
  config: GameConfig,
): Player {
  const career = careerId === 'random' ? getRandomCareer() : getCareerById(careerId) ?? getRandomCareer()
  const color = PLAYER_COLORS.find((c) => c.id === colorId)?.value ?? PLAYER_COLORS[0].value
  const expenses: Player['expenses'] = { ...career.expenses, child: 0 }
  if (config.mortgage) {
    expenses.mortgage = Math.round(expenses.mortgage * 1.5)
  }
  const startingCash = config.fastStart ? career.salary : career.startingCash
  const liabilities = createCareerLiabilities({ ...career, expenses })

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
    assets: [],
    liabilities,
    ratRacePosition: 0,
    fastTrackPosition: 0,
    isUnemployed: false,
    unemploymentTurns: 0,
    hasInsurance: config.insurance,
    childrenCount: 0,
    doubleDiceNextTurn: false,
  }

  recalcPlayerFinancials(player)
  return player
}

function rollDice(count = 1): number {
  let sum = 0
  for (let i = 0; i < count; i++) {
    sum += Math.floor(Math.random() * 6) + 1
  }
  return sum
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
  const turnStatus = ref<TurnStatus>('idle')
  const lastRoll = ref(0)
  const pendingAction = ref<PendingAction>({ type: null, card: null, message: '' })
  const marketEvent = ref<MarketEventCard | null>(null)
  const decks = ref<CardDeck>(createDecks())

  const currentPlayer = computed<Player | null>(() => players.value[currentPlayerIndex.value] ?? null)
  const isGameStarted = computed(() => phase.value === 'rat_race' || phase.value === 'fast_track')

  const canCurrentPlayerEnterFastTrack = computed(() => {
    const p = currentPlayer.value
    if (!p || phase.value !== 'rat_race') return false
    return p.passiveIncome >= p.totalExpenses
  })

  function saveState() {
    const state: GameState = {
      players: players.value,
      currentPlayerIndex: currentPlayerIndex.value,
      phase: phase.value,
      config: config.value,
      winnerId: winnerId.value,
      turnStatus: turnStatus.value,
      lastRoll: lastRoll.value,
      pendingAction: pendingAction.value,
      marketEvent: marketEvent.value,
      decks: decks.value,
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
        return patched
      })
      currentPlayerIndex.value = state.currentPlayerIndex ?? 0
      phase.value = state.phase ?? 'setup'
      config.value = state.config ?? config.value
      winnerId.value = state.winnerId ?? null
      turnStatus.value = state.turnStatus ?? 'idle'
      lastRoll.value = state.lastRoll ?? 0
      pendingAction.value = state.pendingAction ?? { type: null, card: null, message: '' }
      marketEvent.value = state.marketEvent ?? null
      decks.value = state.decks ?? createDecks()
      players.value.forEach(recalcPlayerFinancials)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function startGame(setupConfig: GameConfig, playerSetups: { name: string; colorId: PlayerColorId; careerId: string }[]) {
    const validSetups = playerSetups.slice(0, setupConfig.playerCount)
    if (validSetups.length === 0) return false

    config.value = { ...setupConfig }
    players.value = validSetups.map((setup) => createPlayer(setup.name, setup.colorId, setup.careerId, config.value))
    currentPlayerIndex.value = 0
    phase.value = 'rat_race'
    winnerId.value = null
    turnStatus.value = 'idle'
    lastRoll.value = 0
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
    decks.value = createDecks()
    saveState()
    return true
  }

  function resetGame() {
    players.value = []
    currentPlayerIndex.value = 0
    phase.value = 'setup'
    winnerId.value = null
    turnStatus.value = 'idle'
    lastRoll.value = 0
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
    decks.value = createDecks()
    localStorage.removeItem(STORAGE_KEY)
  }

  function setPending(
    type: PendingAction['type'],
    message: string,
    card: PendingAction['card'] = null,
    meta?: Record<string, unknown>,
  ) {
    pendingAction.value = { type, card, message, meta }
  }

  function clearPending() {
    pendingAction.value = { type: null, card: null, message: '' }
    marketEvent.value = null
  }

  function moveToNextPlayer() {
    const count = players.value.length
    if (count === 0) return
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % count
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
    saveState()
  }

  function handlePayday(player: Player): string {
    if (player.isUnemployed) {
      player.cash -= player.totalExpenses
      return `失业中：没有工资，仍需支付 ${formatMoney(player.totalExpenses)} 支出。`
    }
    player.cash += player.cashFlow
    return `发工资：获得 ${formatMoney(player.cashFlow)} 现金流。`
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
    const paid = requireLoanForPayment(card.cost, `Doodad：${card.title}`, () => {
      player.cash -= card.cost
      setPending(null, `Doodad：${card.title}，支出 ${formatMoney(card.cost)}。`)
      turnStatus.value = 'resolving'
      saveState()
    })
    if (!paid) {
      pendingAction.value.card = card
      return pendingAction.value.message
    }
    return `Doodad：${card.title}，支出 ${formatMoney(card.cost)}。`
  }

  function applyMarketEvent(card: MarketEventCard, player: Player): string {
    if (card.multiplier < 1) {
      player.assets
        .filter((a) => card.targetType === 'all' || a.type === card.targetType)
        .forEach((a) => {
          a.marketPrice = (a.marketPrice ?? a.cost) * card.multiplier
        })
      return `${card.title}：受影响的资产贬值 ${Math.round((1 - card.multiplier) * 100)}%。`
    }
    marketEvent.value = card
    return card.description
  }

  function ratRaceRollDice() {
    const player = currentPlayer.value
    if (!player || phase.value !== 'rat_race' || turnStatus.value !== 'idle') return

    const diceCount = player.doubleDiceNextTurn ? 2 : 1
    player.doubleDiceNextTurn = false
    const roll = rollDice(diceCount)
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
      }
    }

    const landedCell = getRatRaceCell(newPosition)
    switch (landedCell.type) {
      case 'opportunity': {
        const { card, remaining } = drawOpportunityCard(decks.value.opportunity)
        decks.value.opportunity = remaining
        setPending('opportunity', `你遇到了一个${card.size === 'big' ? '大' : '小'}机会。`, card)
        break
      }
      case 'doodad': {
        const { card, remaining } = drawDoodadCard(decks.value.doodad)
        decks.value.doodad = remaining
        const msg = applyDoodad(card, player)
        if (pendingAction.value.type === 'need_loan') {
          turnStatus.value = 'resolving'
          saveState()
          return
        }
        setPending('doodad', msg, card)
        break
      }
      case 'market': {
        const { card, remaining } = drawMarketCard(decks.value.market)
        decks.value.market = remaining
        const msg = applyMarketEvent(card, player)
        setPending('market', msg, card)
        break
      }
      case 'child': {
        const maxChildren = config.value.bigFamily ? MAX_CHILDREN.bigFamily : MAX_CHILDREN.normal
        if (player.childrenCount < maxChildren) {
          player.childrenCount += 1
          recalcPlayerFinancials(player)
          setPending(null, `孩子出生！你现在有 ${player.childrenCount} 个孩子，子女支出增加。`)
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
        if (player.hasInsurance) {
          setPending('layoff', '你遭遇了裁员，但保险生效，避免了失业。')
        } else {
          player.isUnemployed = true
          player.unemploymentTurns = 2
          recalcPlayerFinancials(player)
          setPending('layoff', '裁员：你失去了工作，将跳过接下来 2 个回合的工资。')
        }
        break
      }
      case 'payday':
        // Already handled while passing
        setPending(null, messages[messages.length - 1] ?? '发工资')
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
      setPending(null, `你捐赠了 ${formatMoney(donation)}，下回合掷双骰。`)
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

  function buyOpportunity(quantity = 1) {
    const player = currentPlayer.value
    const card = pendingAction.value.card as OpportunityCard | null
    if (!player || pendingAction.value.type !== 'opportunity' || !card) return false

    const cost = card.cost * quantity
    if (player.cash < cost) return false

    player.cash -= cost
    const existing = player.assets.find((a) => a.type === card.type && a.symbol && a.symbol === card.symbol)
    if (existing && card.type === 'stock') {
      existing.quantity += quantity
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
    setPending(null, `买入 ${card.title} ×${quantity}，支出 ${formatMoney(cost)}。`)
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  function declineOpportunity() {
    setPending(null, '你放弃了这个机会。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function sellAssetToMarket(assetId: string, quantity?: number) {
    const player = currentPlayer.value
    if (!player || pendingAction.value.type !== 'market') return false

    const card = marketEvent.value ?? (pendingAction.value.card as MarketEventCard)
    if (!card) return false

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
    } else {
      return false
    }

    asset.quantity -= sellQty
    if (asset.quantity <= 0) {
      player.assets.splice(assetIndex, 1)
    }
    player.cash += price
    recalcPlayerFinancials(player)
    setPending(null, `卖出 ${asset.name} ×${sellQty}，获得 ${formatMoney(price)}。`)
    turnStatus.value = 'resolving'
    saveState()
    return true
  }

  function dismissMarketEvent() {
    setPending(null, '市场风云结束。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function dismissDoodad() {
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
    setPending(null, '你拒绝了贷款，交易取消。')
    turnStatus.value = 'resolving'
    saveState()
  }

  function acknowledgeMessage() {
    if (turnStatus.value === 'resolving') return
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
    saveState()
    return true
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
    turnStatus.value = 'idle'
    lastRoll.value = 0
    clearPending()
    saveState()
    return true
  }

  function fastTrackRollDice() {
    const player = currentPlayer.value
    if (!player || phase.value !== 'fast_track' || turnStatus.value !== 'idle') return

    const roll = rollDice(2)
    lastRoll.value = roll
    turnStatus.value = 'rolling'

    player.fastTrackPosition = (player.fastTrackPosition + roll) % FAST_TRACK_BOARD_SIZE
    const cell = getFastTrackCell(player.fastTrackPosition)

    switch (cell.type) {
      case 'cashflow': {
        const payout = player.cashFlow * 100
        player.cash += payout
        setPending(null, `现金流日：获得 ${formatMoney(payout)}。`)
        break
      }
      case 'opportunity': {
        const { card, remaining } = drawFastTrackOpportunity(decks.value)
        decks.value.fastTrackOpportunity = remaining
        setPending('fast_track_opportunity', `快车道机会：${card.title}`, card)
        break
      }
      case 'investment': {
        const { card, remaining } = drawFastTrackOpportunity(decks.value)
        decks.value.fastTrackOpportunity = remaining
        setPending('fast_track_opportunity', `投资机会：${card.title}`, card)
        break
      }
      case 'doodad': {
        const cost = Math.max(5000, player.cashFlow * 10)
        const paid = requireLoanForPayment(cost, '快车道 doodad', () => {
          player.cash -= cost
          setPending(null, `快车道 doodad：支出 ${formatMoney(cost)}。`)
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
    phase.value = 'finished'
    turnStatus.value = 'finished'
    saveState()
    return true
  }

  loadState()

  return {
    players,
    currentPlayerIndex,
    phase,
    config,
    winnerId,
    turnStatus,
    lastRoll,
    pendingAction,
    marketEvent,
    decks,
    currentPlayer,
    isGameStarted,
    canCurrentPlayerEnterFastTrack,
    startGame,
    resetGame,
    saveState,
    ratRaceRollDice,
    fastTrackRollDice,
    buyOpportunity,
    declineOpportunity,
    sellAssetToMarket,
    dismissMarketEvent,
    acceptCharity,
    declineCharity,
    dismissDoodad,
    takeBankLoan,
    repayBankLoan,
    payoffLiability,
    confirmLoanForPending,
    declineLoanForPending,
    moveToNextPlayer,
    checkFinancialFreedom,
    enterFastTrack,
    buyDream,
    buyInsurance,
    acknowledgeMessage,
    maxBankLoanAmount,
    totalBankLoanAmount,
  }
})
