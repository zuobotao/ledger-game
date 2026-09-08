import { describe, expect, it } from 'vitest'
import { generateReport } from '../../playtest/utils/report'
import type { GameResult } from '../../playtest/types'

function result(status: GameResult['status']): GameResult {
  return {
    gameId: `game-${status}`,
    botType: 'random',
    status,
    totalTurns: status === 'test-limit' ? 51 : 3,
    totalTimeMs: 100,
    totalActions: 0,
    startTime: new Date(0).toISOString(),
    endTime: new Date(100).toISOString(),
    actions: [],
    issues: [],
    events: [],
  }
}

describe('playtest report terminal state accounting', () => {
  it('keeps a max-turn harness stop out of completed games', () => {
    const report = generateReport('run', [result('test-limit'), result('victory')])

    expect(report.completedGames).toBe(1)
    expect(report.testLimitGames).toBe(1)
    expect(report.failedGames).toBe(0)
    expect(report.averageTurns).toBe(3)
  })
})
