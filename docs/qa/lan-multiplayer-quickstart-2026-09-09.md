# PC 与手机局域网多人房间（2026-09-09）

## 适用场景

PC 和手机连接同一个 Wi-Fi，PC 运行前端与房间服务器，手机通过 PC 的局域网 IP 访问前端并加入房间。

## 启动

在 PC 终端分别运行：

```bash
# 终端 1：房间服务器
ROOM_PORT=8787 npm run server

# 终端 2：局域网前端（把 IP 换成 PC 的局域网地址）
VITE_ROOM_HTTP=http://192.168.124.3:8787 \
VITE_ROOM_WS=ws://192.168.124.3:8787/ws \
VITE_DISABLE_DEVTOOLS=1 \
npm run dev -- --host 0.0.0.0 --port 5174
```

手机打开：

```text
http://192.168.124.3:5174/ledger-game/
```

如果 PC 的局域网地址变化，两个环境变量和手机 URL 要同步更新。系统防火墙也需要允许 TCP `5174`（前端）和 `8787`（房间服务）。

## 本轮验证

- `GET http://192.168.124.3:8787/health` 返回房间服务正常。
- PC 视口创建房间，手机视口使用房间码加入。
- 双方看到 2 名玩家。
- 手机视口 `390 × 844` 无横向溢出。

## 与线上部署的区别

该方式只适合同一局域网内测试。GitHub Pages 线上页面不能访问 PC 的 `localhost` 或局域网地址；正式多人房间仍需部署公网 Node 房间服务，并把 `VITE_ROOM_HTTP` / `VITE_ROOM_WS` 配置到 Pages 构建变量。
