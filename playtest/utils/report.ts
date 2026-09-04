import fs from 'node:fs'
import path from 'node:path'
import type { PlaytestReport, GameResult, UXIssue } from '../types'

/**
 * Generates a Markdown playtest report from game results.
 */
export function generateReport(runId: string, games: GameResult[]): PlaytestReport {
  const completedGames = games.filter((g) => g.status === 'completed' || g.status === 'victory' || g.status === 'game-over')
  const failedGames = games.filter((g) => g.status === 'failed' || g.status === 'timeout')

  const totalTurns = completedGames.reduce((s, g) => s + g.totalTurns, 0)
  const totalTime = completedGames.reduce((s, g) => s + g.totalTimeMs, 0)
  const averageTurns = completedGames.length > 0 ? totalTurns / completedGames.length : 0
  const averageTimeMs = completedGames.length > 0 ? totalTime / completedGames.length : 0

  // Aggregate gameplay stats
  let totalRolls = 0
  let totalBuys = 0
  let totalSells = 0
  let totalLoans = 0
  let totalRepays = 0
  const actionCounts = new Map<string, number>()
  const allIssues: UXIssue[] = []

  for (const game of games) {
    for (const action of game.actions) {
      if (action.result !== 'success') continue
      switch (action.action) {
        case 'roll':
          totalRolls++
          break
        case 'buy':
          totalBuys++
          break
        case 'sell':
          totalSells++
          break
        case 'loan':
          totalLoans++
          break
        case 'repay':
          totalRepays++
          break
      }
      const key = `${action.action}:${action.target}`
      actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1)
    }
    allIssues.push(...game.issues)
  }

  const totalActions = totalRolls + totalBuys + totalSells + totalLoans + totalRepays
  const averageActionsPerTurn = totalTurns > 0 ? totalActions / totalTurns : 0

  // Decision stats
  const sortedActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => ({ action, count }))

  const mostCommonDecisions = sortedActions.slice(0, 10)
  const leastUsedFeatures = sortedActions.slice(-10).reverse()

  // Error stats
  const uiErrors = allIssues.filter((i) => i.type === 'button-unclickable' || i.type === 'element-not-found').length
  const consoleErrors = allIssues.filter((i) => i.type === 'console-error' || i.type === 'js-exception').length
  const unhandledExceptions = allIssues.filter((i) => i.type === 'js-exception').length
  const illegalStates = allIssues.filter((i) => i.type === 'state-stopped').length
  const timeouts = allIssues.filter((i) => i.type === 'timeout').length
  const elementNotFoundErrors = allIssues.filter((i) => i.type === 'element-not-found').length

  return {
    runId,
    timestamp: new Date().toISOString(),
    totalGames: games.length,
    completedGames: completedGames.length,
    failedGames: failedGames.length,
    averageTurns: Math.round(averageTurns * 10) / 10,
    averageTimeMs: Math.round(averageTimeMs),
    games,
    totalRolls,
    totalBuys,
    totalSells,
    totalLoans,
    totalRepays,
    averageActionsPerTurn: Math.round(averageActionsPerTurn * 100) / 100,
    uiErrors,
    consoleErrors,
    unhandledExceptions,
    illegalStates,
    timeouts,
    elementNotFoundErrors,
    mostCommonDecisions,
    leastUsedFeatures,
    longestWaitNodes: [],
    allIssues,
  }
}

export function writeReportMarkdown(report: PlaytestReport, outputPath: string): void {
  const lines: string[] = []

  lines.push(`# Playtest Report — ${report.runId}`)
  lines.push('')
  lines.push(`生成时间：${report.timestamp}`)
  lines.push('')

  // Basic stats
  lines.push('## Basic')
  lines.push('')
  lines.push(`| 指标 | 值 |`)
  lines.push(`|------|-----|`)
  lines.push(`| 总局数 | ${report.totalGames} |`)
  lines.push(`| 完成局数 | ${report.completedGames} |`)
  lines.push(`| 失败局数 | ${report.failedGames} |`)
  lines.push(`| 平均回合数 | ${report.averageTurns} |`)
  lines.push(`| 平均游戏时间 (ms) | ${report.averageTimeMs} |`)
  lines.push('')

  // Gameplay stats
  lines.push('## Gameplay')
  lines.push('')
  lines.push(`| 指标 | 值 |`)
  lines.push(`|------|-----|`)
  lines.push(`| 平均每回合操作数 | ${report.averageActionsPerTurn} |`)
  lines.push(`| 掷骰次数 | ${report.totalRolls} |`)
  lines.push(`| 购买次数 | ${report.totalBuys} |`)
  lines.push(`| 卖出次数 | ${report.totalSells} |`)
  lines.push(`| 贷款次数 | ${report.totalLoans} |`)
  lines.push(`| 还款次数 | ${report.totalRepays} |`)
  lines.push('')

  // Errors
  lines.push('## Errors')
  lines.push('')
  lines.push(`| 类型 | 数量 |`)
  lines.push(`|------|------|`)
  lines.push(`| UI error | ${report.uiErrors} |`)
  lines.push(`| Console error | ${report.consoleErrors} |`)
  lines.push(`| Unhandled exception | ${report.unhandledExceptions} |`)
  lines.push(`| Illegal state | ${report.illegalStates} |`)
  lines.push(`| Timeout | ${report.timeouts} |`)
  lines.push(`| 无法找到元素 | ${report.elementNotFoundErrors} |`)
  lines.push('')

  // Decisions
  lines.push('## Decisions')
  lines.push('')
  lines.push('### 最常见决策')
  lines.push('')
  for (const d of report.mostCommonDecisions) {
    lines.push(`- ${d.action}: ${d.count} 次`)
  }
  lines.push('')
  lines.push('### 最少使用功能')
  lines.push('')
  for (const d of report.leastUsedFeatures) {
    lines.push(`- ${d.action}: ${d.count} 次`)
  }
  lines.push('')

  // Per-game summary
  lines.push('## 各局详情')
  lines.push('')
  for (const game of report.games) {
    lines.push(`### ${game.gameId} (${game.botType})`)
    lines.push('')
    lines.push(`- 状态：${game.status}`)
    lines.push(`- 总回合：${game.totalTurns}`)
    lines.push(`- 总时长：${(game.totalTimeMs / 1000).toFixed(1)}s`)
    lines.push(`- 总操作数：${game.actions.length}`)
    lines.push(`- 问题数：${game.issues.length}`)
    if (game.errorMessage) {
      lines.push(`- 错误：${game.errorMessage}`)
    }
    lines.push('')
  }

  // UX Issues
  if (report.allIssues.length > 0) {
    lines.push('## UX Issues')
    lines.push('')
    for (const issue of report.allIssues) {
      lines.push(`- Turn ${issue.turn} [${issue.type}]: ${issue.message}`)
    }
    lines.push('')
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8')
}

export function getRunDir(baseDir: string): string {
  const now = new Date()
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')

  const runDir = path.join(baseDir, 'runs', timestamp)
  fs.mkdirSync(runDir, { recursive: true })
  return runDir
}
