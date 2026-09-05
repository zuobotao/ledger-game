/**
 * 无头游戏宿主：在 Node 进程中实例化客户端 Pinia store 作为权威状态载体。
 *
 * 设计原则（计划 §11/§13/§21）：
 * - 服务器不重写游戏规则，而是直接复用客户端 store 的规则实现。
 * - 每个 GameSession 拥有独立 Pinia 实例 → 独立 store 实例 → 多房间完全隔离。
 * - 快照由 store 暴露的 refs 组合，不借助 localStorage（避免多会话串房；客户端也不依赖）。
 * - store 使用模块级 defaultRandom，确定性种子留给 Phase 7（Replay）处理。
 */

import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { defaultRandom } from '@/engine/randomSource'
import { installNodeShims } from './nodeShim'

// store 实例化时 loadState() 会读取 localStorage；先在模块加载期装好 Node 垫片
installNodeShims()

export type GameStore = ReturnType<typeof useGameStore>

export interface GameHost {
  pinia: Pinia
  store: GameStore
}

export interface CreateGameHostOptions {
  /** 确定性种子：GameSession 复用客户端 store，其内部通过 defaultRandom（模块级单例）产生骰子/洗牌/ID。
   *  单进程顺序处理 Action（计划 §42 + §22），创建会话前把种子复位，使相同 seed + 相同 actionLog 可确定性重建（Phase 7 Replay）。 */
  seed?: number
}

/**
 * 创建隔离的游戏宿主。
 * 每次调用产生独立 Pinia 实例与 store 实例。
 * 传入 seed 时在初始化前复位默认随机源，实现按局确定性。
 */
export function createGameHost(opts: CreateGameHostOptions = {}): GameHost {
  if (typeof opts.seed === 'number') {
    defaultRandom.reset(opts.seed)
  }
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useGameStore(pinia)
  return { pinia, store }
}

export type { GameHost }