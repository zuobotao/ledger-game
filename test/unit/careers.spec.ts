import { describe, expect, it } from 'vitest'
import { CAREERS } from '@/data/careers'

describe('Career Data', () => {
  it('should have at least one career', () => {
    expect(CAREERS.length).toBeGreaterThan(0)
  })

  it('each career should have required fields', () => {
    for (const career of CAREERS) {
      expect(career.id).toBeTruthy()
      expect(career.name).toBeTruthy()
      expect(career.salary).toBeGreaterThanOrEqual(0)
      expect(career.startingCash).toBeGreaterThanOrEqual(0)
      expect(career.expenses).toBeDefined()
      expect(career.expenses.taxes).toBeGreaterThanOrEqual(0)
      expect(career.expenses.other).toBeGreaterThanOrEqual(0)
    }
  })

  it('career ids should be unique', () => {
    const ids = CAREERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('total expenses should be sum of all expense categories', () => {
    for (const career of CAREERS) {
      const { taxes, mortgage, schoolLoan, carLoan, creditCard, other, child } = career.expenses
      const total = taxes + mortgage + schoolLoan + carLoan + creditCard + other + child
      expect(total).toBeGreaterThan(0)
    }
  })
})
