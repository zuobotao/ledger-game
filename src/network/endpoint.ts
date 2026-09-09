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

function explicitHttp(): string {
  return (import.meta.env.VITE_ROOM_HTTP as string | undefined)?.trim() ?? ''
}

function explicitWs(): string {
  return (import.meta.env.VITE_ROOM_WS as string | undefined)?.trim() ?? ''
}

function isLocalBrowser(): boolean {
  const hostname = globalThis.location?.hostname
  return !hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/** HTTP bootstrap 基地址 */
export function roomHttpBase(): string {
  return explicitHttp() || DEFAULT_HTTP
}

/** WebSocket 地址 */
export function roomWsUrl(): string {
  const explicit = explicitWs()
  if (explicit) return explicit
  const http = roomHttpBase()
  const wsScheme = http.startsWith('https') ? 'wss' : 'ws'
  return http.replace(/^https?/, wsScheme) + '/ws'
}

/** 判断房间服务器是否可访问（用于前端提示尚未启动） */
export function isRoomServerConfigured(): boolean {
  // 本机开发直接使用 localhost；远程页面必须同时配置 HTTP 与 WS，
  // 否则创建房间会悄悄请求用户手机自己的 localhost。
  return isLocalBrowser() || Boolean(explicitHttp() && explicitWs())
}

/** 远程构建缺少房间服务变量时给用户看的可操作提示。 */
export function roomServerConfigurationMessage(): string {
  if (isRoomServerConfigured()) return ''
  return '当前线上版本尚未配置公网房间服务，暂时无法创建或加入多人房间。'
}
