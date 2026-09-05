/**
 * 多人服务器端点解析
 *
 * 浏览器客户端通过环境变量或默认值定位房间服务器：
 * - VITE_ROOM_HTTP：HTTP bootstrap 基地址（POST /rooms 创建房间）
 * - VITE_ROOM_WS  ：WebSocket 地址（/ws 升级）
 *
 * 默认指向本机自部署（npm run server 启动的 8787 端口）。
 */

const DEFAULT_HTTP = 'http://localhost:8787'

/** HTTP bootstrap 基地址 */
export function roomHttpBase(): string {
  const raw = import.meta.env.VITE_ROOM_HTTP as string | undefined
  return (raw && raw.trim()) || DEFAULT_HTTP
}

/** WebSocket 地址 */
export function roomWsUrl(): string {
  const explicit = import.meta.env.VITE_ROOM_WS as string | undefined
  if (explicit && explicit.trim()) return explicit.trim()
  const http = roomHttpBase()
  const wsScheme = http.startsWith('https') ? 'wss' : 'ws'
  return http.replace(/^https?/, wsScheme) + '/ws'
}

/** 判断房间服务器是否可访问（用于前端提示尚未启动） */
export function isRoomServerConfigured(): boolean {
  return Boolean(import.meta.env.VITE_ROOM_HTTP || import.meta.env.VITE_ROOM_WS)
}