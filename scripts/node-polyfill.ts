// Node 环境下的 localStorage polyfill，供 scripts/ 下的命令行模拟器使用。
// store 初始化时会读取 localStorage，Node 无此全局对象，需先注入空实现。
class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

const g = globalThis as unknown as Record<string, unknown>
if (typeof g.localStorage === 'undefined') {
  g.localStorage = new MemoryStorage()
}