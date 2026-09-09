# 多人房间生产连接检查（2026-09-09）

## 根因

GitHub Pages 的构建没有注入 `VITE_ROOM_HTTP` 与 `VITE_ROOM_WS`，生产包因此回退到 `http://localhost:8787`。手机访问线上页面时，`localhost` 指向手机自身，创建房间必然失败。

仓库已有 `render.yaml` 和 Pages 工作流变量入口，但 `ledger-room-server.onrender.com` 示例地址当前返回 404，说明公网房间服务尚未实际部署。

## 本轮修复

- 远程页面未配置完整公网 HTTP / WebSocket 地址时，创建和加入按钮置灰，并显示明确的服务未配置提示。
- 本机开发仍保留 `localhost:8787` 默认值，不影响 `npm run server` 与本地多人测试。
- 创建/加入 store 在请求前增加同一配置校验，避免进入“正在进入房间”的误导流程。

## 验证

- `npm run type-check`：通过。
- `npx vitest run test/unit/v24-join-flow.spec.ts test/unit/room-client.spec.ts`：12/12 通过。
- Playwright 双浏览器房间创建、加入、准备、开局、掷骰与手机无溢出：1/1 通过。

## 发布前置

需要先把 `render.yaml` 部署为可访问的 Node 房间服务，再在 GitHub Actions Repository Variables 设置：

- `VITE_ROOM_HTTP=https://<实际服务域名>`
- `VITE_ROOM_WS=wss://<实际服务域名>/ws`

变量设置后重新运行 Pages workflow，线上多人房间才会真正可用。
