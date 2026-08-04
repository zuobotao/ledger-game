import { createPinia } from 'pinia'
import { useGameStore } from '../src/stores/game'

async function main() {
  const pinia = createPinia()
  const game = useGameStore(pinia)

  // 配置 3 个 AI 玩家
  game.addPlayer({ name: 'AI1', color: '#ef4444', isAI: true, profession: 'engineer' })
  game.addPlayer({ name: 'AI2', color: '#3b82f6', isAI: true, profession: 'doctor' })
  game.addPlayer({ name: 'AI3', color: '#22c55e', isAI: true, profession: 'teacher' })

  game.startGame()
  console.log('Game started, phase:', game.phase, 'players:', game.players.length)

  let totalTurns = 0
  const maxTurns = 100
  let stuckCount = 0
  let lastTurnStatus = ''
  let lastPendingType = ''

  // 游戏主循环
  while (totalTurns < maxTurns) {
    // 检查游戏是否结束
    if (game.phase === 'victory' || game.phase === 'game_over' || game.phase === 'retirement') {
      console.log(`Game ended! Phase: ${game.phase}, total turns: ${totalTurns}`)
      break
    }

    const currentPlayer = game.currentPlayer
    const turnStatus = game.turnStatus
    const pendingType = game.pendingAction.type

    // 检测是否卡住
    if (turnStatus === lastTurnStatus && pendingType === lastPendingType) {
      stuckCount++
      if (stuckCount > 50) {
        console.log(`\n⚠️  STUCK DETECTED after ${totalTurns} turns!`)
        console.log('  turnStatus:', turnStatus)
        console.log('  pendingAction.type:', pendingType)
        console.log('  pendingAction.message:', game.pendingAction.message?.slice(0, 80))
        console.log('  currentPlayer:', currentPlayer?.name)
        console.log('  currentPlayer.isAI:', currentPlayer?.isAI)
        console.log('  currentPlayer.isBankrupt:', currentPlayer?.isBankrupt)
        console.log('  isAIThinking:', game.isAIThinking)
        console.log('  marketEventState:', JSON.stringify(game.marketEventState, null, 2).slice(0, 200))
        console.log('  phase:', game.phase)
        console.log('  currentPlayerIndex:', game.currentPlayerIndex)
        break
      }
    } else {
      stuckCount = 0
      lastTurnStatus = turnStatus
      lastPendingType = pendingType
    }

    // 如果是 idle 状态且当前是 AI 玩家，触发 AI 回合
    if (turnStatus === 'idle' && currentPlayer?.isAI && !currentPlayer.isBankrupt) {
      try {
        await game.runAITurn()
        totalTurns++
        if (totalTurns % 10 === 0) {
          console.log(`Turn ${totalTurns}: ${currentPlayer.name} [${game.phase}] cash=${formatMoney(currentPlayer.cash)} cf=${formatMoney(currentPlayer.cashFlow)}`)
        }
      } catch (e) {
        console.error('Error in AI turn:', e)
        break
      }
      continue
    }

    // 如果是 resolving 状态且当前玩家是 AI，但 pending action 没有被处理
    if (turnStatus === 'resolving' && currentPlayer?.isAI && !game.isAIThinking) {
      console.log(`\n⚠️  Resolving but AI not thinking! turn ${totalTurns}`)
      console.log('  pendingType:', pendingType)
      console.log('  player:', currentPlayer.name)
      // 尝试手动处理
      try {
        // 检查是否需要贷款
        if (pendingType === 'need_loan') {
          console.log('  → need_loan, confirming...')
          game.confirmLoanForPending()
        } else if (pendingType === 'doodad') {
          console.log('  → doodad, dismissing...')
          game.dismissDoodad()
        } else if (pendingType === 'layoff' || pendingType === 'baby') {
          console.log('  → layoff/baby, acknowledging...')
          game.acknowledgeMessage()
        } else if (pendingType === 'market') {
          console.log('  → market event, state:', game.marketEventState?.phase)
        } else {
          console.log('  → unknown type, trying acknowledge...')
          game.acknowledgeMessage()
        }
      } catch (e) {
        console.error('Error handling stuck state:', e)
      }
    }

    // 小延迟避免 CPU 100%
    await new Promise(r => setTimeout(r, 10))
  }

  if (totalTurns >= maxTurns) {
    console.log(`\n✅ Reached max turns (${maxTurns}) without getting stuck!`)
  }

  console.log('\nFinal state:')
  console.log('  phase:', game.phase)
  console.log('  turnNumber:', game.turnNumber)
  for (const p of game.players) {
    console.log(`  ${p.name}: cash=${formatMoney(p.cash)} cf=${formatMoney(p.cashFlow)} bankrupt=${p.isBankrupt}`)
  }
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n}`
}

main().catch(console.error)
