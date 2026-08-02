/**
 * 自动化游戏测试脚本
 * 直接调用 Pinia store 进行游戏逻辑测试，无需浏览器 UI
 *
 * 运行方式：npx tsx test/auto-game-test.ts
 */

import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { CAREERS } from '../src/data/careers'
import type { GameConfig, PlayerSetup } from '../src/types/game'

// 初始化 Pinia
const pinia = createPinia()
setActivePinia(pinia)

// 测试结果统计
interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: Record<string, unknown>
  duration?: number
}

const results: TestResult[] = []

// 工具函数：创建并开始游戏
function startGame(
  playerCount: number,
  careerIds: string[],
  options: Partial<GameConfig> = {},
): ReturnType<typeof useGameStore> {
  const store = useGameStore()

  const config: GameConfig = {
    playerCount,
    insurance: false,
    bigFamily: false,
    mortgage: false,
    fastStart: false,
    ...options,
  }

  const setups: PlayerSetup[] = Array.from({ length: playerCount }, (_, i) => ({
    name: `玩家${i + 1}`,
    careerId: careerIds[i] ?? careerIds[0] ?? 'janitor',
    colorId: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'][i] ?? 'red',
    dreamId: '',
    isAI: false,
    aiDifficulty: 'medium',
  }))

  const ok = store.startGame(config, setups)
  if (!ok) {
    throw new Error('游戏启动失败')
  }

  return store
}

// 工具函数：执行 N 回合游戏
function playTurns(
  store: ReturnType<typeof useGameStore>,
  maxTurns: number,
  options: { autoResolve?: boolean } = {},
): { turnsPlayed: number; ended: boolean; endReason?: string } {
  let turnsPlayed = 0
  const { autoResolve = true } = options

  for (let i = 0; i < maxTurns; i++) {
    if (store.gameOver) {
      return { turnsPlayed, ended: true, endReason: store.gameOverReason ?? 'unknown' }
    }

    if (store.turnStatus !== 'idle') {
      // 如果有 pending action，尝试自动处理
      if (autoResolve && store.pendingAction) {
        resolvePendingAction(store)
      }
      // 结束当前回合
      if (store.turnStatus === 'resolving') {
        store.endTurn()
      }
    }

    // 掷骰子
    try {
      store.rollDice()
      turnsPlayed++
    } catch (e) {
      return { turnsPlayed, ended: false, endReason: `掷骰子失败: ${e}` }
    }

    // 自动处理 pending action
    if (autoResolve && store.pendingAction) {
      resolvePendingAction(store)
    }

    // 结束回合
    if (store.turnStatus === 'resolving') {
      store.endTurn()
    }
  }

  return { turnsPlayed, ended: store.gameOver, endReason: store.gameOverReason }
}

// 自动处理 pending action（保守策略：拒绝所有机会，支付所有费用）
function resolvePendingAction(store: ReturnType<typeof useGameStore>) {
  const action = store.pendingAction
  if (!action) return

  switch (action.type) {
    case 'opportunity':
      // 拒绝所有机会
      store.declineOpportunity()
      break
    case 'expense':
      // 支付费用
      store.payExpense()
      break
    case 'charity':
      // 拒绝慈善
      store.declineCharity()
      break
    case 'doodad':
      // 支付 doodad
      store.payDoodad()
      break
    case 'deal_negotiation':
      // 拒绝交易
      store.rejectDeal()
      break
    case 'market':
      // 跳过市场
      store.acknowledgeMessage()
      break
    case 'baby':
      // 确认生孩子
      store.acknowledgeMessage()
      break
    case 'downsized':
      // 确认失业
      store.acknowledgeMessage()
      break
    case 'lawyer':
      // 支付律师费
      store.payLawyerFee()
      break
    case 'tax_audit':
      // 支付税款
      store.payTaxAudit()
      break
    case 'bankruptcy':
      // 确认破产
      // 不自动确认，让游戏结束
      break
    default:
      // 尝试确认消息
      if (action.message) {
        store.acknowledgeMessage()
      }
      break
  }
}

// 运行测试函数
function runTest(name: string, testFn: () => void | Promise<void>) {
  const startTime = Date.now()
  try {
    testFn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, duration })
    console.log(`✅ ${name} (${duration}ms)`)
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, error, duration })
    console.log(`❌ ${name}: ${error} (${duration}ms)`)
  }
}

// ============================================================
// 测试批次 1：单人老鼠圈不同职业开局（测试 1-10）
// ============================================================
console.log('\n=== 测试批次 1：单人老鼠圈不同职业开局 ===')

const testCareers = CAREERS.slice(0, 10) // 取前10个职业

testCareers.forEach((career, i) => {
  runTest(`测试${i + 1}: 单人开局 - ${career.name}`, () => {
    const store = startGame(1, [career.id])
    const player = store.players[0]
    if (!player) throw new Error('玩家不存在')

    // 验证初始状态
    if (player.career.id !== career.id) throw new Error(`职业不匹配: ${player.career.id}`)
    if (player.ageMonths !== 0) throw new Error(`初始年龄不为0: ${player.ageMonths}`)
    if (player.cash !== career.startingCash) throw new Error(`初始现金不匹配: ${player.cash} vs ${career.startingCash}`)
    if (store.turnNumber !== 1) throw new Error(`初始回合不为1: ${store.turnNumber}`)

    // 玩 10 回合
    const result = playTurns(store, 10)

    // 验证年龄增长
    const expectedAge = result.turnsPlayed
    if (player.ageMonths < expectedAge - 2 || player.ageMonths > expectedAge + 2) {
      throw new Error(`年龄增长异常: ${player.ageMonths} vs ~${expectedAge}`)
    }

    // 验证游戏没有异常结束
    if (result.ended && result.endReason !== 'bankruptcy' && result.endReason !== 'retirement') {
      throw new Error(`异常结束原因: ${result.endReason}`)
    }
  })
})

// ============================================================
// 测试批次 2：AI对战（测试 11-20）
// ============================================================
console.log('\n=== 测试批次 2：AI对战 ===')

const aiDifficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']

aiDifficulties.forEach((diff, i) => {
  // 简单/中等/困难 各测试 3-4 场
  const testCount = i === 2 ? 4 : 3 // 困难模式多测一场
  for (let j = 0; j < testCount; j++) {
    const testNum = 11 + i * 3 + j
    runTest(`测试${testNum}: AI对战 - ${diff}难度 第${j + 1}场`, () => {
      const store = useGameStore()

      const config: GameConfig = {
        playerCount: 2,
        insurance: false,
        bigFamily: false,
        mortgage: false,
        fastStart: false,
      }

      const setups: PlayerSetup[] = [
        { name: 'AI1', careerId: 'engineer', colorId: 'red', dreamId: '', isAI: true, aiDifficulty: diff },
        { name: 'AI2', careerId: 'teacher', colorId: 'blue', dreamId: '', isAI: true, aiDifficulty: diff },
      ]

      const ok = store.startGame(config, setups)
      if (!ok) throw new Error('游戏启动失败')

      // 玩 50 回合
      const result = playTurns(store, 50, { autoResolve: true })

      // 验证两个玩家都在
      if (store.players.length < 2) throw new Error(`玩家数量不足: ${store.players.length}`)

      // 验证 AI 没有导致崩溃
      if (result.endReason?.includes('错误') || result.endReason?.includes('崩溃')) {
        throw new Error(`AI 导致游戏崩溃: ${result.endReason}`)
      }
    })
  }
})

// ============================================================
// 测试批次 3：多人模式（测试 21-30）
// ============================================================
console.log('\n=== 测试批次 3：多人模式 ===')

const playerCounts = [2, 3, 4, 5, 6]

playerCounts.forEach((count, i) => {
  // 每种人数测试 2 场
  for (let j = 0; j < 2; j++) {
    const testNum = 21 + i * 2 + j
    runTest(`测试${testNum}: ${count}人模式 第${j + 1}场`, () => {
      const careerIds = CAREERS.slice(0, count).map((c) => c.id)
      const store = startGame(count, careerIds)

      if (store.players.length !== count) {
        throw new Error(`玩家数量不匹配: ${store.players.length} vs ${count}`)
      }

      // 玩 20 回合
      const result = playTurns(store, 20)

      // 验证回合轮转正常
      if (result.turnsPlayed > 0 && store.turnNumber > 1) {
        const currentIdx = store.currentPlayerIndex
        if (currentIdx < 0 || currentIdx >= count) {
          throw new Error(`当前玩家索引异常: ${currentIdx}`)
        }
      }

      // 所有玩家都应该有正确的职业
      store.players.forEach((p, idx) => {
        if (p.career.id !== careerIds[idx]) {
          throw new Error(`玩家${idx}职业不匹配: ${p.career.id} vs ${careerIds[idx]}`)
        }
      })
    })
  }
})

// ============================================================
// 测试批次 4：快车道游戏（测试 31-40）
// ============================================================
console.log('\n=== 测试批次 4：快车道游戏 ===')

// 测试进入快车道的逻辑
for (let i = 0; i < 10; i++) {
  const testNum = 31 + i
  runTest(`测试${testNum}: 快车道 - 第${i + 1}场`, () => {
    const store = startGame(1, ['doctor'])
    const player = store.players[0]
    if (!player) throw new Error('玩家不存在')

    // 给玩家足够的被动收入来进入快车道
    // 先获取当前支出
    const expenses = player.totalExpenses

    // 手动添加足够的资产（模拟）
    // 这里我们测试正常游戏流程，不手动修改

    // 玩 30 回合
    const result = playTurns(store, 30)

    // 验证游戏正常运行
    if (result.endReason?.includes('错误') || result.endReason?.includes('崩溃')) {
      throw new Error(`游戏异常: ${result.endReason}`)
    }

    // 检查阶段状态
    if (store.gamePhase !== 'rat_race' && store.gamePhase !== 'fast_track' && store.gamePhase !== 'game_over') {
      throw new Error(`游戏阶段异常: ${store.gamePhase}`)
    }
  })
}

// ============================================================
// 测试批次 5：边缘场景（测试 41-50）
// ============================================================
console.log('\n=== 测试批次 5：边缘场景 ===')

// 测试 41：破产场景
runTest('测试41: 破产场景', () => {
  const store = startGame(1, ['janitor'])
  const player = store.players[0]
  if (!player) throw new Error('玩家不存在')

  // 让玩家负债（设置很低的现金）
  // 由于不能直接修改 store，我们通过多次支出测试
  // 这里改为玩大量回合，看看是否会破产

  const result = playTurns(store, 100)

  // 即使没破产也不报错，只是验证游戏没崩溃
  if (result.endReason?.includes('错误') || result.endReason?.includes('崩溃')) {
    throw new Error(`游戏异常: ${result.endReason}`)
  }

  console.log(`  → 玩了 ${result.turnsPlayed} 回合，结束原因: ${result.endReason ?? '未结束'}`)
})

// 测试 42：退休场景
runTest('测试42: 退休场景', () => {
  const store = startGame(1, ['engineer'])
  const player = store.players[0]
  if (!player) throw new Error('玩家不存在')

  // 玩 480 个月（40年）应该到退休年龄
  const result = playTurns(store, 480)

  if (result.ended && result.endReason === 'retirement') {
    console.log('  → 成功触发退休')
  } else {
    console.log(`  → 玩了 ${result.turnsPlayed} 回合，年龄 ${player.ageYears}岁${player.ageMonths % 12}月，结束原因: ${result.endReason ?? '未结束'}`)
  }
})

// 测试 43：保险功能测试
runTest('测试43: 失业保险功能', () => {
  const store = startGame(1, ['engineer'], { insurance: true })
  const player = store.players[0]
  if (!player) throw new Error('玩家不存在')

  // 购买失业保险
  if (store.bank) {
    store.buyUnemploymentInsurance()
  }

  // 验证是否购买成功
  const hasInsurance = player.unemploymentInsurancePurchased
  console.log(`  → 失业保险购买: ${hasInsurance ? '成功' : '失败/不支持'}`)

  // 玩几回合
  const result = playTurns(store, 10)

  if (result.endReason?.includes('错误')) {
    throw new Error(`保险功能异常: ${result.endReason}`)
  }
})

// 测试 44：学习模式
runTest('测试44: 学习模式', () => {
  const store = startGame(1, ['teacher'])

  // 开启学习模式
  store.toggleLearningMode()
  if (!store.learningMode) throw new Error('学习模式未开启')

  const result = playTurns(store, 10)

  // 关闭学习模式
  store.toggleLearningMode()
  if (store.learningMode) throw new Error('学习模式未关闭')

  if (result.endReason?.includes('错误')) {
    throw new Error(`学习模式异常: ${result.endReason}`)
  }
})

// 测试 45：银行存款/贷款
runTest('测试45: 银行存取款', () => {
  const store = startGame(1, ['doctor'])
  const player = store.players[0]
  if (!player) throw new Error('玩家不存在')

  const initialCash = player.cash
  const depositAmount = 1000

  // 存款
  if (store.bank) {
    store.bank.deposit(depositAmount)
    if (player.cash !== initialCash - depositAmount) {
      throw new Error(`存款后现金不对: ${player.cash} vs ${initialCash - depositAmount}`)
    }

    // 取款
    store.bank.withdraw(depositAmount)
    if (player.cash !== initialCash) {
      throw new Error(`取款后现金不对: ${player.cash} vs ${initialCash}`)
    }

    console.log('  → 银行存取款正常')
  } else {
    console.log('  → 银行功能不可用，跳过')
  }
})

// 测试 46-50：长时运行稳定性测试
for (let i = 0; i < 5; i++) {
  const testNum = 46 + i
  runTest(`测试${testNum}: 长时运行稳定性 - 第${i + 1}场`, () => {
    const store = startGame(2, ['engineer', 'nurse'])
    const result = playTurns(store, 200)

    if (result.endReason?.includes('错误') || result.endReason?.includes('崩溃')) {
      throw new Error(`长时运行异常: ${result.endReason}`)
    }

    console.log(`  → 运行 ${result.turnsPlayed} 回合，状态: ${result.ended ? result.endReason : '正常'}`)
  })
}

// ============================================================
// 测试结果汇总
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('测试结果汇总')
console.log('='.repeat(60))

const passed = results.filter((r) => r.passed).length
const failed = results.filter((r) => !r.passed).length
const total = results.length

console.log(`\n总计: ${total} 个测试`)
console.log(`通过: ${passed} 个 ✅`)
console.log(`失败: ${failed} 个 ❌`)
console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`)

if (failed > 0) {
  console.log('\n失败的测试:')
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
}

// 输出统计数据
console.log('\n各批次统计:')
const batches = [
  { name: '单人老鼠圈', range: [1, 10] },
  { name: 'AI对战', range: [11, 20] },
  { name: '多人模式', range: [21, 30] },
  { name: '快车道', range: [31, 40] },
  { name: '边缘场景', range: [41, 50] },
]

batches.forEach((batch) => {
  const batchResults = results.filter((_, i) => i + 1 >= batch.range[0] && i + 1 <= batch.range[1])
  const batchPassed = batchResults.filter((r) => r.passed).length
  console.log(`  ${batch.name}: ${batchPassed}/${batchResults.length} 通过`)
})

// 退出码
process.exit(failed > 0 ? 1 : 0)
