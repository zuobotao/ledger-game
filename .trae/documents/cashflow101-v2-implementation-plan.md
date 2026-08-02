# Cashflow 101 v2 — 八项功能改进实施计划

## Summary

本计划针对 Cashflow 101 网页游戏的 8 项用户反馈进行系统性改进，涵盖股票系统增强、交互重设计、财务教育、交易记录、数据可视化、棋盘自适应和棋盘内交互七大方面。采用分阶段实施策略，每个阶段独立可交付，确保随时可回滚。

**技术栈**：Vue 3 + Pinia + TypeScript + Tailwind CSS 4 + Lucide icons + Vite  
**设计主题**：Doubao dark theme（背景 #0e1115，主色 #0065fd，圆角 19.2px）  
**项目路径**：`cashflow101.web/`

---

## Current State Analysis

### 架构概览

```
data/cards.ts (卡片数据)  →  stores/game.ts (状态逻辑)  →  views/RatRaceView.vue (视图编排)  →  components/* (UI组件)
```

### 已知问题清单

| 编号 | 需求 | 现状 | 问题 |
|------|------|------|------|
| 1 | 股票卖出数量 + 多样化 + 买卖动作 | 5种股票各1个价位，只能机会卡买、市场卖 | 价格层次不足，操作方式单一 |
| 2 | 骰子与结束回合重设计 | 底部4个并列按钮 | 状态不清晰，操作不直觉 |
| 3 | 手动填写 + 教育报表 | 一键式操作，报表纯展示 | 缺乏教育意义，用户学不到财务知识 |
| 4 | 详细交易记录 | 无历史记录 | 无法复盘，无法追踪每笔操作 |
| 5 | 机缘卡记录 | 卡片用完即弃 | 无法回顾抽到过什么 |
| 6 | 财务图表 | 纯数字展示 | 不直观，缺乏趋势感知 |
| 7 | 棋盘自适应 | 固定13%格子，absolute定位 | 移动端堆叠，底部被遮挡 |
| 8 | 棋盘内投资交互 | 底部toast + modal弹窗 | 沉浸感差，操作路径长 |

---

## Proposed Changes

### 阶段一：数据基础设施 — 交易记录 + 机缘卡历史

**目标**：建立游戏历史数据的持久化基础设施，为后续图表、回顾等功能提供数据支撑。  
**包含改进项**：第4项（详细交易记录）、第5项（机缘卡记录）

#### 1.1 类型定义扩展

**文件**：`src/types/game.ts`

新增以下接口：

```typescript
// 交易类型
export type TransactionType =
  | 'salary'           // 工资收入
  | 'passive_income'   // 被动收入
  | 'expense'          // 支出
  | 'stock_buy'        // 买入股票
  | 'stock_sell'       // 卖出股票
  | 'real_estate_buy'  // 买入房产
  | 'real_estate_sell' // 卖出房产
  | 'business_buy'     // 买入企业
  | 'business_sell'    // 卖出企业
  | 'bank_loan'        // 银行贷款
  | 'loan_repay'       // 贷款还款
  | 'savings_deposit'  // 存款
  | 'savings_withdraw' // 取款
  | 'insurance_buy'    // 购买保险
  | 'doodad'           // Doodad 支出
  | 'charity'          // 慈善捐赠
  | 'child'            // 孩子出生
  | 'layoff'           // 裁员
  | 'other'

// 单笔交易记录
export interface TransactionRecord {
  id: string
  turnNumber: number
  playerId: string
  type: TransactionType
  amount: number               // 正数=收入/资产增加，负数=支出/资产减少
  description: string
  assetSymbol?: string         // 关联资产代码（股票等）
  assetQuantity?: number       // 资产数量变化
  unitPrice?: number           // 单价（股票等）
  timestamp: number
}

// 卡片历史记录
export type CardHistoryType = 'opportunity' | 'market' | 'doodad' | 'fast_track_opportunity'

export interface CardHistoryRecord {
  id: string
  turnNumber: number
  playerId: string             // 抽到卡的玩家
  type: CardHistoryType
  cardId: string
  cardTitle: string
  cardDescription: string
  action?: 'accepted' | 'declined' | 'sold' | 'ignored'
  amount?: number              // 涉及金额
  timestamp: number
}
```

在 `GameState` 中新增：
```typescript
transactions: TransactionRecord[]
cardHistory: CardHistoryRecord[]
```

#### 1.2 Store 逻辑扩展

**文件**：`src/stores/game.ts`

- 新增 `transactions` 和 `cardHistory` 两个 `ref`
- 新增 `recordTransaction()` 辅助函数：所有现金流变动点统一调用
- 新增 `recordCardDrawn()` 辅助函数：所有抽卡点统一调用
- `saveState()` / `loadState()` 中包含新字段
- `startGame()` / `resetGame()` 中初始化/清空

**需插入记录调用的位置**：

| 函数 | 记录类型 | 说明 |
|------|----------|------|
| `handlePayday()` | salary / expense | 发工资或失业支出 |
| `applyDoodad()` | doodad | Doodad 消费 |
| `buyOpportunity()` | stock_buy / real_estate_buy / business_buy | 买入机会卡资产 |
| `sellAssetToMarket()` | stock_sell / real_estate_sell / business_sell | 市场风云卖出 |
| `takeBankLoan()` | bank_loan | 银行贷款 |
| `repayBankLoan()` / `repayAllBankLoans()` | loan_repay | 贷款还款 |
| `depositToSavings()` / `withdrawFromSavings()` | savings_deposit / savings_withdraw | 存取款 |
| `buyInsurance()` | insurance_buy | 购买保险 |
| `acceptCharity()` | charity | 慈善捐赠 |
| `payoffLiability()` | loan_repay | 还清负债 |
| `ratRaceRollDice()` 机会/Doodad/市场分支 | cardHistory | 抽卡记录 |
| `fastTrackRollDice()` 机会/Doodad分支 | cardHistory | 快车道抽卡 |

#### 1.3 新增组件

**新建**：`src/components/TransactionHistory.vue`
- 按玩家筛选、按类型筛选
- 按回合倒序排列
- 每笔显示：回合数、类型图标、描述、金额（正绿负红）
- 集成到左侧面板作为标签页

**新建**：`src/components/CardHistory.vue`
- 按类型（机会/市场风云/Doodad）筛选 Tab
- 卡片列表，显示标题、描述、玩家行动结果
- 时间线式布局

#### 1.4 视图集成

**文件**：`src/views/RatRaceView.vue`

- 左侧财务报表侧边栏改为 Tab 切换：财务报表 / 历史记录
- 历史记录 Tab 内嵌套 Tab：交易记录 / 抽卡记录

#### 验证步骤

1. 完成一回合完整操作（掷骰子→买股票→发工资→Doodad）
2. 打开交易记录，确认每笔操作有对应记录，金额和类型正确
3. 打开卡片历史，确认抽到的每张卡都有记录
4. 切换玩家，记录按玩家正确过滤
5. 刷新页面后历史数据仍存在（localStorage 验证）
6. `npm run type-check` 通过

---

### 阶段二：股票系统增强 — 多样化 + 买卖动作 + 数量选择优化

**目标**：让股票系统更贴近真实投资体验，增加价格波动和买卖灵活性。  
**包含改进项**：第1项（股票卖出数量选择 + 小机会股票多样化 + 买卖动作）

#### 2.1 扩充股票卡片数据

**文件**：`src/data/cards.ts`

为每种股票增加多个价位的机会卡：

| 股票 | 价位1（低） | 价位2（中低） | 价位3（中高） | 价位4（高） |
|------|------------|-------------|-------------|------------|
| ON2U | $5 | $10 | $20 | $30 |
| MYT4U | $10 | $20 | $30 | $40 |
| GRO4US | $5 | $12 | $25 | $40 |
| OK4U | $15 | $20 | $30 | $50 |
| 2BIG | $20 | $30 | $50 | $80 |

共 20 张小机会股票卡（替换原 5 张）。

`OpportunityCard` 类型新增字段：
```typescript
action?: 'buy' | 'sell'  // 默认为 buy
```

- 低价卡（价位1-2）：`action: 'buy'`，买入机会
- 高价卡（价位3-4）：`action: 'sell'`，卖出机会
- 标题格式示例："ON2U 股票 · $5 买入机会" / "ON2U 股票 · $30 卖出机会"

#### 2.2 Store 逻辑修改

**文件**：`src/stores/game.ts`

- 修改 `buyOpportunity()`：检测 `action === 'sell'` 时调用卖出逻辑
- 新增 `sellOpportunityStock(symbol, price, quantity)`：
  - 检查持仓是否足够
  - 按机会卡价格卖出指定数量
  - 计算收益/亏损
  - 记录交易（类型 stock_sell）
- 扩充机会卡接受/拒绝的记录逻辑

#### 2.3 股票数量选择器组件

**新建**：`src/components/StockQuantitySelector.vue`

- Props: `maxQuantity`, `unitPrice`, `initialValue`, `mode` ('buy' | 'sell'), `availableCash?`
- Emits: `update:modelValue`, `confirm(quantity)`
- 包含：
  - 数字输入框（可直接输入）
  - 加减按钮（h-9 w-9，适配触屏）
  - 快捷按钮：全部 / 一半 / 100 / 500 / 1000
  - 实时显示：总金额 / 可用现金 / 持仓数量
- 用于机会卡买入、机会卡卖出、市场风云卖出三个场景

#### 2.4 机会卡面板重构

**文件**：`src/views/RatRaceView.vue`

机会卡显示区域重构为三态：

1. **买入卡**（action: 'buy' 或 undefined）：价格 + 数量选择器 + 买入/放弃
2. **卖出卡**（action: 'sell'）：当前持仓 + 数量选择器 + 卖出/放弃；无持仓时显示"无持仓可卖" + 放弃按钮
3. **非股票机会卡**：保持原样式（房产/企业等）

#### 验证步骤

1. 抽取股票机会卡，确认不同价位的卡都能出现
2. 低价买入卡：输入数量后买入，资产列表正确增加
3. 高价卖出卡：有持仓时可以卖出，数量选择正确
4. 数量选择器测试：加减边界、快捷按钮、直接输入、总金额实时计算
5. 无持仓时抽到卖出卡，显示"无持仓可卖"提示
6. `npm run type-check` 通过

---

### 阶段三：回合交互重设计 — 骰子与结束回合

**目标**：让掷骰子和结束回合的交互更直觉、更流畅，减少底部操作栏的视觉负担。  
**包含改进项**：第2项（投掷骰子和结束回合重新设计）

#### 3.1 设计方案

**核心思路：单主按钮 + 状态驱动**

底部操作栏简化为两层结构：
- **顶部信息行**：当前玩家徽章 + 回合状态文字（左侧） | 银行 + 保险图标按钮（右侧）
- **底部主按钮区**：一个大按钮，根据状态切换
  - `idle` 状态：「掷骰子」主色大按钮（最醒目）
  - `resolving` 状态：「结束回合」次级按钮

骰子动画从全屏遮罩改为棋盘中心内联播放。

#### 3.2 DiceRoller 组件改造

**文件**：`src/components/DiceRoller.vue`

- 新增 `inline` prop：true 时无全屏遮罩，作为内联元素
- 新增 `size` prop：'sm' | 'md' | 'lg' 控制骰子尺寸
- 保留弹跳动画和弹入动画
- inline 模式下背景透明，无遮罩

#### 3.3 底部操作栏重构

**文件**：`src/views/RatRaceView.vue`

`<footer>` 完全重构：

```
┌──────────────────────────────────────────────────┐
│  [玩家徽标]  等待掷骰子         [银行] [买保险]  │  ← 信息行
│  ┌──────────────────────────────────────────┐    │
│  │            🎲  掷 骰 子                   │    │  ← 主按钮（idle状态）
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  [玩家徽标]  操作中...          [银行] [买保险]  │  ← 信息行
│  ┌──────────────────────────────────────────┐    │
│  │            结 束 回 合  →                │    │  ← 主按钮（resolving状态）
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

- 主按钮：h-14，圆角 2xl，占满宽度
- 银行和买保险：圆形图标按钮（w-11 h-11），减少视觉权重
- 状态切换时有平滑过渡动画

#### 3.4 棋盘中心骰子动画

**文件**：`src/components/RatRaceBoard.vue`

- 新增 prop: `isRolling: boolean`
- 新增 prop: `diceValues: number[]`
- 中心信息区在 `isRolling` 时切换为骰子动画
- 动画结束后显示点数，停留 0.8s 后过渡回信息显示
- 与棋子移动动画配合（先掷骰→显示点数→棋子移动）

#### 验证步骤

1. 进入游戏，底部「掷骰子」主按钮视觉突出
2. 点击掷骰子，棋盘中心播放骰子动画，结束后显示点数
3. 玩家棋子移动到对应格子，底部按钮变为「结束回合」
4. 处理待办事项时底部状态同步更新
5. 点击「结束回合」，切换到下一位玩家，按钮变回「掷骰子」
6. 银行按钮始终可用，点击正常打开银行弹窗
7. 失业状态下按钮状态正确
8. 移动端和桌面端布局都正常
9. `npm run type-check` 通过

---

### 阶段四：财务教育功能 — 手动填写 + 教育报表

**目标**：从一键式操作转为手动填写金额，教育用户理解资产负债表的运作原理。  
**包含改进项**：第3项（手动填写财务操作 + 教育资产报表）

#### 4.1 学习模式配置

**文件**：`src/types/game.ts`

`GameConfig` 新增：
```typescript
educationalMode: boolean  // 学习模式：手动填写+教育提示
```

**文件**：`src/views/SetupView.vue`
- 新增「学习模式」开关选项
- 描述："开启后需要手动计算金额，帮助学习财务知识"

#### 4.2 机会卡手动验证

**文件**：`src/views/RatRaceView.vue`

学习模式下，机会卡操作增加计算验证步骤：

**买入时**：
1. 显示卡片信息（价格、现金流）
2. 用户选择购买数量
3. 用户手动填写总金额
4. 系统实时校验：
   - 正确 = 单价 × 数量：绿色勾，启用「确认买入」
   - 错误：红色提示 + 显示计算方式（"正确总价 = 单价 × 数量"）
5. 填写正确后才能确认买入

**卖出时**：
1. 显示持仓数量和卖出价
2. 用户选择卖出数量
3. 用户填写预计可得金额
4. 系统校验，正确才允许确认

#### 4.3 教育式资产负债表

**新建**：`src/components/EducationalBalanceSheet.vue`

（替代当前左侧面板的静态报表）

- 每个科目增加「ⓘ」信息图标，点击显示解释弹层
- 关键概念解释：
  - 工资收入：你的劳动所得，用时间换钱
  - 被动收入：不需要工作就能获得的钱（资产产生）
  - 现金流：总收入 - 总支出 = 你每月能存下的钱
  - 资产：能把钱放进你口袋的东西
  - 负债：把钱从你口袋拿走的东西
  - 财务自由：被动收入 ≥ 总支出
- 资产/负债变化时，对应项目高亮 + 数字变化动画
- 底部增加财务自由度进度条：`被动收入 / 总支出` 百分比
- 增加资产负债率显示

#### 4.4 BankModal 教育增强

**文件**：`src/components/BankModal.vue`

- 贷款 Tab：
  - 显示月供计算公式：贷款金额 × 10% = 每月利息
  - 学习模式下：用户需手动填写月供验证，正确才允许借款
- 还款 Tab：
  - 显示还款后每月支出减少多少
  - 学习模式下：验证还款后月供减少额
- 存款 Tab：
  - 显示利息计算：储蓄 × 2% ÷ 12 = 月利息
  - 学习模式下：验证利息计算

#### 验证步骤

1. 开启学习模式，开始游戏
2. 抽到股票机会卡：
   - 填写购买数量和总价
   - 故意填错总价，验证错误提示出现
   - 填写正确后，成功买入
3. 查看财务报表，点击各科目「ⓘ」图标，显示教育解释
4. 资产变化时，报表中对应项目高亮动画
5. 银行贷款时显示月供计算教育提示
6. 关闭学习模式，操作恢复为一键式
7. 财务自由度进度条随被动收入增加而增长
8. `npm run type-check` 通过

---

### 阶段五：数据可视化 — 财务图表

**目标**：用图表直观展示财务状况变化，增强学习效果。  
**包含改进项**：第6项（财务图表）

#### 5.1 图表库选择

使用 **Chart.js + vue-chartjs**：
- 轻量，Tree-shakable（Vite 友好）
- Vue 3 官方封装
- 深色模式适配简单
- 饼图/柱状图/折线图全覆盖

**文件**：`package.json`
- 新增依赖：`chart.js` 和 `vue-chartjs`

#### 5.2 图表组件

**新建**：`src/components/charts/AssetAllocationChart.vue`（资产配置饼图）
- 展示资产构成：股票 / 房产 / 企业 / 其他
- 每个扇区显示类别和占比
- 中心显示总资产价值

**新建**：`src/components/charts/IncomeExpenseChart.vue`（收支柱状图）
- 按回合统计：工资收入 / 被动收入 / 总支出 / 净现金流
- 最近 10 回合柱状图
- 堆叠或分组柱状图

**新建**：`src/components/charts/NetWorthChart.vue`（净资产折线图）
- 按回合统计净资产变化（总资产价值 - 总负债）
- 带面积填充的折线图
- 展示财富增长曲线

**新建**：`src/components/charts/StockPerformanceChart.vue`（股票投资追踪图）
- 单只股票的买入/卖出价格标记
- 显示：持仓数量、平均成本、当前市值、浮动盈亏
- 数据来源：交易记录中该股票的买卖记录

#### 5.3 图表面板集成

**新建**：`src/components/FinancialCharts.vue`
- 容器组件，Tab 切换：资产配置 / 收支分析 / 净资产 / 股票追踪
- 适配侧边栏宽度（响应式）

**文件**：`src/views/RatRaceView.vue`
- 左侧面板 Tab 增加为三个：财务报表 / 图表分析 / 历史记录

#### 5.4 数据计算辅助

**文件**：`src/stores/game.ts`

新增计算属性/方法：
- `getPlayerNetWorthHistory(playerId)` — 按回合汇总净资产
- `getPlayerIncomeHistory(playerId)` — 按回合收入/支出明细
- `getStockPerformance(symbol, playerId)` — 单只股票投资表现

数据基于阶段一的交易记录计算。

#### 5.5 深色主题适配

**文件**：`src/assets/base.css`

为 Chart.js 配置深色主题默认值：
- 网格线颜色：`hsl(var(--border))`
- 文字颜色：`hsl(var(--muted-foreground))`
- 主数据色：`hsl(var(--primary))`
- 数据集配色：定义 `--chart-1` 到 `--chart-5` 五个颜色变量

#### 验证步骤

1. 完成多回合游戏操作（买卖股票、买房、贷款等）
2. 资产配置饼图正确显示各类资产占比
3. 收支柱状图每回合数据正确，颜色区分收入/支出
4. 净资产折线图随回合增长
5. 股票追踪图显示买卖点标记，浮动盈亏计算正确
6. 切换玩家，图表数据正确切换
7. 图表在侧边栏窄宽度下自适应
8. 深色主题下文字和网格线清晰可见
9. `npm run build` 构建成功
10. `npm run type-check` 通过

---

### 阶段六：棋盘布局优化 — 自适应

**目标**：棋盘在各种屏幕尺寸下都能充分利用空间，格子不堆叠，底部不被遮挡。  
**包含改进项**：第7项（棋盘自适应布局）

#### 6.1 RatRaceBoard 组件重构

**文件**：`src/components/RatRaceBoard.vue`

**改造方案：CSS Grid 替代绝对定位**

使用 7×7 的 grid 布局：
- 第0行（上边）：格子 0-6（左→右）
- 第6行（下边）：格子 12-18（右→左）
- 第0列（左边）：格子 18-23 + 0（下→上，注意角格共享）
- 第6列（右边）：格子 6-12（上→下）
- 中心 1:1 到 5:5 区域为信息区

```css
.board-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 1fr);
  aspect-ratio: 1;
  width: 100%;
  max-width: min(70vh, 100%);
  max-height: 100%;
}
```

格子内容响应式：
- 桌面端（sm+）：显示全名 + 颜色条 + 玩家棋子
- 移动端（sm-）：缩写名 + 颜色条 + 迷你棋子

#### 6.2 视图布局调整

**文件**：`src/views/RatRaceView.vue`

**桌面端（lg 以上）**：
- 左侧财务报表（固定宽度 280-360px）
- 中间棋盘区（flex-1，垂直居中）
- 底部操作栏（全宽）

**平板端（md）**：
- 顶部 Tab 切换：财务报表 / 棋盘
- 下方内容区自适应

**移动端（sm 以下）**：
- 顶部栏压缩高度
- 棋盘区域：`flex-1 min-h-0 flex items-center justify-center`
- 财务报表：底部抽屉式（从下往上滑出）
- 底部操作栏高度减小，按钮精简

**关键修复**：
- 棋盘容器使用 `max-height: 100%` + `aspect-ratio` 约束
- 确保棋盘完整显示在可视区域，底部格子不被操作栏遮挡
- pending action 区域改为浮层，不常驻占用空间

#### 6.3 待办事项浮层化

当前待办事项占用棋盘下方空间，挤压棋盘高度。优化为：
- 桌面端：右侧浮层面板（固定宽度，不挤压棋盘）
- 移动端：底部弹出面板（bottom sheet）
- 使用 `<Transition>` 平滑过渡

#### 验证步骤

1. 桌面端（1440px+）：棋盘居中，大小合适，文字清晰
2. 平板端（768-1024px）：布局合理，无堆叠
3. 移动端（375px）：
   - 棋盘完整显示在可视区域内
   - 底部格子不被操作栏遮挡
   - 格子内容不溢出
   - 棋子可见
4. 调整浏览器窗口大小，棋盘平滑缩放
5. 财务报表展开/收起时棋盘自适应
6. 待办事项出现时不挤压棋盘空间
7. `npm run type-check` 通过

---

### 阶段七：棋盘内交互 — 卡片直显

**目标**：将弹窗式投资操作改为在棋盘上/旁直接显示卡片，类似麻将桌的沉浸式体验。  
**包含改进项**：第8项（棋盘内投资交互）

#### 7.1 设计方案

核心思路：
- 机会卡/市场风云卡不再以底部 toast 或 modal 形式出现
- 作为一张物理卡片，显示在棋盘对应格子旁
- 玩家直接在卡片上操作（买入/卖出/放弃）
- 操作完成后卡片"收走"动画

卡片弹出方向（根据格子位置）：
- 上边格子 → 卡片向下弹出
- 下边格子 → 卡片向上弹出
- 左边格子 → 卡片向右弹出
- 右边格子 → 卡片向左弹出

#### 7.2 通用卡片组件

**新建**：`src/components/GameCard.vue`

通用游戏卡片组件：
- Props: `cardType` ('opportunity' | 'market' | 'doodad' | 'charity' | 'layoff'), `cardData`, `size`, `direction` ('up' | 'down' | 'left' | 'right')
- 结构：卡片头部（类型标签+颜色条）、标题、描述、操作区（插槽）
- 动画：进场 scale + fade + 方向滑入；退场反向

#### 7.3 RatRaceBoard 卡片插槽

**文件**：`src/components/RatRaceBoard.vue`

新增 Props：
```typescript
activeCell?: number | null  // 当前激活的格子索引（卡片锚点）
```

新增命名插槽：
- `#card-content`：卡片内容，由父组件提供
- 当 `activeCell` 存在时，在对应格子旁渲染卡片容器
- 自动计算卡片弹出方向（根据格子在棋盘的哪条边）

#### 7.4 RatRaceView 交互重构

**文件**：`src/views/RatRaceView.vue`

大改内容：
1. **移除底部待办事项面板**（原 pending action 区域）
2. **将操作内容移入棋盘卡片插槽**
   - 机会卡操作：数量选择 + 确认/放弃
   - 市场风云操作：资产列表 + 卖出按钮
   - Doodad：卡片 + "知道了"按钮
   - 慈善/裁员：卡片 + 对应操作按钮
3. **市场风云多玩家轮询**：
   - 轮到其他玩家：卡片显示"XX玩家操作中"
   - 当前玩家：卡片完整交互
4. **动画衔接**：
   - 掷骰子 → 棋子移动 → 停在格子 → 卡片从格子弹出
   - 操作完成 → 卡片收起 → 底部"结束回合"按钮可点击

#### 7.5 状态机确认

确保 `turnStatus` 状态流正确：
- `idle` → 点击掷骰子 → `rolling`（动画中）
- `rolling` → 移动完成 → `resolving`（卡片显示，等待操作）
- `resolving` → 操作完成 → 仍为 `resolving`（可继续操作或结束回合）
- 点击结束回合 → 下一位玩家 → `idle`

#### 验证步骤

1. 掷骰子后，棋子移动到目标格子，卡片从该位置弹出
2. 机会卡：在棋盘旁的卡片上操作数量选择和买入，完成后卡片收起
3. 市场风云：卡片显示在市场格子旁，多玩家轮询时正确切换
4. Doodad / 慈善 / 裁员卡片显示位置正确
5. 四个边上的格子，卡片弹出方向正确（不超出棋盘边界）
6. 移动端卡片大小自适应，按钮可点击
7. 银行弹窗仍可正常打开（保留 modal 形式的银行操作）
8. 动画流畅，无明显卡顿
9. `npm run build` 构建成功
10. `npm run type-check` 通过

---

## 阶段间依赖关系

```
阶段一: 数据基础设施 (交易记录 + 卡片历史)
    │
    ├─→ 阶段二: 股票系统增强  (使用交易记录)
    ├─→ 阶段五: 财务图表      (依赖交易记录数据)
    └─→ 阶段四: 财务教育功能  (使用交易记录做教育展示)

阶段三: 回合交互重设计  (独立，可并行)
阶段六: 棋盘自适应布局  (独立，可并行)
阶段七: 棋盘内交互      (依赖阶段六的布局基础)
```

## 推荐执行顺序

1. **阶段一**（数据基础设施）— 必须最先做
2. **阶段二**（股票系统）— 核心游戏机制
3. **阶段三**（回合交互）— 体验改进，独立于数据层
4. **阶段六**（棋盘布局）— 布局基础，为阶段七做准备
5. **阶段七**（棋盘内交互）— 最大的 UI 重构
6. **阶段四**（财务教育）— 教育功能增强
7. **阶段五**（财务图表）— 可视化，基于阶段一数据

阶段三和阶段六可并行开发。

---

## Assumptions & Decisions

| 编号 | 决策 | 理由 | 可调整空间 |
|------|------|------|-----------|
| 1 | 图表库使用 Chart.js + vue-chartjs | 轻量、Vue3 兼容好、深色模式易适配 | 可换 ECharts（功能更强但体积大） |
| 2 | 棋盘用 CSS Grid 重构 | 比 absolute 定位更稳定、更易响应式 | — |
| 3 | 学习模式作为可选项 | 不破坏现有老用户的快速游戏体验 | 默认关闭或开启待定 |
| 4 | 股票扩充到 20 张（5种×4价位） | 平衡多样性和牌库大小 | 可调整价位数量 |
| 5 | 棋盘内卡片从格子弹出 | 符合"麻将桌"沉浸感的描述 | 卡片大小和动画可调 |
| 6 | 银行操作仍保留 modal | 银行操作较复杂，棋盘内放不下 | 后续可考虑棋盘内嵌银行面板 |
| 7 | 历史数据存入 localStorage | 与现有存档机制一致 | 量大时可考虑 IndexedDB |

---

## Verification Steps

### 全局验收标准

1. `npm run build` 构建成功
2. `npm run type-check` 类型检查通过
3. 移动端（375px）到桌面端（1920px）各断点布局正常
4. 6 人游戏时所有功能正常
5. 游戏存档/读档功能正常（localStorage）
6. 老鼠赛跑进入快车道的流程不受影响
7. 深色主题下所有文字对比度符合 WCAG AA 标准

### 各阶段验证清单

每个阶段完成后，对应该阶段末尾的验证步骤逐一检查通过。

---

## Files Summary

### 新增文件

| 文件路径 | 用途 |
|----------|------|
| `src/components/TransactionHistory.vue` | 交易记录组件 |
| `src/components/CardHistory.vue` | 卡片历史组件 |
| `src/components/StockQuantitySelector.vue` | 股票数量选择器 |
| `src/components/EducationalBalanceSheet.vue` | 教育式财务报表 |
| `src/components/GameCard.vue` | 通用游戏卡片 |
| `src/components/FinancialCharts.vue` | 图表面板容器 |
| `src/components/charts/AssetAllocationChart.vue` | 资产配置饼图 |
| `src/components/charts/IncomeExpenseChart.vue` | 收支柱状图 |
| `src/components/charts/NetWorthChart.vue` | 净资产折线图 |
| `src/components/charts/StockPerformanceChart.vue` | 股票追踪图 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/types/game.ts` | 新增交易记录、卡片历史、学习模式等类型 |
| `src/stores/game.ts` | 新增历史记录逻辑、股票卖出机会、图表数据计算 |
| `src/data/cards.ts` | 扩充股票机会卡到 20 张，增加 action 字段 |
| `src/views/RatRaceView.vue` | 底部栏重构、面板Tab化、棋盘内交互、教育模式 |
| `src/components/RatRaceBoard.vue` | Grid 重构、中心骰子动画、卡片插槽 |
| `src/components/DiceRoller.vue` | 新增 inline 模式、size prop |
| `src/components/BankModal.vue` | 教育增强、学习模式验证 |
| `src/views/SetupView.vue` | 新增学习模式开关 |
| `src/assets/base.css` | 图表深色主题变量 |
| `package.json` | 新增 chart.js、vue-chartjs 依赖 |
