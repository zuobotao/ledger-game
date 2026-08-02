import type { FastTrackCell, RatRaceCell } from '@/types/game'

export const RAT_RACE_CELLS: RatRaceCell[] = [
  { index: 0, type: 'opportunity', name: '机会', color: 'green' },
  { index: 1, type: 'story', name: '历史故事', color: 'amber' },
  { index: 2, type: 'opportunity', name: '机会', color: 'green' },
  { index: 3, type: 'charity', name: '慈善', color: 'gold' },
  { index: 4, type: 'opportunity', name: '机会', color: 'green' },
  { index: 5, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 6, type: 'opportunity', name: '机会', color: 'green' },
  { index: 7, type: 'market', name: '市场风云', color: 'blue' },
  { index: 8, type: 'opportunity', name: '机会', color: 'green' },
  { index: 9, type: 'doodad', name: '生活意外', color: 'red' },
  { index: 10, type: 'opportunity', name: '机会', color: 'green' },
  { index: 11, type: 'child', name: '孩子', color: 'teal' },
  { index: 12, type: 'opportunity', name: '机会', color: 'green' },
  { index: 13, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 14, type: 'opportunity', name: '机会', color: 'green' },
  { index: 15, type: 'market', name: '市场风云', color: 'blue' },
  { index: 16, type: 'opportunity', name: '机会', color: 'green' },
  { index: 17, type: 'story', name: '历史故事', color: 'amber' },
  { index: 18, type: 'opportunity', name: '机会', color: 'green' },
  { index: 19, type: 'layoff', name: '裁员', color: 'purple' },
  { index: 20, type: 'opportunity', name: '机会', color: 'green' },
  { index: 21, type: 'payday', name: '发工资', color: 'yellow' },
  { index: 22, type: 'opportunity', name: '机会', color: 'green' },
  { index: 23, type: 'market', name: '市场风云', color: 'blue' },
]

export const FAST_TRACK_CELLS: FastTrackCell[] = [
  { index: 0, type: 'cashflow', name: '现金流日' },
  { index: 1, type: 'opportunity', name: '机会' },
  { index: 2, type: 'investment', name: '投资' },
  { index: 3, type: 'doodad', name: '生活意外' },
  { index: 4, type: 'cashflow', name: '现金流日' },
  { index: 5, type: 'opportunity', name: '机会' },
  { index: 6, type: 'investment', name: '投资' },
  { index: 7, type: 'doodad', name: '生活意外' },
  { index: 8, type: 'cashflow', name: '现金流日' },
  { index: 9, type: 'opportunity', name: '机会' },
  { index: 10, type: 'investment', name: '投资' },
  { index: 11, type: 'dream', name: '梦想' },
]

export function getRatRaceCell(position: number): RatRaceCell {
  const size = RAT_RACE_CELLS.length
  return RAT_RACE_CELLS[((position % size) + size) % size] as RatRaceCell
}

export function getFastTrackCell(position: number): FastTrackCell {
  const size = FAST_TRACK_CELLS.length
  return FAST_TRACK_CELLS[((position % size) + size) % size] as FastTrackCell
}
