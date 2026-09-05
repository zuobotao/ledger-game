/**
 * Ledger Room Server — 独立可部署入口
 *
 * 启动一个 Node HTTP 服务器，挂载 RoomServer（WebSocket + HTTP /rooms bootstrap）。
 * 供本机 / 局域网 / 自部署使用；浏览器客户端通过 VITE_ROOM_WS / VITE_ROOM_HTTP 指向本服务。
 */

import { createServer } from 'node:http'
import { RoomServer } from './RoomServer'

const PORT = Number(process.env.ROOM_PORT ?? process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'

const http = createServer()
const roomServer = new RoomServer(http)

// 每 30s 回收超过 grace period 的断线玩家会话
setInterval(() => {
  try {
    roomServer.pruneDisconnected(Date.now())
  } catch {
    /* 生命周期清理失败不影响主流程 */
  }
}, 30_000).unref()

http.listen(PORT, HOST, () => {
  console.log(`[roomsrv] Ledger Room Server listening on http://${HOST}:${PORT}`)
  console.log(`[roomsrv] WebSocket upgrade path: ws://${HOST}:${PORT}/ws`)
  console.log(`[roomsrv] HTTP create-room  : POST http://${HOST}:${PORT}/rooms`)
})