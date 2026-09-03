/**
 * Transaction Engine — Pure Transaction Recording Functions
 *
 * 提供纯函数用于创建交易记录和卡牌历史记录。
 * 不依赖任何 Store 状态，所有输入通过参数显式传入。
 *
 * 原则：
 * - 所有函数均为纯函数，不产生副作用。
 * - 不访问 Vue 响应式状态或 Pinia Store。
 * - 只从 @/types/game 导入类型。
 */

import type {
  TransactionRecord,
  TransactionType,
  CardHistoryRecord,
  CardHistoryType,
} from '@/types/game'

// ==================== ID 生成 ====================

/**
 * 生成唯一的交易 ID。
 * 与 store 中的 createId 实现相同。
 */
export function createTransactionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ==================== 交易记录 ====================

/** 创建交易记录所需的参数 */
export interface RecordTransactionParams {
  type: TransactionType
  amount: number
  description: string
  turnNumber: number
  playerId: string
  extra?: Partial<TransactionRecord>
}

/**
 * 创建一条交易记录（纯函数，不产生副作用）。
 *
 * @param params - 交易记录参数
 * @returns 完整的 TransactionRecord 对象
 */
export function recordTransaction(params: RecordTransactionParams): TransactionRecord {
  const { type, amount, description, turnNumber, playerId, extra } = params
  return {
    id: createTransactionId(),
    turnNumber,
    playerId,
    type,
    amount,
    description,
    timestamp: Date.now(),
    ...extra,
  }
}

// ==================== 卡牌历史记录 ====================

/** 创建卡牌历史记录所需的参数 */
export interface RecordCardDrawnParams {
  type: CardHistoryType
  card: { id: string; title: string; description: string }
  turnNumber: number
  playerId: string
  action?: CardHistoryRecord['action']
  amount?: number
}

/**
 * 创建一条卡牌历史记录（纯函数，不产生副作用）。
 *
 * @param params - 卡牌历史记录参数
 * @returns 完整的 CardHistoryRecord 对象
 */
export function recordCardDrawn(params: RecordCardDrawnParams): CardHistoryRecord {
  const { type, card, turnNumber, playerId, action, amount } = params
  return {
    id: createTransactionId(),
    turnNumber,
    playerId,
    type,
    cardId: card.id,
    cardTitle: card.title,
    cardDescription: card.description,
    action,
    amount,
    timestamp: Date.now(),
  }
}

// ==================== TransactionRecordBuilder ====================

/**
 * 交易记录构建器，支持流式 API（Fluent API）。
 *
 * 使用方式：
 * ```
 * new TransactionRecordBuilder()
 *   .setType('stock_buy')
 *   .setAmount(1000)
 *   .setDescription('买入股票')
 *   .setAssetSymbol('AAPL')
 *   .setAssetQuantity(10)
 *   .setUnitPrice(100)
 *   .build(turnNumber, playerId)
 * ```
 */
export class TransactionRecordBuilder {
  private _type?: TransactionType
  private _amount?: number
  private _description?: string
  private _assetSymbol?: string
  private _assetQuantity?: number
  private _unitPrice?: number
  private _costBasis?: number
  private _assetName?: string
  private _assetType?: TransactionRecord['assetType']
  private _loanRepaid?: number

  setType(type: TransactionType): this {
    this._type = type
    return this
  }

  setAmount(amount: number): this {
    this._amount = amount
    return this
  }

  setDescription(description: string): this {
    this._description = description
    return this
  }

  setAssetSymbol(symbol: string): this {
    this._assetSymbol = symbol
    return this
  }

  setAssetQuantity(quantity: number): this {
    this._assetQuantity = quantity
    return this
  }

  setUnitPrice(price: number): this {
    this._unitPrice = price
    return this
  }

  setCostBasis(costBasis: number): this {
    this._costBasis = costBasis
    return this
  }

  setAssetName(name: string): this {
    this._assetName = name
    return this
  }

  setAssetType(assetType: TransactionRecord['assetType']): this {
    this._assetType = assetType
    return this
  }

  setLoanRepaid(amount: number): this {
    this._loanRepaid = amount
    return this
  }

  /**
   * 构建交易记录。
   *
   * @param turnNumber - 当前回合数
   * @param playerId - 玩家 ID
   * @returns 完整的 TransactionRecord 对象
   */
  build(turnNumber: number, playerId: string): TransactionRecord {
    const record: TransactionRecord = {
      id: createTransactionId(),
      turnNumber,
      playerId,
      type: this._type!,
      amount: this._amount!,
      description: this._description ?? '',
      timestamp: Date.now(),
    }

    if (this._assetSymbol !== undefined) record.assetSymbol = this._assetSymbol
    if (this._assetQuantity !== undefined) record.assetQuantity = this._assetQuantity
    if (this._unitPrice !== undefined) record.unitPrice = this._unitPrice
    if (this._costBasis !== undefined) record.costBasis = this._costBasis
    if (this._assetName !== undefined) record.assetName = this._assetName
    if (this._assetType !== undefined) record.assetType = this._assetType
    if (this._loanRepaid !== undefined) record.loanRepaid = this._loanRepaid

    return record
  }
}