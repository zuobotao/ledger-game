# Ledger v2.1 Gameplay Audit

**版本**: v2.1
**日期**: 2026-09-04
**审计范围**: 完整游戏流程 Home → Setup → Rat Race → Fast Track → Victory

---

## 总览

当前项目拥有非常完整的底层引擎基础设施（`src/engine/` 下 19 个模块），包括：

- GameEngine / Contract / EventLog
- FinancialEngine / AssetEngine / LoanEngine
- SimulationEngine / Evaluator / StateHash
- Invariant / Replay / RandomSource
- AI Strategy / AI Policies / AI Validator

**但存在一个核心架构问题**：`stores/game.ts`（Pinia Store）完全绕过了 `GameEngine` 类，直接实现了所有游戏逻辑。

这导致：
- Engine 层能力（Action → Event → Result）没有被 UI 实际使用
- UI 层（store）承担了太多业务逻辑
- 财务变化没有统一 Delta，UI 需要自己比较前后状态
- Simulation 和 Replay 能力无法直接服务于玩家体验

---

## 问题总表（按严重程度排序）

| # | 严重程度 | 问题 | 阶段 |
|---|---------|------|------|
| 1 | P0 | Store 绕过 GameEngine，双轨实现游戏逻辑 | 架构 |
| 2 | P0 | 无统一 FinancialDelta，UI 需自行计算财务变化 | Engine |
| 3 | P0 | ActionResult 不完整，缺少财务变化和结构化反馈 | Engine |
| 4 | P0 | 玩家做决策后无明显反馈闭环 | Gameplay |
| 5 | P0 | 核心指标不突出，财务报表是"答题模式" | UX |
| 6 | P1 | 无回合总结，玩家不知道刚发生了什么 | Gameplay |
| 7 | P1 | 无财务自由度进度指示 | Gameplay |
| 8 | P1 | 资产卡片信息不足，缺少风险/融资/权衡信息 | Gameplay |
| 9 | P1 | 无风险提示系统 | Gameplay |
| 10 | P1 | 无"为什么"解释，玩家不理解财务关系 | Gameplay |
| 11 | P1 | What-if 模拟能力存在但未对玩家开放 | Gameplay |
| 12 | P1 | Victory 结算简单，无策略复盘 | UX |
| 13 | P2 | 游戏节奏可能存在"无聊回合" | Gameplay |
| 14 | P2 | 新玩家无引导，需先读规则 | UX |
| 15 | P2 | Replay 能力存在但未用于游戏内时间线 | UX |
| 16 | P2 | 移动端信息层级未优化 | UX |
| 17 | P3 | 首页版本号显示 v0.1 与实际不符 | 细节 |

---

## 详细审计

### 阶段 1：首页 (HomeView)

**玩家当前目标**：不明。玩家看到"财商教育模拟游戏"的描述，但不知道具体要做什么。

**玩家可操作项**：
- 开始游戏
- 游戏规则
- 历史对局

**玩家能看到的信息**：
- 游戏名称 Ledger
- 一句话简介
- 三个操作按钮

**玩家不知道的信息**：
- 游戏目标是什么（财务自由？赚最多钱？）
- 游戏怎么玩（掷骰？卡牌？）
- 大概需要多长时间
- 单人还是多人

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| H-1 | P2 | 首页没有清晰传达游戏核心循环 | 产品定位描述偏教育，不够游戏化 | 增加"怎么玩"的简要图示或核心目标展示 | 否 |
| H-2 | P3 | 版本号显示 v0.1，与实际 v2.0 不符 | 硬编码 | 从 package.json 读取版本 | 否 |

---

### 阶段 2：设置页 (SetupView)

**玩家当前目标**：配置游戏参数，开始游戏。

**玩家可操作项**：
- 选择玩家人数 (1-6)
- 每个玩家：姓名、职业、颜色、玩家类型（人/AI）、梦想
- 可选规则：保险、大家庭、抵押贷款、速开

**玩家能看到的信息**：
- 职业详情弹窗（财务数据）
- 梦想卡片列表

**玩家不知道的信息**：
- 不同职业的策略差异（只给了数字，没给含义）
- 可选规则各自影响什么
- AI 难度差异是什么

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| S-1 | P2 | 职业选择只展示数字，不解释策略含义 | 财务数据直接呈现，无引导 | 增加"职业特点"简要描述（如"高收入高支出"、"稳健型"） | 否 |
| S-2 | P2 | 可选规则的影响不明确 | 只有简单一句话说明 | 增加规则详情提示 | 否 |
| S-3 | P3 | 梦想选择放在底部，权重低 | 梦想是胜利条件，应该更突出 | 提升梦想选择的视觉层级 | 否 |

---

### 阶段 3：Rat Race 主游戏 (RatRaceView)

这是最核心的游戏阶段，也是问题最多的地方。

#### 3.1 信息层级

**玩家当前目标**：不明确。玩家需要自己从财务报表中推断"我要干什么"。

**核心问题**：主界面最显眼的是棋盘，而不是玩家的财务状态。

**当前布局**：
- 顶部：阶段/回合/玩家切换/年龄
- 左侧：棋盘（占据最大视觉空间）
- 右侧：财务面板（Tab 切换：资产负债表/交易历史/统计）
- 底部：操作区（掷骰按钮 / 银行 / 保险 / 结束回合）

**玩家能看到的核心信息**：
- 棋盘上的棋子位置
- 当前回合数
- 当前玩家姓名

**玩家看不到/需要点击才看到的信息**：
- 现金余额（需要切换到财务面板）
- 月现金流
- 净资产
- 被动收入
- 距离财务自由还有多远

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| R-1 | **P0** | 核心财务指标不突出 | 财务信息藏在侧边栏 Tab 中 | 主界面常驻显示三大指标：现金、月现金流、净资产 | **是** |
| R-2 | **P1** | 无财务自由度进度 | 没有可视化的"目标进度" | 增加财务自由度进度条（被动收入/总支出） | **是** |
| R-3 | P2 | FinancialStatement 是"答题模式"，不是"仪表盘" | 教育导向设计，玩家需要手动填写计算 | 区分游戏模式和学习模式；游戏模式直接展示真实数据 | 否 |

#### 3.2 游戏循环

**当前循环**：
```
点击掷骰
  → 骰子动画
  → 棋子移动
  → 触发事件（机会/市场/工资/支出等）
  → 弹出卡片或操作面板
  → 玩家操作（买/不买/确认等）
  → 数据变化（静默）
  → Toast 消息
  → 可以结束回合
```

**问题**：
- 玩家操作后，财务变化是"静默"的，只有一条 Toast 消息
- 玩家需要自己去对比"之前多少钱，现在多少钱"
- 没有"行动结果"的结构化展示

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| R-4 | **P0** | 重要决策后无结构化财务反馈 | 只有 Toast 消息，没有变化对比 | 建立 Decision Feedback System，展示购买前后的财务变化 | **是** |
| R-5 | **P1** | 无回合总结 | 回合结束没有"刚才发生了什么" | 每回合结束显示 Turn Summary | **是** |
| R-6 | P2 | "结束回合"按钮的目的不明确 | 玩家可能不知道什么时候该结束 | 回合结束时自动弹出总结，从总结进入下一回合 | 否 |

#### 3.3 资产决策

**当前资产卡片展示**：
- 名称、类型
- 价格 / 成本
- 现金流
- 数量选择器

**缺少的决策信息**：
- 首付金额（需要多少现金）
- 融资金额（增加多少负债）
- 风险等级
- 投资回报率（ROI）
- 对月现金流的具体影响

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| R-7 | **P1** | 资产卡片信息不足，无法做出明智决策 | 只显示价格和现金流 | 增加：首付、贷款、风险、ROI 等决策信息 | **是** |
| R-8 | **P1** | 无风险提示 | 系统不评估决策风险 | 增加风险提示系统，如"购买后现金储备不足" | **是** |
| R-9 | **P1** | 无"为什么"解释 | 玩家不理解"买了资产为什么现金流变了" | 增加财务关系解释 | **是** |
| R-10 | P2 | 没有"看看另一种选择"的能力 | What-if 模拟未开放给玩家 | 增加最小 What-if 功能 | **是** |

---

### 阶段 4：Fast Track（快车道）

*注：FastTrackView 未详细审计，但从架构上看与 Rat Race 类似，问题也相似。*

---

### 阶段 5：胜利结算 (VictoryView / GameSummary)

**当前展示**：
- 奖杯动画
- "财务自由"标题
- GameSummary 弹窗（可折叠的财务明细）
- 再来一局 / 返回首页按钮

**GameSummary 包含**：
- 概览：最终现金、净资产、月现金流、被动收入
- 财务明细：资产分类、负债分类
- 交易历史
- 抽卡历史
- 游戏统计：回合数、年龄、资产数量等

**问题清单**：

| # | 严重程度 | 问题 | 原因 | 建议 | 修改 |
|---|---------|------|------|------|------|
| V-1 | P1 | 胜利结算只有数据，没有故事性 | 罗列数字，没有旅程叙事 | 增加"财务旅程"叙事：初始→最终、关键转折点 | **是** |
| V-2 | P2 | 无策略评价 | 只展示结果，不分析策略 | 增加"你做得好的地方"和"可以改进的地方" | **是** |
| V-3 | P2 | 无 Replay 时间线 | Replay 能力存在但未在结算页展示 | 增加游戏时间线，可点击查看各回合状态 | 否 |

---

## 引擎层审计

### GameEngine 与 Store 的关系

**现状**：
- `GameEngine` 类（`src/engine/gameEngine.ts`）有完整的 `dispatch` 方法和 Action/Event 体系
- `stores/game.ts` **完全不使用** GameEngine，所有游戏逻辑直接在 store 中实现
- GameEngine 仅被 `SimulationEngine` 和测试使用

**影响**：
1. 两套游戏逻辑容易产生不一致
2. UI 无法直接受益于 Engine 层的 EventLog 和 ActionResult
3. Replay 能力无法直接用于 UI 层
4. AI 和真人玩家走不同的代码路径

**严重程度**：**P0（架构债务）**

**建议**：
- v2.1 不要求完全重构 store
- 但需要建立统一的 ActionResult 和 FinancialDelta 结构
- 逐步让 store 通过 Engine 处理核心动作
- 先从购买资产、贷款等关键动作开始

### ActionResult

**当前结构**（`contract.ts` 中的 `GameResult`）：
```ts
{
  success: boolean
  state?: GameState
  events: GameEvent[]
  error?: string
  messages: GameMessage[]
}
```

**问题**：
- 缺少 `financialDelta` — UI 需要自己比较前后状态计算变化
- 缺少 `action` 信息 — 不知道是哪个动作产生的结果
- `messages` 是纯文本，不是结构化数据
- 缺少 `warnings` — 无法传递风险提示等非错误信息

**严重程度**：**P0**

### FinancialDelta

**现状**：不存在统一的 FinancialDelta 结构。

**模拟层有类似概念**（`PlayerSimulationResult`）：
```ts
{
  cashBefore, cashAfter, cashChange
  netWorthBefore, netWorthAfter, netWorthChange
  cashFlowBefore, cashFlowAfter, cashFlowChange
  passiveIncomeBefore, passiveIncomeAfter
  totalIncomeBefore, totalIncomeAfter
  totalExpensesBefore, totalExpensesAfter
  ...
}
```

但这是模拟层的 before/after 快照，不是增量 Delta。

**问题**：
- UI 层每次都需要自己比较前后状态
- 不同动作计算财务变化的方式不一致
- 无法统一展示"本次影响"

**严重程度**：**P0**

### EventLog

**现状**：
- `GameEvent` 类型非常完整（28 种事件类型）
- 每个事件有 timestamp、playerId 和结构化 payload
- GameEngine 内部有 eventLog 数组
- 但 store 不使用 GameEngine，所以事件没有被系统地记录

**store 中有**：
- `transactions` 数组（交易记录）
- `cardHistory` 数组（抽卡历史）
- `financialSnapshots`（玩家财务快照）

**问题**：
- 事件记录分散，没有统一的 EventLog
- 部分事件有记录，部分没有
- UI 无法通过订阅事件来驱动反馈

**严重程度**：**P1**

### Simulation Engine

**现状**：
- `SimulationEngine` 类存在且功能完整
- 支持从任意状态分叉、执行操作序列、比较结果
- 有 `BranchComparison` 和评分机制
- 有 `PlayerSimulationResult` 包含详细的前后对比

**问题**：
- 仅用于 AI 决策，未对玩家开放
- UI 没有 What-if 功能
- 模拟结果的呈现没有设计

**严重程度**：**P1**

### Evaluator

**现状**：
- `BasicFinancialEvaluator` 有五个维度的评分
- 综合评分 = 净值 30% + 现金流 25% + 流动性 15% + 风险 15% + 进度 15%
- 进度维度已经计算了 `passiveIncome / totalExpenses`（财务自由度）

**问题**：
- 仅用于 AI 和 Simulation，未用于玩家反馈
- 财务自由度的概念没有在 UI 中体现

**严重程度**：**P1**

### Invariant

**现状**：
- 完整的不变量验证体系
- 支持 basic 和 full 两个级别
- 覆盖 NaN 检查、范围检查、财务一致性检查

**状态**：良好，继续保持。

---

## 测试体系审计

**当前测试覆盖**：
- 单元测试：action-contract, event-contract, game-engine, asset, loan, cards, careers, evaluator, invariant, ai 等
- 集成测试：deterministic-game, game-flow, replay-determinism
- 回归测试：financial-calculation, stress-game

**问题**：
- 缺少 Gameplay Integration Tests（端到端游戏流程测试）
- 缺少自动化试玩（随机玩家跑大量局数统计平衡）
- 缺少策略 Bot 对比测试

**严重程度**：**P1**

---

## P0 问题优先级与实施路径

### P0-1：统一 FinancialDelta
**影响范围**：Engine 层 + Store 层 + UI 层
**工作量**：中
**依赖**：无
**收益**：所有决策反馈的基础

### P0-2：统一 ActionResult
**影响范围**：Engine 层 + Store 层
**工作量**：中
**依赖**：FinancialDelta
**收益**：所有动作返回结构化结果，为 UI 反馈提供数据

### P0-3：Decision Feedback System
**影响范围**：UI 层（核心）
**工作量**：中
**依赖**：ActionResult + FinancialDelta
**收益**：玩家能感受到决策的影响

### P0-4：核心指标突出
**影响范围**：UI 层（主界面）
**工作量**：小
**依赖**：无
**收益**：玩家随时知道自己的状态

### P0-5：Gameplay Integration Tests
**影响范围**：测试
**工作量**：中
**依赖**：无
**收益**：保证重构不破坏游戏流程

---

## 结论

当前项目的引擎层基础设施非常扎实（Simulation、Evaluator、Invariant、EventLog 都有），但**这些能力没有被整合到实际的玩家体验中**。

v2.1 的核心工作不是"新增功能"，而是：

1. **打通** Engine 层能力到 UI 层
2. **建立** 统一的财务变化和行动结果结构
3. **重塑** 玩家的决策反馈体验
4. **让** 现有的 Simulation / Evaluator 能力真正服务于玩家

这是一个"向内整合"而非"向外扩张"的版本。
