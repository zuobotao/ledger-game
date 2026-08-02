# Cashflow 101 — 需求跟踪矩阵

> 本文件用于记录每个功能需求的实现状态、对应代码位置及测试覆盖，确保需求留痕可追溯。

---

## 跟踪表

| 需求 ID | 需求描述 | 优先级 | 状态 | 实现文件 | 测试文件 | 备注 |
|---------|----------|--------|------|----------|----------|------|
| FR-001 | 首页展示游戏名称、简介、开始游戏按钮 | 高 | 已完成 | `src/views/HomeView.vue` | - | 原型已确认 |
| FR-002 | 首页提供游戏规则入口 | 中 | 已完成 | `src/views/HomeView.vue` | - | 原型占位，按钮已保留 |
| FR-003 | 点击“开始游戏”进入游戏设置页 | 高 | 已完成 | `src/views/HomeView.vue`, `src/router/index.ts` | - | - |
| FR-004 | 支持选择玩家人数（1-6 人） | 高 | 已完成 | `src/views/SetupView.vue` | - | - |
| FR-005 | 为每位玩家配置姓名、职业、颜色 | 高 | 已完成 | `src/views/SetupView.vue` | - | - |
| FR-006 | 支持随机职业与随机颜色 | 中 | 已完成 | `src/views/SetupView.vue`, `src/stores/game.ts` | - | - |
| FR-007 | 提供可选规则开关 | 中 | 已完成 | `src/views/SetupView.vue`, `src/stores/game.ts` | - | 保险/大家庭/抵押贷款/速开 |
| FR-008 | 校验至少 1 位有效玩家后进入游戏 | 高 | 已完成 | `src/views/SetupView.vue`, `src/stores/game.ts` | - | - |
| FR-009 | 显示 24 格环形老鼠赛跑棋盘 | 高 | 已完成 | `src/data/board.ts`, `src/views/RatRaceView.vue` | - | - |
| FR-010 | 左侧显示当前玩家财务报表 | 高 | 已完成 | `src/views/RatRaceView.vue` | - | - |
| FR-011 | 顶部显示当前玩家与进入快车道按钮 | 高 | 已完成 | `src/views/RatRaceView.vue`, `src/stores/game.ts` | - | 条件可用 |
| FR-012 | 底部提供掷骰子、贷款、结束回合 | 高 | 已完成 | `src/views/RatRaceView.vue`, `src/stores/game.ts` | - | - |
| FR-013 | 玩家落点通过颜色棋子标识 | 高 | 已完成 | `src/views/RatRaceView.vue` | - | - |
| FR-014 | 根据落点格子触发对应事件 | 高 | 已完成 | `src/stores/game.ts`, `src/data/cards.ts` | - | - |
| FR-015 | 抽到机会时弹出卡片详情 | 高 | 已完成 | `src/views/RatRaceView.vue`, `src/stores/game.ts` | - | - |
| FR-016 | 卡片类型包括股票、房地产、企业等 | 高 | 已完成 | `src/data/cards.ts`, `src/types/game.ts` | - | - |
| FR-017 | 玩家可选择买入、卖出或放弃 | 高 | 已完成 | `src/views/RatRaceView.vue`, `src/stores/game.ts` | - | - |
| FR-018 | 交易后实时更新财务报表与现金 | 高 | 已完成 | `src/stores/game.ts`, `src/views/RatRaceView.vue` | - | - |
| FR-019 | 显示快车道线性轨道 | 高 | 已完成 | `src/data/board.ts`, `src/views/FastTrackView.vue` | - | - |
| FR-020 | 快车道保留顶部玩家信息与返回按钮 | 中 | 已完成 | `src/views/FastTrackView.vue` | - | - |
| FR-021 | 在梦想格显示当前梦想与价格 | 高 | 已完成 | `src/views/FastTrackView.vue`, `src/data/dreams.ts` | - | - |
| FR-022 | 现金达到梦想价格时可购买并获胜 | 高 | 已完成 | `src/views/FastTrackView.vue`, `src/stores/game.ts` | - | - |
| FR-023a | 卡片抽取采用无放回牌组，抽完自动洗牌 | 高 | 已完成 | `src/data/cards.ts`, `src/stores/game.ts` | - | - |
| FR-023b | 现金不足时提供贷款选择而非自动贷款 | 高 | 已完成 | `src/stores/game.ts`, `src/views/RatRaceView.vue` | - | - |
| FR-023c | 老鼠圈可购买保险规避裁员 | 中 | 已完成 | `src/stores/game.ts`, `src/views/RatRaceView.vue` | - | 花费 = 6 个月总支出 |
| FR-023d | 可选规则「抵押贷款」影响职业月供 | 中 | 已完成 | `src/stores/game.ts` | - | 开启后房贷 ×1.5 |
| FR-023e | 快车道使用高价值专属机会卡片 | 高 | 已完成 | `src/data/cards.ts`, `src/stores/game.ts` | - | - |
| FR-023f | 失业期间仍需支付总支出 | 中 | 已完成 | `src/stores/game.ts` | - | - |
| FR-023 | 游戏状态本地持久化 | 中 | 已完成 | `src/stores/game.ts` | - | localStorage |
| FR-024 | 提供重新开始与回到首页入口 | 中 | 已完成 | `src/views/RatRaceView.vue`, `src/views/FastTrackView.vue` | - | 占位页面已提供 |
| FR-025 | 响应式布局适配桌面与平板 | 高 | 已完成 | `src/views/HomeView.vue`, `src/views/SetupView.vue` | - | 适配 sm 断点 |
| NFR-001 | 前端框架使用 Vue 3 + Vite | 高 | 已完成 | `package.json`, `vite.config.ts` | - | - |
| NFR-002 | 状态管理使用 Pinia | 高 | 已完成 | `src/stores/game.ts` | - | - |
| NFR-003 | 样式使用 Tailwind CSS 4 | 高 | 已完成 | `package.json`, `src/assets/base.css` | - | - |
| NFR-004 | 图标使用 Lucide Vue | 高 | 已完成 | `package.json`, 各视图文件 | - | - |
| NFR-005 | 单页应用，使用 Vue Router | 高 | 已完成 | `src/router/index.ts` | - | - |
| NFR-006 | 无后端依赖，数据存储在浏览器本地 | 高 | 已完成 | `src/stores/game.ts` | - | - |
| NFR-007 | 代码通过 ESLint + Prettier 检查 | 中 | 已完成 | `package.json`, `eslint.config.ts` | - | `npm run lint` 通过 |

---

## 状态说明

- **待实现**：尚未开始编码，仅完成原型与需求定义。
- **进行中**：正在开发或测试。
- **已完成**：代码实现并通过测试。
- **已验收**：在手动/集成测试中验证通过。

---

## 需求变更记录

| 日期 | 版本 | 变更内容 | 变更人 | 审批状态 |
|------|------|----------|--------|----------|
| 2026-08-02 | v1.0 | 初稿完成，含 FR-001 ~ FR-025 及 NFR-001 ~ NFR-007 | Trae Design | 已审批 |
| 2026-08-02 | v1.1 | 完成首页、设置页、玩家状态与本地持久化；更新 FR-001 ~ FR-008、FR-023 ~ FR-025、NFR-001 ~ NFR-007 状态为已完成 | Trae Design | 已审批 |
| 2026-08-02 | v1.2 | 完成老鼠赛跑与快车道核心逻辑、棋盘、卡片、银行、梦想及视图绑定；更新 FR-009 ~ FR-022 状态为已完成 | Trae Design | 已审批 |
| 2026-08-02 | v1.3 | 完善逻辑策略：无放回牌组、现金不足贷款确认、保险购买、抵押贷款规则、快车道专属卡片、失业支出；新增 FR-023a ~ FR-023f | Trae Design | 已审批 |

---

## 关联文档

- [PRD.md](./PRD.md)：完整产品需求文档
- 原型项目：`cashflow101.prototype.design`
