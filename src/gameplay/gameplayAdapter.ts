/**
 * GameplayAdapter — 统一玩法适配器接口（v2.4.3 §1 / §4 / §5 / §6）
 *
 * Shared UI 通过 <SomeGame :adapter="adapter" /> 拿到适配器，
 * 只读取 viewModel 并调用 commands；不关心数据来自本地引擎还是服务器。
 *
 * 实现方：
 * - SingleGameplayAdapter    → 本地 gameStore（本地 Engine 权威）
 * - MultiplayerGameplayAdapter → multiplayerStore（Server Authority）
 */

import type { ComputedRef } from 'vue'
import type { GamePhase, Player } from '@/types/game'
import type { GameplayCommands, GameplayViewModel } from './types'

export type GameplayMode = 'single' | 'multiplayer'

export interface GameplayAdapterMeta {
  mode: GameplayMode
  /** 多人：当前网络状态（single 恒为 'local'） */
  networkStatus: string
}

export interface GameplayAdapter {
  /** 只读投影；Shared UI 以 adapter.viewModel.value 读取 */
  readonly viewModel: ComputedRef<GameplayViewModel>
  readonly commands: GameplayCommands
  readonly meta: GameplayAdapterMeta

  /** 切换查看玩家（Shared PlayerSidebar 使用；多人只允许查看自己与公共信息） */
  setViewingPlayer(playerId: string): void

  /** 释放监听/定时器（离开页面时调用） */
  dispose(): void
}

/** 供共享组件在 template 中安全取值的辅助 */
export function viewPlayer(adapter: GameplayAdapter): Player {
  return adapter.viewModel.value.viewingPlayer
}

export function isPhase(adapter: GameplayAdapter, phase: GamePhase): boolean {
  return adapter.viewModel.value.phase === phase
}
