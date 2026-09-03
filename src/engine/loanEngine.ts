/**
 * Loan Engine — Pure loan management functions
 *
 * 所有函数均为纯函数：接收输入，返回新值，不修改外部状态。
 * 用于处理贷款（负债）的创建、查询、计算和还款等操作。
 */

import type { Liability, Player } from '@/types/game'
import { BANK_CONFIG } from '@/types/game'
import { defaultRandom, RandomSource } from './randomSource'

// ---- 内部工具 ----

function createId(random?: RandomSource): string {
  if (random) return random.generateId('l-')
  return defaultRandom.generateId('l-')
}

// ---- 导出函数 ----

/**
 * 根据职业数据创建职业相关负债（房贷、学贷、车贷、信用卡）
 */
export function createCareerLiabilities(career: Player['career'], random?: RandomSource): Liability[] {
  const liabilities: Liability[] = []
  if (career.expenses.mortgage > 0) {
    liabilities.push({
      id: createId(random),
      name: '房屋抵押贷款',
      amount: career.expenses.mortgage * 120,
      monthlyPayment: career.expenses.mortgage,
      category: 'mortgage',
    })
  }
  if (career.expenses.schoolLoan > 0) {
    liabilities.push({
      id: createId(random),
      name: '学生贷款',
      amount: career.expenses.schoolLoan * 60,
      monthlyPayment: career.expenses.schoolLoan,
      category: 'school_loan',
    })
  }
  if (career.expenses.carLoan > 0) {
    liabilities.push({
      id: createId(random),
      name: '汽车贷款',
      amount: career.expenses.carLoan * 60,
      monthlyPayment: career.expenses.carLoan,
      category: 'car_loan',
    })
  }
  if (career.expenses.creditCard > 0) {
    liabilities.push({
      id: createId(random),
      name: '信用卡欠款',
      amount: career.expenses.creditCard * 24,
      monthlyPayment: career.expenses.creditCard,
      category: 'credit_card',
    })
  }
  return liabilities
}

/**
 * 计算所有负债的总金额
 */
export function calcTotalLiabilities(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + l.amount, 0)
}

/**
 * 计算所有负债的每月还款总额
 */
export function calcMonthlyLoanPayments(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0)
}

/**
 * 创建一笔银行贷款负债
 * @param amount 贷款金额
 * @returns 新的 Liability 对象
 */
export function createBankLoan(amount: number, random?: RandomSource): Liability {
  return {
    id: createId(random),
    name: `银行贷款 $${Math.round(amount).toLocaleString()}`,
    amount,
    monthlyPayment: Math.round(amount * BANK_CONFIG.interestRate),
    category: 'bank_loan',
  }
}

/**
 * 偿还一笔贷款（纯函数版本）
 * @param liabilities 当前负债列表
 * @param loanId 要偿还的贷款 ID
 * @param amount 还款金额
 * @returns 包含更新后的负债列表、实际还款金额和是否完全还清的结果
 */
export function repayLoan(
  liabilities: Liability[],
  loanId: string,
  amount: number,
): { liabilities: Liability[]; repaid: number; fullyPaid: boolean } {
  const index = liabilities.findIndex((l) => l.id === loanId)
  if (index === -1) {
    return { liabilities: [...liabilities], repaid: 0, fullyPaid: false }
  }

  const loan = liabilities[index]!
  const repayAmount = Math.min(amount, loan.amount)

  const newAmount = loan.amount - repayAmount
  if (newAmount <= 0) {
    // 完全还清，移除该负债
    return {
      liabilities: liabilities.filter((_, i) => i !== index),
      repaid: repayAmount,
      fullyPaid: true,
    }
  }

  // 部分还款，更新金额
  const newLiabilities = liabilities.map((l, i) =>
    i === index ? { ...l, amount: newAmount } : l,
  )
  return {
    liabilities: newLiabilities,
    repaid: repayAmount,
    fullyPaid: false,
  }
}

/**
 * 根据 ID 查找负债
 */
export function findLoanById(liabilities: Liability[], id: string): Liability | undefined {
  return liabilities.find((l) => l.id === id)
}

/**
 * 获取所有银行贷款类别的负债
 */
export function getBankLoans(liabilities: Liability[]): Liability[] {
  return liabilities.filter((l) => l.category === 'bank_loan')
}

/**
 * 计算所有银行贷款的总金额
 */
export function getTotalBankLoanAmount(liabilities: Liability[]): number {
  return liabilities
    .filter((l) => l.category === 'bank_loan')
    .reduce((sum, l) => sum + l.amount, 0)
}