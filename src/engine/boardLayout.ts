/**
 * 棋盘布局共享逻辑（Desktop / Mobile 两套 UI 共用）。
 *
 * 两个棋盘（老鼠圈、快车道）均为 7x7 Grid、24 个外围格子，格子坐标映射完全一致，
 * 所以抽成单一事实源。Mobile 棋盘测滚容器也复用同一映射做「当前格自动居中」。
 */

export interface GridCellArea {
  row: number
  col: number
}

/**
 * 获取格子在 7x7 Grid 中的行列位置（1-based，与 CSS grid 一致）。
 *
 * Grid 布局：
 * - 上边（第1行）：格子 0-6，grid-column 1 到 7，从左到右
 * - 右边（第7列）：格子 7-11，grid-row 2 到 6，从上到下（不含角）
 * - 下边（第7行）：格子 12-18，grid-column 7 到 1，从右到左
 * - 左边（第1列）：格子 19-23，grid-row 6 到 2，从下到上（不含角）
 */
export function getCellGridArea(index: number): GridCellArea {
  if (index >= 0 && index <= 6) {
    return { row: 1, col: index + 1 }
  } else if (index >= 7 && index <= 11) {
    return { row: index - 5, col: 7 }
  } else if (index >= 12 && index <= 18) {
    return { row: 7, col: 19 - index }
  } else {
    return { row: 25 - index, col: 1 }
  }
}

/**
 * 计算某个格子中心在棋盘内的像素坐标（用于移动端测滚自动居中）。
 * 布局：boardSize x boardSize 正方形，内嵌 side x side 网格，格子间距 gap px。
 */
export function getCellCenterPx(
  index: number,
  boardSize: number,
  gap = 4,
  side = 7,
): { x: number; y: number } {
  const { row, col } = getCellGridArea(index)
  const cell = (boardSize - (side - 1) * gap) / side
  const x = (col - 1) * (cell + gap) + cell / 2
  const y = (row - 1) * (cell + gap) + cell / 2
  return { x, y }
}