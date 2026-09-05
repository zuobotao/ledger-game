/**
 * Node 无头宿主浏览器全局垫片（localStorage）。
 *
 * 客户端 store 实例化时会调用 loadState() 读取 localStorage；
 * 服务器在纯 Node（无 jsdom）下缺失该全局。这里提供一个简单的内存实现，
 * 各 GameSession 相互隔离，同一进程内的 store 不依赖它做多会话串房（快照由 refs 组合）。
 */

export function installNodeShims(): void {
  const existing = (globalThis as Record<string, unknown>).localStorage
  if (existing && typeof existing.getItem === 'function') return

  const mem = new Map<string, string>()
  const shim = {
    getItem(key: string): string | null {
      return mem.get(String(key)) ?? null
    },
    setItem(key: string, value: string): void {
      mem.set(String(key), String(value))
    },
    removeItem(key: string): void {
      mem.delete(String(key))
    },
    clear(): void {
      mem.clear()
    },
    key(index: number): string | null {
      return [...mem.keys()][index] ?? null
    },
    get length(): number {
      return mem.size
    },
  }
  ;(globalThis as Record<string, unknown>).localStorage = shim
}