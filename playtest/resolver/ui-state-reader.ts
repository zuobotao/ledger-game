import type { Page } from '@playwright/test'

/**
 * v2.2 — UI State Reader
 *
 * 扫描 DOM 判断给定 data-testid 的按钮是否存在且可用。
 * Resolver 用游戏状态算出「理论合法动作」，再用此结果与真实 DOM 对齐，
 * 只返回真实存在于 UI 且可点击的动作。
 */

export interface DomActionStatus {
  testid: string
  present: boolean
  enabled: boolean
}

export async function scanDomActions(page: Page, testids: string[]): Promise<DomActionStatus[]> {
  const out: DomActionStatus[] = []
  for (const testid of testids) {
    const locator = page.getByTestId(testid)
    let present = false
    let enabled = false
    try {
      const count = await locator.count()
      present = count > 0
      if (present) {
        const first = locator.first()
        enabled = await first.isVisible() && await first.isEnabled()
      }
    } catch {
      // element missing
    }
    out.push({ testid, present, enabled })
  }
  return out
}

export interface UIState {
  page: string
  modal: string | null
  card: string | null
  actionable: boolean
}

/** 读取当前页面 hash 对应的 UI 状态（仅用于日志/诊断） */
export function deriveUIState(url: string, context: ResolveUiContext): UIState {
  let page = 'unknown'
  if (url.includes('rat-race')) page = 'rat-race'
  else if (url.includes('fast-track')) page = 'fast-track'
  else if (url.includes('setup')) page = 'setup'
  else if (url.includes('victory')) page = 'victory'
  else if (url.includes('game-over')) page = 'game-over'

  return {
    page,
    modal: context.pendingAction ? 'decision-card' : null,
    card: context.pendingAction ?? null,
    actionable: false,
  }
}

export interface ResolveUiContext {
  pendingAction: string | null
}