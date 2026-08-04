<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGameHistoryStore } from '@/stores/gameHistory'
import type { PlayerColorId } from '@/types/game'

const gameStore = useGameStore()
const historyStore = useGameHistoryStore()

const testResults = ref<any[]>([])
const isRunning = ref(false)
const currentTest = ref<number | null>(null)
const logMessages = ref<string[]>([])

const totalTests = 6
const completedTests = computed(() => testResults.value.length)
const passedTests = computed(() => testResults.value.filter((r) => r.status !== 'error' && r.status !== 'stuck' && r.status !== 'timeout').length)

function log(msg: string) {
  logMessages.value.push(msg)
  console.log(msg)
}

async function runAllTests() {
  if (isRunning.value) return
  isRunning.value = true
  testResults.value = []
  logMessages.value = []

  for (let count = 1; count <= 6; count++) {
    currentTest.value = count
    log(`\n========== 测试 ${count} 个 AI 玩家 ==========`)
    const result = await runSingleTest(count)
    testResults.value.push(result)
    log(
      `结果: ${result.status} | 回合: ${result.turns} | 月数: ${result.gameMonths} | 耗时: ${result.duration}ms`,
    )
    if (result.issues.length > 0) {
      log(`问题: ${result.issues.join(', ')}`)
    }
    // 短暂间隔
    await new Promise((r) => setTimeout(r, 300))
  }

  currentTest.value = null
  isRunning.value = false
  log('\n========== 测试完成 ==========')
  log(`总测试: ${testResults.value.length}`)
  log(`通过: ${passedTests.value}`)
  const allIssues = testResults.value.flatMap((r: any) => r.issues.map((i: string) => `[${r.playerCount}AI] ${i}`))
  log(`总问题数: ${allIssues.length}`)
  if (allIssues.length > 0) {
    allIssues.forEach((i: string, idx: number) => log(`  ${idx + 1}. ${i}`))
  }
}

async function runSingleTest(playerCount: number) {
  const startTime = Date.now()
  const issues: string[] = []
  let status = 'unknown'
  let turns = 0
  let gameMonths = 0
  const maxMonths = 492 // 最多41年（留一点余量给退休结算）
  const maxTurns = 2000 // 回合数上限，防止死循环
  const maxStuckChecks = 200 // 检测卡顿的检查次数

  try {
    // 重置游戏
    gameStore.resetGame()

    // 加速AI（测试模式）
    gameStore.setAISpeed(0.01)
    // 禁用自动AI触发，由测试代码主动驱动
    gameStore.setAutoAITrigger(false)

    // 创建AI玩家配置
    const colors: PlayerColorId[] = ['blue', 'green', 'red', 'orange', 'purple', 'pink']
    const careers = ['engineer', 'teacher', 'doctor', 'lawyer', 'pilot', 'nurse']
    const playerSetups = []

    for (let i = 0; i < playerCount; i++) {
      playerSetups.push({
        name: `AI ${i + 1}`,
        colorId: colors[i],
        careerId: careers[i % careers.length],
        isAI: true,
        aiDifficulty: 'medium' as const,
      })
    }

    const config = {
      playerCount,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }

    const started = gameStore.startGame(config, playerSetups)
    if (!started) {
      return { playerCount, status: 'error', turns: 0, gameMonths: 0, duration: Date.now() - startTime, issues: ['游戏启动失败'] }
    }

    log(`游戏已启动: ${gameStore.players.length} 个玩家, 阶段: ${gameStore.phase}, 当前玩家: ${gameStore.currentPlayer?.name}, AI: ${gameStore.currentPlayer?.isAI}`)

    // 验证玩家数量
    if (gameStore.players.length !== playerCount) {
      issues.push(`玩家数量不匹配: 期望 ${playerCount}, 实际 ${gameStore.players.length}`)
    }

    // 验证所有玩家都是AI
    if (!gameStore.players.every((p) => p.isAI)) {
      issues.push('并非所有玩家都是AI')
    }

    // 游戏循环 - 主动驱动AI回合
    let stuckCounter = 0
    let lastTurn = 0
    let lastPlayerIdx = -1

    while (gameStore.phase !== 'finished' && gameMonths < maxMonths && turns < maxTurns && stuckCounter < maxStuckChecks) {
      const cp = gameStore.currentPlayer

      // 如果当前玩家是AI且游戏空闲，主动执行AI回合
      if (
        cp &&
        cp.isAI &&
        !cp.isBankrupt &&
        gameStore.turnStatus === 'idle' &&
        gameStore.phase !== 'finished'
      ) {
        try {
          await gameStore.runAITurn()
        } catch (e: any) {
          const cp = gameStore.currentPlayer
          const pa = gameStore.pendingAction
          issues.push(
            `AI回合错误: ${e.message} | 玩家: ${cp?.name} | 回合: ${turns} | 阶段: ${gameStore.phase} | 状态: ${gameStore.turnStatus} | pendingType: ${pa?.type}`,
          )
          issues.push(`堆栈: ${e.stack?.split('\n').slice(0, 5).join(' | ')}`)
          break
        }
        stuckCounter = 0
      } else {
        // 等待状态变化（处理pending action等）
        await new Promise((r) => setTimeout(r, 20))
        stuckCounter++
      }

      const currentTurn = gameStore.turnNumber || 1
      const currentIdx = gameStore.currentPlayerIndex
      gameMonths = gameStore.gameMonth || 0

      if (currentTurn !== lastTurn || currentIdx !== lastPlayerIdx) {
        stuckCounter = 0
      }
      lastTurn = currentTurn
      lastPlayerIdx = currentIdx
      turns = currentTurn
    }

    // 判断结果
    if (stuckCounter >= maxStuckChecks) {
      status = 'stuck'
      const cp = gameStore.currentPlayer
      const pa = gameStore.pendingAction
      issues.push(
        `游戏在第 ${turns} 回合卡住 | 玩家: ${cp?.name} | 破产: ${cp?.isBankrupt} | 阶段: ${gameStore.phase} | 状态: ${gameStore.turnStatus} | pendingType: ${pa?.type} | pendingMsg: ${pa?.message?.slice(0, 100)}`,
      )
      // 记录所有玩家状态
      gameStore.players.forEach((p: any, i: number) => {
        issues.push(
          `  玩家${i}: ${p.name} | 破产: ${p.isBankrupt} | 现金: ${Math.round(p.cash)} | 失业回合: ${p.unemploymentTurns}`,
        )
      })
    } else if (gameMonths >= maxMonths) {
      status = 'timeout'
      issues.push(`超过最大月数 (${maxMonths})`)
    } else if (turns >= maxTurns) {
      status = 'timeout'
      issues.push(`超过最大回合数 (${maxTurns})`)
    } else {
      status = gameStore.gameEndReason || 'completed'

      // 验证胜利
      if (gameStore.gameEndReason === 'victory' && !gameStore.winnerId) {
        issues.push('胜利但未设置winnerId')
      }

      // 验证交易记录
      if ((gameStore.transactions?.length ?? 0) === 0) {
        issues.push('没有交易记录')
      }

      // 验证非破产玩家有财务快照
      for (const p of gameStore.players) {
        if (!p.isBankrupt && p.financialSnapshots.length === 0) {
          issues.push(`玩家 ${p.name} 没有财务快照`)
        }
      }
    }
  } catch (e: any) {
    status = 'error'
    issues.push(`异常: ${e.message}`)
    console.error('测试错误:', e)
  } finally {
    // 恢复AI速度和自动触发
    gameStore.setAISpeed(1)
    gameStore.setAutoAITrigger(true)
  }

  return {
    playerCount,
    status,
    turns,
    gameMonths,
    duration: Date.now() - startTime,
    issues,
    playerStates: gameStore.players.map((p) => ({
      name: p.name,
      isBankrupt: p.isBankrupt,
      cash: Math.round(p.cash),
      passiveIncome: Math.round(p.passiveIncome),
      totalExpenses: Math.round(p.totalExpenses),
      assetCount: p.assets.length,
    })),
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'victory': return 'text-amber-400'
    case 'retirement': return 'text-blue-400'
    case 'bankrupt': return 'text-destructive'
    case 'stuck': return 'text-destructive'
    case 'error': return 'text-destructive'
    case 'timeout': return 'text-warning'
    default: return 'text-muted-foreground'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'victory': return '财务自由'
    case 'retirement': return '退休结算'
    case 'bankrupt': return '破产'
    case 'stuck': return '卡顿'
    case 'error': return '错误'
    case 'timeout': return '超时'
    default: return status
  }
}
</script>

<template>
  <div class="test-page">
    <header class="test-header">
      <h1>AI 玩家自动化测试</h1>
      <p class="subtitle">测试 1-6 个 AI 玩家完整游戏流程</p>
    </header>

    <div class="test-controls">
      <button
        class="start-btn"
        :disabled="isRunning"
        @click="runAllTests"
      >
        {{ isRunning ? '测试中...' : '开始全部测试' }}
      </button>
      <div v-if="isRunning" class="progress-info">
        当前: {{ currentTest }}/{{ totalTests }}
      </div>
    </div>

    <!-- 结果摘要 -->
    <div v-if="testResults.length > 0" class="summary-section">
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-value">{{ completedTests }}/{{ totalTests }}</div>
          <div class="summary-label">已完成</div>
        </div>
        <div class="summary-card">
          <div class="summary-value text-success">{{ passedTests }}</div>
          <div class="summary-label">通过</div>
        </div>
        <div class="summary-card">
          <div class="summary-value text-destructive">
            {{ testResults.flatMap(r => r.issues).length }}
          </div>
          <div class="summary-label">问题数</div>
        </div>
      </div>
    </div>

    <!-- 各测试结果 -->
    <div class="results-section">
      <h2>详细结果</h2>
      <div class="results-list">
        <div
          v-for="result in testResults"
          :key="result.playerCount"
          class="result-card"
        >
          <div class="result-header">
            <span class="player-count">{{ result.playerCount }} AI</span>
            <span :class="['result-status', getStatusColor(result.status)]">
              {{ getStatusLabel(result.status) }}
            </span>
          </div>
          <div class="result-details">
            <div class="detail-item">
              <span class="detail-label">回合数</span>
              <span class="detail-value">{{ result.turns }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">游戏月数</span>
              <span class="detail-value">{{ result.gameMonths }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">耗时</span>
              <span class="detail-value">{{ result.duration }}ms</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">问题</span>
              <span :class="['detail-value', result.issues.length > 0 ? 'text-destructive' : 'text-success']">
                {{ result.issues.length }}
              </span>
            </div>
          </div>
          <div v-if="result.issues.length > 0" class="issues-list">
            <div v-for="(issue, idx) in result.issues" :key="idx" class="issue-item">
              ⚠️ {{ issue }}
            </div>
          </div>
          <div class="player-states">
            <div
              v-for="ps in result.playerStates"
              :key="ps.name"
              class="player-state"
            >
              <span :class="ps.isBankrupt ? 'text-destructive' : 'text-success'">
                {{ ps.isBankrupt ? '💀' : '✅' }}
              </span>
              <span class="ps-name">{{ ps.name }}</span>
              <span class="ps-cash">${{ ps.cash.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志 -->
    <div class="log-section">
      <h2>测试日志</h2>
      <div class="log-container">
        <div v-for="(msg, idx) in logMessages" :key="idx" class="log-line">
          {{ msg }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-page {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-foreground);
  padding: 24px;
}

.test-header {
  text-align: center;
  margin-bottom: 24px;
}

.test-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.subtitle {
  color: var(--color-muted-foreground);
  font-size: 14px;
  margin: 0;
}

.test-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.start-btn {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 9999px;
  border: none;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.start-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.progress-info {
  font-size: 14px;
  color: var(--color-muted-foreground);
}

.summary-section {
  margin-bottom: 24px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.summary-card {
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 12px;
  color: var(--color-muted-foreground);
}

.text-success {
  color: var(--color-success);
}

.text-destructive {
  color: var(--color-destructive);
}

.text-warning {
  color: #f59e0b;
}

.results-section {
  max-width: 800px;
  margin: 0 auto 24px;
}

.results-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.player-count {
  font-size: 16px;
  font-weight: 600;
}

.result-status {
  font-size: 14px;
  font-weight: 600;
}

.result-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.detail-item {
  text-align: center;
}

.detail-label {
  display: block;
  font-size: 11px;
  color: var(--color-muted-foreground);
  margin-bottom: 2px;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
}

.issues-list {
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.issue-item {
  font-size: 12px;
  color: var(--color-destructive);
  padding: 2px 0;
}

.player-states {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.player-state {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--color-muted);
  border-radius: 6px;
  font-size: 12px;
}

.ps-name {
  font-weight: 500;
}

.ps-cash {
  color: var(--color-muted-foreground);
  font-family: monospace;
}

.log-section {
  max-width: 800px;
  margin: 0 auto;
}

.log-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.log-container {
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  color: var(--color-muted-foreground);
  white-space: pre-wrap;
}
</style>
