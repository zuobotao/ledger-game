# Ledger v2.2 Playtest 回归评审

> 生成：2026-09-05
> 口径：真实 UI Playtest（browser click/fill/selectOption/press），一律通过 `data-testid` 交互，禁止直调 GameStore/localeStorage。

## 1. 覆盖范围

| 批次 | 视口 | 场景 | 结果 |
|------|------|------|------|
| Mobile | 390×844 | 布局断言 + random/保守/激进 各 3 局 = 9 局 | 9/9 通过 |
| Desktop 首轮 | 1280×800 | random/保守/激进 各 3 局 = 9 局 | 8/9，`aggressive-003` stuck |
| Desktop 重跑 | 1280×800 | `aggressive`（重跑挂起组） | 通过，stuck 复现消除 |

运行目录：
- `playtest/runs/20260905-143854-mobile`（手机 9 局）
- `playtest/runs/20260905-152132`（桌面首轮）
- `playtest/runs/20260905-160544`（激进重跑）

## 2. 移动端结论

- 9/9 完成，平均 51 回合 / 约 274s。
- 控制台错误 0，未捕获异常 0，超时 0，找不到元素 0。
- 布局断言全过：`document.scrollWidth <= clientWidth`（无水平溢出），棋盘 `boundingBox` 落在视口内，掷骰/结束回合按钮可见且未出屏。
- 每局唯一 issue 均为「max-turns=50」正常收尾标记，非问题。

## 3. 桌面端结论

首轮唯一失败：
- `aggressive-003`（turn 28）：`stuck-turn / UI 状态连续 3 次无变化`。

根因（§4）后用工具侧修复解决；重跑 `aggressive-002/003` 均满 51 回合完成，`aggressive-003` 的 4 次市场事件全部正常 `market-dismiss`。

## 4. 根因与修复（Playtest 工具侧，非游戏规则）

- 现象：市场事件带持仓，Bot 卖完所有可卖资产后，UI 状态桥 `sellableAssetIds` 仍包含已卖完（quantity≤0）的资产，resolver 持续下发 `market-sell-<id>`，但该按钮已从 DOM 消失 → 反复点击失败 → 3 次状态无变化 → stuck。
- 修复：
  - `playtest/utils/state-reader.ts` 新增 `sellableAssetQuantities`（实时数量）；
  - `playtest/resolver/market-resolver.ts` 仅对 `quantity>0` 的可卖资产下发 `market-sell-*`，卖完后自动回落到恒存在的 `market-dismiss`。
- 遵守约束：**未修改任何游戏经济参数 / 事件概率 / 胜利条件来通过测试**。

## 5. 风险与遗留

| 项 | 说明 |
|----|------|
| 游戏时长 | Bot 运转普遍耗满 50 回合（约 274s/局）才由 guard 收尾，人类正常时长需真实样本验证 |
| 多仓市场 | 已修 resolver 对 stale 卖单的过滤；仍建议后续多轮真实 UI 回归「多数量分批卖出 → dismiss」路径 |
| 孩子 telemetry | 状态快照暂未采集 `childrenCount`/`childExpense`，完整分布统计见 ITERATION_REPORT §10 |
| 机会可购买率 | decline 明显多于 buy，需 1000 局 Simulation 后再考虑权重（不做无依据调参） |

## 6. 结论

v2.2 移动端与桌面端均达成「可完整跑完、无崩溃、无卡死」；Market 事件无持仓与带持仓路径均可正常结束；唯一的 Bot stuck 属 Playtest 工具识别缺陷，已修复并回验通过。未以修改游戏规则的方式换取通过。