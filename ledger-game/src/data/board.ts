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
  // 上边：0-6（7格，含左右角）
  { index: 0, type: 'cashflow', name: '现金流日', color: 'green' },
  { index: 1, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 2, type: 'market', name: '市场风云', color: 'blue' },
  { index: 3, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 4, type: 'investment', name: '不动产投资', color: 'amber' },
  { index: 5, type: 'deal', name: '大宗交易', color: 'purple' },
  { index: 6, type: 'cashflow', name: '现金流日', color: 'green' },
  // 右边：7-11（5格，不含角）
  { index: 7, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 8, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 9, type: 'charity', name: '慈善捐赠', color: 'pink' },
  { index: 10, type: 'market', name: '市场风云', color: 'blue' },
  { index: 11, type: 'investment', name: '不动产投资', color: 'amber' },
  // 下边：12-18（7格，含左右角）
  { index: 12, type: 'cashflow', name: '现金流日', color: 'green' },
  { index: 13, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 14, type: 'deal', name: '大宗交易', color: 'purple' },
  { index: 15, type: 'dream', name: '梦想', color: 'yellow' },
  { index: 16, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 17, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 18, type: 'cashflow', name: '现金流日', color: 'green' },
  // 左边：19-23（5格，不含角）
  { index: 19, type: 'investment', name: '不动产投资', color: 'amber' },
  { index: 20, type: 'market', name: '市场风云', color: 'blue' },
  { index: 21, type: 'stock', name: '股票交易', color: 'teal' },
  { index: 22, type: 'opportunity', name: '企业机会', color: 'gold' },
  { index: 23, type: 'deal', name: '大宗交易', color: 'purple' },
]

export function getRatRaceCell(position: number): RatRaceCell {
  const size = RAT_RACE_CELLS.length
  return RAT_RACE_CELLS[((position % size) + size) % size] as RatRaceCell
}

export function getFastTrackCell(position: number): FastTrackCell {
  const size = FAST_TRACK_CELLS.length
  return FAST_TRACK_CELLS[((position % size) + size) % size] as FastTrackCell
}
