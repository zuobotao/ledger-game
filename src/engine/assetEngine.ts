/**
 * Asset Engine — Pure Asset Management Functions
 *
 * 纯函数集合，用于资产管理计算。不依赖 Pinia Store，不直接修改状态。
 * 所有函数接收输入并返回结果，不产生副作用。
 */

import type { Asset, Player } from '@/types/game'

// ==================== 查询 ====================

/**
 * 根据股票代码查找玩家持有的股票资产
 */
export function getStockHolding(player: Player, symbol: string): Asset | undefined {
  return player.assets.find((a) => a.type === 'stock' && a.symbol === symbol)
}

/**
 * 检查玩家是否持有特定股票
 */
export function hasStockHolding(player: Player, symbol: string): boolean {
  return player.assets.some((a) => a.type === 'stock' && a.symbol === symbol)
}

/**
 * 根据 ID 查找资产
 */
export function findAssetById(assets: Asset[], id: string): Asset | undefined {
  return assets.find((a) => a.id === id)
}

// ==================== 价值计算 ====================

/**
 * 计算单个资产的价值：(marketPrice ?? cost) * quantity
 */
export function calcAssetValue(asset: Asset): number {
  return (asset.marketPrice ?? asset.cost) * asset.quantity
}

/**
 * 计算所有资产的总价值
 */
export function calcTotalAssetValue(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + calcAssetValue(a), 0)
}

/**
 * 计算股票类资产的总价值
 */
export function calcStockValue(assets: Asset[]): number {
  return assets
    .filter((a) => a.type === 'stock')
    .reduce((sum, a) => sum + calcAssetValue(a), 0)
}

/**
 * 计算房地产类资产的总价值
 */
export function calcRealEstateValue(assets: Asset[]): number {
  return assets
    .filter((a) => a.type === 'real_estate')
    .reduce((sum, a) => sum + calcAssetValue(a), 0)
}

/**
 * 计算企业类资产的总价值
 */
export function calcBusinessValue(assets: Asset[]): number {
  return assets
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + calcAssetValue(a), 0)
}

// ==================== 修改（返回新数组，不修改原数组） ====================

/**
 * 添加或更新资产（返回新数组）
 * - 股票：如果已有同 symbol 的股票，合并数量并重新计算加权平均成本
 * - 其他类型：直接追加
 */
export function addOrUpdateAsset(assets: Asset[], newAsset: Asset): Asset[] {
  // 股票类型的合并逻辑
  if (newAsset.type === 'stock' && newAsset.symbol) {
    const existingIndex = assets.findIndex(
      (a) => a.type === 'stock' && a.symbol === newAsset.symbol,
    )
    if (existingIndex !== -1) {
      const existing = assets[existingIndex]!
      const totalCost = existing.cost * existing.quantity + newAsset.cost * newAsset.quantity
      const newQuantity = existing.quantity + newAsset.quantity
      const updated: Asset = {
        ...existing,
        quantity: newQuantity,
        cost: totalCost / newQuantity,
        marketPrice: newAsset.marketPrice ?? existing.marketPrice,
      }
      const result = [...assets]
      result[existingIndex] = updated
      return result
    }
  }

  // 其他类型或新股票：直接追加
  return [...assets, newAsset]
}

/**
 * 根据 ID 移除资产（返回新数组）
 */
export function removeAsset(assets: Asset[], id: string): Asset[] {
  return assets.filter((a) => a.id !== id)
}

/**
 * 更新资产的市场价格（返回新数组）
 */
export function updateAssetPrice(assets: Asset[], id: string, newPrice: number): Asset[] {
  const index = assets.findIndex((a) => a.id === id)
  if (index === -1) return assets

  const updated: Asset = {
    ...assets[index]!,
    marketPrice: newPrice,
  }
  const result = [...assets]
  result[index] = updated
  return result
}