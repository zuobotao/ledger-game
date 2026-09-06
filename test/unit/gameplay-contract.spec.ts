import { describe, expect, it } from 'vitest'
import {
  commandFail,
  commandOk,
  isCommandOk,
  type BuyOpportunityInput,
  type CommandResult,
  type ResolveActionInput,
} from '@/gameplay/types'

describe('gameplay contract', () => {
  it('commandOk / isCommandOk round-trip', () => {
    const ok = commandOk()
    expect(isCommandOk(ok)).toBe(true)
    expect(ok.ok).toBe(true)
  })

  it('commandFail carries code and message', () => {
    const fail = commandFail('INSUFFICIENT_CASH', '现金不足')
    expect(isCommandOk(fail)).toBe(false)
    if (!fail.ok) {
      expect(fail.code).toBe('INSUFFICIENT_CASH')
      expect(fail.message).toBe('现金不足')
    }
  })

  it('discriminates command results by ok flag', () => {
    const results: CommandResult[] = [commandOk(), commandFail('NOT_YOUR_TURN', 'x')]
    const oks = results.filter(isCommandOk)
    expect(oks).toHaveLength(1)
  })

  it('ResolveActionInput kind is discriminated', () => {
    const input: ResolveActionInput = { kind: 'market', sells: [{ assetId: 'a1', quantity: 2 }] }
    expect(input.kind).toBe('market')
    if (input.kind === 'market') {
      expect(input.sells[0]!.quantity).toBe(2)
    }
  })

  it('BuyOpportunityInput quantity is optional', () => {
    const input: BuyOpportunityInput = {}
    const withQty: BuyOpportunityInput = { quantity: 3 }
    expect(input.quantity).toBeUndefined()
    expect(withQty.quantity).toBe(3)
  })
})
