/**
 * SimulationEngine — What-if 模拟引擎
 *
 * 职责：
 * - 从任意游戏状态创建分叉（fork）
 * - 在分叉上应用替代操作序列
 * - 比较不同分支的结果
 * - 预测最佳行动路径
 *
 * 使用场景：
 * - AI 决策：评估不同行动方案
 * - 玩家分析：如果选择不同会怎样
 * - 教学：展示不同策略的结果对比
 *
 * 原则：
 * - 原始状态不可变，所有操作在分叉副本上进行
 * - 模拟结果包含完整的财务对比数据
 * - 支持批量模拟（多个分支并行评估）
 */

import type { GameState, Player } from '@/types/game'
import type { GameAction, GameResult } from './contract'
import { GameEngine } from './gameEngine'
import { calcPlayerNetWorth, recalcPlayerFinancials } from './financialEngine'
import { RandomSource } from './randomSource'

// ==================== Simulation Types ====================

/** 模拟分支 */
export interface SimulationBranch {
  /** 分支 ID */
  id: string
  /** 分支标签（描述此分支的操作） */
  label: string
  /** 要执行的操作序列 */
  actions: GameAction[]
  /** 分支结果（模拟后填充） */
  result?: SimulationResult
}

/** 单次模拟结果 */
export interface SimulationResult {
  /** 是否成功 */
  success: boolean
  /** 模拟后的游戏状态 */
  finalState: GameState
  /** 模拟后的玩家状态列表 */
  playerResults: PlayerSimulationResult[]
  /** 错误信息 */
  error?: string
  /** 执行的操作数 */
  actionsExecuted: number
}

/** 玩家模拟结果 */
export interface PlayerSimulationResult {
  playerId: string
  playerName: string
  cashBefore: number
  cashAfter: number
  cashChange: number
  netWorthBefore: number
  netWorthAfter: number
  netWorthChange: number
  cashFlowBefore: number
  cashFlowAfter: number
  cashFlowChange: number
  passiveIncomeBefore: number
  passiveIncomeAfter: number
  totalIncomeBefore: number
  totalIncomeAfter: number
  totalExpensesBefore: number
  totalExpensesAfter: number
  assetCountBefore: number
  assetCountAfter: number
  liabilityCountBefore: number
  liabilityCountAfter: number
  phaseBefore: 'rat_race' | 'fast_track'
  phaseAfter: 'rat_race' | 'fast_track'
  isBankruptAfter: boolean
}

/** 分支比较结果 */
export interface BranchComparison {
  /** 分支 ID */
  branchId: string
  /** 分支标签 */
  label: string
  /** 各玩家的净值变化 */
  playerChanges: PlayerNetWorthChange[]
  /** 综合评分（越高越好） */
  overallScore: number
  /** 排名（1 为最佳） */
  rank: number
}

export interface PlayerNetWorthChange {
  playerId: string
  playerName: string
  netWorthBefore: number
  netWorthAfter: number
  netWorthChange: number
  cashFlowChange: number
}

// ==================== SimulationEngine ====================

export class SimulationEngine {
  readonly engine: GameEngine
  readonly random: RandomSource

  constructor(engine?: GameEngine, seed?: number) {
    this.engine = engine ?? new GameEngine()
    this.random = new RandomSource(seed)
  }

  // ==================== Core Simulation ====================

  /**
   * 从基础状态创建分叉，并运行模拟
   * @param baseState 基础游戏状态（会被深拷贝，不影响原始状态）
   * @param actions 操作序列
   * @returns 模拟结果
   */
  simulate(baseState: GameState, actions: GameAction[]): SimulationResult {
    const state = deepCloneState(baseState)
    let actionsExecuted = 0

    // 捕获模拟前的玩家状态
    const beforeState = deepCloneState(baseState)

    for (const action of actions) {
      const result = this.engine.dispatch(action, state)
      if (!result.success) {
        // 计算已执行的玩家结果
        return {
          success: false,
          finalState: state,
          playerResults: this.buildPlayerResults(beforeState, state),
          error: result.error ?? 'Action failed',
          actionsExecuted,
        }
      }
      actionsExecuted++
    }

    return {
      success: true,
      finalState: state,
      playerResults: this.buildPlayerResults(beforeState, state),
      actionsExecuted,
    }
  }

  /**
   * 批量模拟多个分支
   * @param baseState 基础状态
   * @param branches 分支列表
   * @returns 各分支的模拟结果
   */
  simulateBranches(
    baseState: GameState,
    branches: SimulationBranch[],
  ): SimulationBranch[] {
    return branches.map((branch) => {
      const result = this.simulate(baseState, branch.actions)
      return { ...branch, result }
    })
  }

  // ==================== Comparison ====================

  /**
   * 比较多个分支的结果，按综合评分排序
   */
  compareBranches(branches: SimulationBranch[]): BranchComparison[] {
    const comparisons: BranchComparison[] = []

    for (const branch of branches) {
      if (!branch.result || !branch.result.success) {
        comparisons.push({
          branchId: branch.id,
          label: branch.label,
          playerChanges: [],
          overallScore: -Infinity,
          rank: 0,
        })
        continue
      }

      const playerChanges = branch.result.playerResults.map((pr) => ({
        playerId: pr.playerId,
        playerName: pr.playerName,
        netWorthBefore: pr.netWorthBefore,
        netWorthAfter: pr.netWorthAfter,
        netWorthChange: pr.netWorthChange,
        cashFlowChange: pr.cashFlowChange,
      }))

      // 综合评分 = 净值变化 + 现金流变化 * 权重
      const overallScore = playerChanges.reduce(
        (sum, pc) => sum + pc.netWorthChange + pc.cashFlowChange * 12,
        0,
      )

      comparisons.push({
        branchId: branch.id,
        label: branch.label,
        playerChanges,
        overallScore,
        rank: 0,
      })
    }

    // 按评分排序并分配排名
    comparisons.sort((a, b) => b.overallScore - a.overallScore)
    comparisons.forEach((c, i) => {
      c.rank = i + 1
    })

    return comparisons
  }

  /**
   * 获取最佳分支
   */
  getBestBranch(branches: SimulationBranch[]): SimulationBranch | null {
    const comparisons = this.compareBranches(branches)
    if (comparisons.length === 0) return null
    const best = comparisons[0]
    if (!best) return null
    return branches.find((b) => b.id === best.branchId) ?? null
  }

  // ==================== Single Player Focus ====================

  /**
   * 针对单个玩家评估行动
   * @param state 游戏状态
   * @param playerId 目标玩家
   * @param actionOptions 可选行动列表
   * @returns 每个行动的分支结果
   */
  evaluatePlayerActions(
    state: GameState,
    playerId: string,
    actionOptions: { label: string; action: GameAction }[],
  ): SimulationBranch[] {
    const branches: SimulationBranch[] = actionOptions.map((opt, i) => ({
      id: `eval-${playerId}-${i}`,
      label: opt.label,
      actions: [opt.action],
    }))

    return this.simulateBranches(state, branches)
  }

  // ==================== Private ====================

  private buildPlayerResults(
    beforeState: GameState,
    afterState: GameState,
  ): PlayerSimulationResult[] {
    const beforePlayerMap = new Map(beforeState.players.map((p) => [p.id, p]))
    const afterPlayerMap = new Map(afterState.players.map((p) => [p.id, p]))

    const results: PlayerSimulationResult[] = []

    for (const afterPlayer of afterState.players) {
      const beforePlayer = beforePlayerMap.get(afterPlayer.id)
      if (!beforePlayer) continue

      results.push({
        playerId: afterPlayer.id,
        playerName: afterPlayer.name,
        cashBefore: beforePlayer.cash,
        cashAfter: afterPlayer.cash,
        cashChange: afterPlayer.cash - beforePlayer.cash,
        netWorthBefore: calcPlayerNetWorth(beforePlayer),
        netWorthAfter: calcPlayerNetWorth(afterPlayer),
        netWorthChange: calcPlayerNetWorth(afterPlayer) - calcPlayerNetWorth(beforePlayer),
        cashFlowBefore: beforePlayer.cashFlow,
        cashFlowAfter: afterPlayer.cashFlow,
        cashFlowChange: afterPlayer.cashFlow - beforePlayer.cashFlow,
        passiveIncomeBefore: beforePlayer.passiveIncome,
        passiveIncomeAfter: afterPlayer.passiveIncome,
        totalIncomeBefore: beforePlayer.totalIncome,
        totalIncomeAfter: afterPlayer.totalIncome,
        totalExpensesBefore: beforePlayer.totalExpenses,
        totalExpensesAfter: afterPlayer.totalExpenses,
        assetCountBefore: beforePlayer.assets.length,
        assetCountAfter: afterPlayer.assets.length,
        liabilityCountBefore: beforePlayer.liabilities.length,
        liabilityCountAfter: afterPlayer.liabilities.length,
        phaseBefore: beforePlayer.phase,
        phaseAfter: afterPlayer.phase,
        isBankruptAfter: afterPlayer.isBankrupt,
      })
    }

    return results
  }
}

// ==================== Helpers ====================

function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

// ==================== Factory ====================

export function createSimulationEngine(
  engine?: GameEngine,
  seed?: number,
): SimulationEngine {
  return new SimulationEngine(engine, seed)
}