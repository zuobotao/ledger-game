import type { FastTrackCell, RatRaceCell } from '@/types/game'

export const RAT_RACE_CELLS: RatRaceCell[] = [
  { index: 0, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 1, type: 'story', name: '历史故事', color: 'amber' },
  { index: 2, type: 'big_opportunity', name: '大机会', color: 'gold' },
  { index: 3, type: 'charity', name: '慈善', color: 'gold' },
  { index: 4, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 5, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 6, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 7, type: 'market', name: '市场风云', color: 'blue' },
  { index: 8, type: 'big_opportunity', name: '大机会', color: 'gold' },
  { index: 9, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 10, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 11, type: 'child', name: '孩子', color: 'teal' },
  { index: 12, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 13, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 14, type: 'big_opportunity', name: '大机会', color: 'gold' },
  { index: 15, type: 'market', name: '市场风云', color: 'blue' },
  { index: 16, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 17, type: 'story', name: '历史故事', color: 'amber' },
  { index: 18, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 19, type: 'layoff', name: '裁员', color: 'purple' },
  { index: 20, type: 'big_opportunity', name: '大机会', color: 'gold' },
  { index: 21, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 22, type: 'small_opportunity', name: '小机会', color: 'green' },
  { index: 23, type: 'market', name: '市场风云', color: 'blue' },
]

export const FAST_TRACK_CELLS: FastTrackCell[] = [
  // 上边：0-5（6格）
  { index: 0, type: 'cashflow', name: '现金流日', color: 'green' },
  { index: 1, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 2, type: 'market', name: '市场风云', color: 'blue' },
  { index: 3, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 4, type: 'investment', name: '不动产投资', color: 'amber' },
  { index: 5, type: 'cashflow', name: '现金流日', color: 'green' },
  // 右边：6-11（6格）
  { index: 6, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 7, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 8, type: 'deal', name: '大宗交易', color: 'purple' },
  { index: 9, type: 'charity', name: '慈善捐赠', color: 'pink' },
  { index: 10, type: 'market', name: '市场风云', color: 'blue' },
  { index: 11, type: 'cashflow', name: '现金流日', color: 'green' },
  // 下边：12-17（6格）
  { index: 12, type: 'investment', name: '不动产投资', color: 'amber' },
  { index: 13, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 14, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 15, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 16, type: 'deal', name: '大宗交易', color: 'purple' },
  { index: 17, type: 'cashflow', name: '现金流日', color: 'green' },
  // 左边：18-23（6格）
  { index: 18, type: 'dream', name: '梦想', color: 'yellow' },
  { index: 19, type: 'investment', name: '不动产投资', color: 'amber' },
  { index: 20, type: 'market', name: '市场风云', color: 'blue' },
  { index: 21, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 22, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 23, type: 'cashflow', name: '现金流日', color: 'green' },
]

export function getRatRaceCell(position: number): RatRaceCell {
  const size = RAT_RACE_CELLS.length
  return RAT_RACE_CELLS[((position % size) + size) % size] as RatRaceCell
}

export function getFastTrackCell(position: number): FastTrackCell {
  const size = FAST_TRACK_CELLS.length
  return FAST_TRACK_CELLS[((position % size) + size) % size] as FastTrackCell
}
