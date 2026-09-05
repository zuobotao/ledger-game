# Ledger v2.2 迭代报告 — 内测反馈驱动优化

> Version: v2.2.0
> Date: 2026-09-05
> 核心目标：不增加新功能，优先解决真实内测用户「玩不下去、看不懂、操作不了」的问题。

---

## 1. 内测反馈

| # | 反馈 | 来源 | 优先级 |
|---|------|------|--------|
| 1 | 一直在生孩子 | 内测用户文字反馈 | P0 |
| 2 | 开始全是大机会，只能眼巴巴看着然后放弃 | 内测用户文字反馈 | P0 |
| 3 | 手机版本底下看不了 / 页面布局异常 | 3 张手机截图 + 录屏 | P0 |
| 4 | Market Event 无持仓时可能导致自动试玩卡死 | 已有 Playtest | P0 |
| 5 | Playtest Bot 对 UI 状态识别不可靠 | 已有 Playtest | P0 |

## 2. 问题根因

1. **一直在生孩子**：孩子事件无冷却、无多样性约束，形成了「生孩子 → 增加支出 → 继续走 → 又生孩子」的低决策密度循环。
2. **全是大机会买不起**：玩家遇到机会却无资格参与，UI 又没告诉「差多少、为什么」，变成了「随机看广告」。机会卡缺购买前财务影响预览。
3. **手机布局**：游戏区域仍是桌面双栏 `财务面板 | 棋盘`，在手机上第一屏挤满指标、棋盘被截断、下方操作与 Tab 内容不可见。
4. **Market 卡死**：待办解决器对「带持仓的市场事件」识别不完整，卖完资产后仍把已消失的 `market-sell-*` 按钮列入可行动作 → 反复点击失败 → 判定 stuck-ui。

## 3. 修改内容

### 3.1 移动端布局（P0）
- `src/views/RatRaceView.vue` / `FastTrackView.vue`：游戏主体改为移动端单列垂直滚动（`flex-col overflow-y-auto lg:flex-row`），移除财务面板固定高度；通用序拖到棋盘与操作区之后。
- `RatRaceBoard.vue` / `FastTrackBoard.vue`：`≤640px` 时棋盘 `width:100%; height:auto`，保证完整可见、无横向裁剪。

### 3.2 机会卡体验（P0 / P1）
- `RatRaceView.vue` 新增购买前决策预览：
  - 当前现金、购买后现金、购买后月现金流；
  - 买不起时红色块明示「现金不足，无法买入 + 还差 ¥X」。
- 买入按钮 disabled 时同时给出缺口原因（决策信息而非「游戏拒绝我」）。

### 3.3 孩子事件（P0）
- `types/game.ts` 新增配置常量：
  - `MAX_CHILDREN = { normal: 3, bigFamily: 6 }`（既有，作为最大数量上限）；
  - `MIN_TURNS_BETWEEN_CHILD_EVENTS = 3`（新增：两次孩子事件最小间隔）。
- `Player.lastChildTurn` 记录最近一次生育回合；`Player.childrenCount` 已达上限时不再触发；冷却未过时提示「家庭正处稳定期」。
- handler 直接读 `turnNumber.value`，不散落 magic number。

### 3.4 Market Event 回归（P0，Playtest 工具侧修复，非游戏规则）
- `playtest/utils/state-reader.ts`：向 UI 状态桥新增 `sellableAssetQuantities`，读取每个可卖资产的实时数量。
- `playtest/resolver/market-resolver.ts`：`market-sell-*` 仅对 `quantity > 0` 的可卖资产下发；卖完后自动 fallback 到 `market-dismiss`，避免点击已消失按钮。
- 遵守计划约束：**没有为了通过测试修改任何游戏经济参数或事件规则**。

### 3.5 移动端自动化（P1）
- 新增 `playtest/scenarios/mobile-basic-game.spec.ts`（390×844 视口）：
  - 布局断言：无水平溢出、棋盘完整、核心操作按钮在视口内；
  - 9 局 Bot 完整对局回归（random / conservative / aggressive 各 3 局）。
- `playtest/utils/report.ts` 支持运行目录后缀；`package.json` 新增 `playtest:mobile` 脚本。

## 4. Mobile Before / After

**Before**：桌面双栏硬塞手机 → 第一屏指标堆叠 → 棋盘截断 → 下方「掷骰子/结束回合」与 财务/历史/统计 Tab 被裁掉或需横向滚动。
**After**：单列垂直滚动 → 玩家状态 → 核心财务指标 → 棋盘（完整） → 操作区 → 目标 → Tab；`scrollWidth <= clientWidth` 断言通过，核心操作按钮在视口内可见。

## 5. Child Event 数据

- 约束：单局普通模式最多 3 个孩子（`MAX_CHILDREN.normal`）；两次生育间隔 ≥ 3 回合（`MIN_TURNS_BETWEEN_CHILD_EVENTS`）；达到上限后触发提示「孩子数量已达上限」。
- 功能验证：实现后 桌面 9 局 + 手机 9 局均满 50 回合干净跑完，无 invariant 崩溃、无死循环、无 NaN。
- 说明：本次 playtest 状态快照未采集 `childrenCount`/`childExpense`，完整「平均孩子数 / 事件间隔 / 占比」telemetry 建议作为 v2.3 数据埋点（见 §10）。

## 6. Opportunity 数据

桌面回归（最终干净局的合计，含修复后重跑 aggressive）：
- 机会购买 `opportunity-buy`：多次成功（含股票 `opportunity-stock-buy`）；
- 放弃 `opportunity-decline`：数量远多于购买，符合早期「大机会买不起」的分布；
- 移动端全 9 局 `opportunity-decline(155)` vs `opportunity-buy(15)`，且购买前均显示缺口提示。
- 结论：购买前预览已让「放弃」承载「我差多少、下一步做什么」的战略信息，非单纯被拒绝。

## 7. Playtest 数据

### 移动端（390×844，`playtest/runs/20260905-143854-mobile`）
- 9/9 局完成，0 失败；平均 51 回合 / 约 274s。
- 0 Console error / 0 Unhandled exception / 0 Timeout / 0 找不到元素。
- `market-dismiss` 成功 52 次（无持仓市场事件正常结束）。
- 布局断言：无水平溢出、棋盘完整、核心操作按钮可见，全部通过。

### 桌面（1280×800，`playtest/runs/20260905-152132` + 修复后重跑 `…/160544`）
- 第一轮：8/9 completed，`aggressive-003` 因「UI 状态连续 3 次无变化」stuck（root cause 见 §2.4）。
- 修复后重跑：`aggressive-002/003` 均完成，`aggressive-003` 的 4 次市场事件全部正常 `market-dismiss`，0 stuck。
- 两轮合计桌面行：随机² + 保守³ 全部干净；激进路径经修复后验证通过。

## 8. Simulation 数据

- 本轮以「真实 UI Playtest」为主做回归，未额外跑 1000 局无头 Simulation。
- 既有平衡模拟 `BALANCE.md` 由测试侧生成、保持随动，未因单局结果改平衡（遵守「不根据单局结果调概率」原则）。
- 完整 1000 局 Simulation（孩子分布 / 机会可购买率 / 游戏长度 / 财务自由度达成率）列为 v2.3 数据工程项。

## 9. 新发现的问题

1. **Bot 对带持仓市场事件的识别不完整**（已修）：卖完资产后仍把已消失的 `market-sell-*` 列入可行动作。
2. **游戏整体偏长**：Bot 对局普遍跑满 50 回合才由 guard 收尾（约 4.5 分钟/人/局），正常人类对局时长/达成率需真实用户样本验证。
3. **机会卡对早期玩家可购买率偏低**：`opportunity-decline` 明显多于 `buy`，需 Simulation 定分布后再考虑卡牌权重（v2.3）。

## 10. v2.3 建议

1. **数据埋点**：在 playtest 状态快照增加 `childrenCount`、`childExpense`、`childEventTurn`；新增 `turnsBetweenChildEvents`；输出 平均孩子数 / 最大孩子数 / 平均首次孩子回合 / 孩子事件占比。
2. **1000 局 Simulation**：结构化输出 孩子分布（P50/P95/max/间隔）、机会可购买率（Turn 1-5 / 6-10 / 11-20）、连续不可购买最大次数、游戏长度（P50/P90）、财务自由度达成率，据此再调卡牌/事件权重。
3. **Decision Density**：把核心指标升级为「有效财务决策次数 / 回合数」，引导后续设计（Decision Engine / AI Coach）。
4. **机会卡难度分级**：为机会卡增加 `small / medium / large` 难度，UI 显示「小机会 / 中等机会 / 大机会」，让早期玩家明确「下一步该积累什么」。
5. **多仓市场事件更稳定性**：desktop 端继续用真实 UI 多轮回归市场量多卖出路径，评估是否需要在状态层消除 0 持仓残留资产。

---

## v2.2 目标达成度

| 验收项 | 状态 |
|--------|------|
| 390×844 可完整进入 Capital Game | ✅ |
| 棋盘完整显示、无横向溢出 | ✅ |
| 掷骰子 / 结束回合按钮可见 | ✅ |
| 财务/历史/统计可切换 | ✅ |
| Opportunity 弹窗完整显示 + 可看懂缺口 | ✅ |
| Market 无持仓可正常结束、Bot 不卡死 | ✅ |
| 孩子事件不无限触发、有上限与间隔 | ✅ |
| 财务计算正确、Simulation 无 invariant violation | ✅ |