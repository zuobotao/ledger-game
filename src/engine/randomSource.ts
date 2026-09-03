/**
 * RandomSource — 确定性伪随机数生成器
 *
 * 使用 mulberry32 PRNG 算法，保证：
 * - 相同 seed → 相同随机序列
 * - 可复现的游戏过程（用于回放与测试）
 *
 * 逐步替换项目中的 Math.random() 调用：
 * - Dice（掷骰）
 * - Card Shuffle（洗牌）
 * - AI Random Decision（AI 随机决策）
 * - Market Randomness（市场随机性）
 */

export class RandomSource {
  private state: number

  /**
   * @param seed 整数种子，默认使用 Date.now()
   */
  constructor(seed?: number) {
    this.state = seed ?? Date.now()
  }

  /**
   * 返回 [0, 1) 的浮点数（替代 Math.random()）
   */
  next(): number {
    // mulberry32 PRNG
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * 返回 [min, max) 的整数（含 min，不含 max）
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * 从数组中随机选取一个元素
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)] as T
  }

  /**
   * Fisher-Yates 洗牌，返回新数组
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1)
      const temp = result[i]!
      result[i] = result[j]!
      result[j] = temp
    }
    return result
  }

  /**
   * 获取当前状态（用于序列化/恢复）
   */
  getState(): number {
    return this.state
  }

  /**
   * 恢复状态
   */
  setState(state: number): void {
    this.state = state
  }

  /**
   * 重置种子
   */
  reset(seed: number): void {
    this.state = seed
  }
}

/** 全局默认随机源（向后兼容，非确定性） */
export const defaultRandom = new RandomSource()

/** 用于测试的确定性随机源 */
export function createSeededRandom(seed: number): RandomSource {
  return new RandomSource(seed)
}