# Ledger - 财商教育模拟游戏

一款基于 Vue 3 + Vite 的财商教育模拟游戏，通过模拟真实的个人财务与投资场景，
帮助玩家学习资产管理、投资决策和财务自由理念。

## 功能特性

- 多职业选择，不同收入起点
- 股票、房地产、企业等多种投资类型
- 原始资本积累 + 资本游戏双阶段
- AI 对战支持
- 学习模式：手动填写财务报表，巩固财商知识
- 历史对局记录与数据分析

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Multiplayer room server

GitHub Pages serves the browser client only. PC and mobile players can share a room
only when the Node room server is reachable from both devices.

```sh
npm run server
```

For a public deployment, set the Vite build variables before building:

```sh
VITE_ROOM_HTTP=https://rooms.example.com \
VITE_ROOM_WS=wss://rooms.example.com/ws \
npm run build
```

The server health check is `GET /health`. The browser client must never use
`localhost` for a room server that other devices need to reach.
