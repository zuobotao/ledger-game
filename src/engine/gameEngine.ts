/**
 * GameEngine — 核心游戏引擎入口
 *
 * 职责：
 * - 接收 GameAction，返回 GameResult + GameEvent[]
 * - 协调 FinancialEngine, AssetEngine, LoanEngine, TurnEngine, CardEngine, TransactionEngine
 * - 管理 RandomSource
 * - 为 UI / AI / Replay 提供统一的 action dispatch 接口
 *
 * 原则：
 * - UI 不直接修改核心 GameState，必须通过 dispatch(GameAction)
 * - 所有状态变化产生 GameEvent 记录
 * - 引擎函数为纯函数，不依赖 Vue 响应式
 */

import type {
  GameState,
  GameConfig,
  Player,
  GamePhase,
  TransactionRecord,
  CardHistoryRecord,
  CardDeck,
} from '@/types/game'
import {
  BANK_CONFIG,
  START_AGE,
  RAT_RACE_BOARD_SIZE,
  FAST_TRACK_BOARD_SIZE,
} from '@/types/game'
import type {
  GameAction,
  GameResult,
  GameEvent,
  GameMessage,
  GameEventLog,
} from './contract'
import { RandomSource, defaultRandom } from './randomSource'
import { recalcPlayerFinancials, calcPlayerNetWorth, createFinancialSnapshot } from './financialEngine'
import { calcTotalAssetValue, findAssetById } from './assetEngine'
import { createBankLoan, findLoanById, getBankLoans, getTotalBankLoanAmount } from './loanEngine'
import { calcNextPlayerIndex, calcPlayerAge, calcNewPosition, canEnterFastTrack, advanceMonth } from './turnEngine'

// ==================== GameEngine 类 ====================

export class GameEngine {
  readonly random: RandomSource
  private eventLog: GameEvent[] = []
  private _gameId: string

  constructor(seed?: number) {
    this.random = new RandomSource(seed)
    this._gameId = this.random.generateId('game-')
  }

  get gameId(): string {
    return this._gameId
  }

  get events(): GameEvent[] {
    return this.eventLog
  }

  // ==================== Event Logging ====================

  private log(event: GameEvent): void {
    this.eventLog.push(event)
  }

  private now(): number {
    return Date.now()
  }

  getEventLog(): GameEventLog {
    return {
      gameId: this._gameId,
      gameStartTime: this.eventLog[0]?.timestamp ?? this.now(),
      events: [...this.eventLog],
    }
  }

  // ==================== Player Creation ====================

  /**
   * 创建玩家（纯函数，不修改 store）
   */
  createPlayer(
    name: string,
    career: Player['career'],
    config: GameConfig,
    isAI: boolean,
    aiDifficulty?: 'easy' | 'medium' | 'hard',
  ): Player {
    const expenses = { ...career.expenses, child: 0 }
    if (config.mortgage) {
      expenses.mortgage = Math.round(expenses.mortgage * 1.5)
    }
    const startingCash = config.fastStart ? career.salary : career.startingCash

    const player: Player = {
      id: this.random.generateId('p-'),
      name,
      color: '#007aff',
      career,
      salary: career.salary,
      passiveIncome: 0,
      totalIncome: career.salary,
      expenses,
      totalExpenses: 0,
      cashFlow: 0,
      cash: startingCash,
      savings: 0,
      assets: [],
      liabilities: createCareerLiabilities(career, this.random),
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
      isAI,
      aiDifficulty,
      isBankrupt: false,
      financialStatement: {
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
      },
      financialSnapshots: [],
      phase: 'rat_race',
    }

    recalcPlayerFinancials(player)
    return player
  }

  // ==================== Core Actions ====================

  /**
   * 统一的 action dispatch 入口
   * 返回 GameResult 包含成功/失败、事件列表和 UI 消息
   */
  dispatch(action: GameAction, state: GameState): GameResult {
    const messages: GameMessage[] = []

    switch (action.type) {
      case 'roll_dice': {
        const values = this.diceRoll(action.playerId)
        const total = values.reduce((s, v) => s + v, 0)
        state.lastRoll = total
        this.log({
          type: 'dice_rolled',
          timestamp: this.now(),
          playerId: action.playerId,
          values,
          total,
        })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'handle_payday': {
        const player = this.findPlayer(state, action.playerId)
        if (!player) return { success: false, events: [...this.eventLog], messages, error: 'Player not found' }
        const beforeCash = player.cash
        const cashFlow = player.cashFlow
        player.cash += cashFlow
        this.log({
          type: 'payday_received',
          timestamp: this.now(),
          playerId: action.playerId,
          amount: cashFlow,
          cashBefore: beforeCash,
          cashAfter: player.cash,
        })
        const { retired } = advanceMonth(player.ageMonths, state.config.ageLimit)
        player.ageMonths++
        if (retired) {
          this.log({ type: 'age_retired', timestamp: this.now(), playerId: action.playerId, age: calcPlayerAge(player.ageMonths) })
        }
        messages.push({ type: 'gain', text: `收到现金流 $${cashFlow}` })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'take_bank_loan': {
        const player = this.findPlayer(state, action.playerId)
        if (!player) return { success: false, events: [...this.eventLog], messages, error: 'Player not found' }
        if (action.amount <= 0) return { success: false, events: [...this.eventLog], messages, error: 'Invalid loan amount' }
        const loan = createBankLoan(action.amount)
        player.liabilities.push(loan)
        player.cash += action.amount
        recalcPlayerFinancials(player)
        this.log({
          type: 'bank_loan_taken',
          timestamp: this.now(),
          playerId: action.playerId,
          amount: action.amount,
          newTotalLoan: getTotalBankLoanAmount(player.liabilities),
          loanId: loan.id,
          monthlyPayment: loan.monthlyPayment,
        })
        messages.push({ type: 'info', text: `借入银行贷款 $${action.amount}` })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'repay_bank_loan': {
        const player = this.findPlayer(state, action.playerId)
        if (!player) return { success: false, events: [...this.eventLog], messages, error: 'Player not found' }
        const loan = findLoanById(player.liabilities, action.liabilityId)
        if (!loan) return { success: false, events: [...this.eventLog], messages, error: 'Loan not found' }
        const repayAmount = Math.min(action.amount, loan.amount)
        if (player.cash < repayAmount) return { success: false, events: [...this.eventLog], messages, error: 'Insufficient cash' }
        player.cash -= repayAmount
        loan.amount -= repayAmount
        if (loan.amount <= 0) {
          player.liabilities = player.liabilities.filter((l) => l.id !== loan.id)
        }
        recalcPlayerFinancials(player)
        this.log({
          type: 'bank_loan_repaid',
          timestamp: this.now(),
          playerId: action.playerId,
          amount: repayAmount,
          remainingLoan: loan.amount > 0 ? loan.amount : 0,
        })
        messages.push({ type: 'info', text: `偿还银行贷款 $${repayAmount}` })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'declare_bankruptcy': {
        const player = this.findPlayer(state, action.playerId)
        if (!player) return { success: false, events: [...this.eventLog], messages, error: 'Player not found' }
        player.isBankrupt = true
        this.log({
          type: 'bankruptcy_declared',
          timestamp: this.now(),
          playerId: action.playerId,
        })
        messages.push({ type: 'major', text: `${player.name} 宣告破产` })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'end_turn': {
        this.log({
          type: 'turn_ended',
          timestamp: this.now(),
          playerId: action.playerId,
          turnNumber: state.turnNumber ?? 0,
        })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      case 'reset_game': {
        this.eventLog = []
        this.log({ type: 'game_reset', timestamp: this.now() })
        return { success: true, state, events: [...this.eventLog], messages }
      }

      default:
        return { success: true, state, events: [...this.eventLog], messages }
    }
  }

  // ==================== Helpers ====================

  private findPlayer(state: GameState, playerId: string): Player | undefined {
    return state.players.find((p) => p.id === playerId)
  }

  /**
   * 掷骰子（使用引擎的确定性随机源）
   */
  diceRoll(playerId: string, count: number = 1): number[] {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(this.random.nextInt(1, 7))
    }
    return values
  }

  /**
   * 计算玩家移动后的位置
   */
  movePlayer(currentPos: number, steps: number, phase: GamePhase): number {
    const boardSize = phase === 'fast_track' ? FAST_TRACK_BOARD_SIZE : RAT_RACE_BOARD_SIZE
    return calcNewPosition(currentPos, steps, boardSize)
  }

  /**
   * 检查玩家是否可进入快车道
   */
  checkFastTrackEligibility(player: Player): boolean {
    return canEnterFastTrack(player)
  }

  /**
   * 计算玩家当前净值
   */
  calcNetWorth(player: Player): number {
    return calcPlayerNetWorth(player)
  }

  /**
   * 创建财务快照
   */
  createSnapshot(player: Player, turn: number) {
    return createFinancialSnapshot(player, turn)
  }
}

// ==================== 工厂函数 ====================

export function createGameEngine(seed?: number): GameEngine {
  return new GameEngine(seed)
}