import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'

describe('Loan Operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  function createConfig(): GameConfig {
    return {
      playerCount: 1,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
  }

  it('should allow player to take a bank loan', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const player = store.players[0]
    const beforeCash = player.cash
    const loanAmount = 1000
    const result = store.takeBankLoan(loanAmount)
    expect(result).toBe(true)
    expect(player.cash).toBe(beforeCash + loanAmount)
    const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
    expect(bankLoan).toBeDefined()
    expect(bankLoan!.amount).toBeGreaterThanOrEqual(loanAmount)
  })

  it('should reject loan amount of zero', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    const result = store.takeBankLoan(0)
    expect(result).toBe(false)
  })

  it('should allow repaying a bank loan', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    store.takeBankLoan(1000)
    const player = store.players[0]
    const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
    expect(bankLoan).toBeDefined()
    const beforeAmount = bankLoan!.amount
    const repayAmount = 500
    const beforeCash = player.cash
    const result = store.repayBankLoan(bankLoan!.id, repayAmount)
    expect(result).toBe(true)
    expect(player.cash).toBe(beforeCash - repayAmount)
    expect(bankLoan!.amount).toBe(beforeAmount - repayAmount)
  })

  it('should cap repayment at loan amount', () => {
    const store = useGameStore()
    store.startGame(createConfig(), [
      { name: 'Cleaner', colorId: 'red', careerId: 'cleaner', dreamId: '' },
    ])
    store.takeBankLoan(1000)
    const player = store.players[0]
    const bankLoan = player.liabilities.find((l) => l.category === 'bank_loan')
    expect(bankLoan).toBeDefined()
    const beforeCash = player.cash
    const result = store.repayBankLoan(bankLoan!.id, 2000)
    expect(result).toBe(true)
    expect(player.cash).toBe(beforeCash - 1000)
    expect(player.liabilities.find((l) => l.category === 'bank_loan')).toBeUndefined()
  })
})
