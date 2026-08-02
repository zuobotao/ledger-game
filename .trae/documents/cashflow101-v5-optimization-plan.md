# Cashflow 101 游戏优化 V5 实施计划

## 概述

本计划针对 Cashflow 101 Web 游戏的 10 项新需求，涵盖 bug 修复、棋盘扩展、破产机制、多人模式增强、目标引导、学习模式等多个方面。

**项目路径**：`/Users/zuoyang/Documents/trae_projects/ledger101/cashflow101.web`
**技术栈**：Vue 3 + Pinia + TypeScript + Tailwind CSS 4 + Lucide icons
**设计主题**：Doubao 暗色主题（背景 `#0e1115`，主色 `#0065fd`，圆角 `19.2px`）

---

## 当前状态分析

### 已完成功能（V1-V4）
- 50 种职业 + 难度分级
- 15 个梦想卡片
- AI 人机对战（仅老鼠圈）
- 股票交易系统（数量自由选择、拆分/合股）
- 交易记录与财务统计图表
- 老鼠圈正方形棋盘 + 中心骰子
- 快车道正方形棋盘（12 格）
- 财务报表教育提示
- 历史故事卡（24 张）
- 慈善保护机制

### 核心架构
- **状态层**：`src/stores/game.ts`（约 1900 行，所有游戏逻辑）
- **类型层**：`src/types/game.ts`
- **数据层**：`src/data/`（棋盘、卡片、职业、梦想）
- **视图层**：`src/views/`（SetupView、RatRaceView、FastTrackView）
- **组件层**：`src/components/`（棋盘、财务报表、图表等）
- **AI 层**：`src/utils/aiDecision.ts`

---

## 需求清单与实施方案

### 需求 1：AI 在资本游戏失效（Bug 修复）

**问题**：`runAITurn()` 只处理 `phase === 'rat_race'`，快车道没有 AI 回合逻辑。

#### 修改文件
1. `src/stores/game.ts`
2. `src/utils/aiDecision.ts`

#### 实现细节

**A. 扩展 `runAITurn()` 支持快车道**
- 移除第 1587 行 `phase.value !== 'rat_race'` 的限制
- 根据阶段调用不同掷骰子函数：`ratRaceRollDice()` / `fastTrackRollDice()`
- 快车道 AI 回合流程：掷骰子 → 处理 pending action → 考虑还款 → 结束回合

**B. `moveToNextPlayer` 快车道 AI 触发**
- 第 584 行条件从 `phase.value === 'rat_race'` 改为 `phase.value === 'rat_race' || phase.value === 'fast_track'`

**C. `aiHandlePendingAction` 新增快车道 case**
- `case 'fast_track_opportunity'`：调用 AI 决策是否买入快车道机会卡
- `case 'fast_track_dream'`：AI 判断现金是否足够购买梦想，足够则买

**D. `aiDecision.ts` 新增函数**
- `decideBuyFastTrackOpportunity(player, card, difficulty)`
  - easy：ROI > 12% 才买，现金不超过 40%
  - medium：ROI > 10%，现金不超过 60%，可适当贷款
  - hard：ROI > 8%，积极使用杠杆
- `decideBuyDream(player, dream, difficulty)`
  - 现金 ≥ 梦想价格 × 缓冲系数才买
  - easy/medium：缓冲 1.5x；hard：缓冲 1.1x

#### 验证
1. 1 人 + 1 AI，手动触发 AI 进入快车道
2. 观察 AI 在快车道自动掷骰子、处理机会卡
3. 验证 AI 现金足够时购买梦想获胜

---

### 需求 2：丰富资本游戏棋盘

**问题**：当前快车道只有 12 格（5x5 网格外围），格子类型只有 5 种。

#### 修改文件
1. `src/types/game.ts` — 新增格子类型
2. `src/data/board.ts` — 扩展 `FAST_TRACK_CELLS`
3. `src/components/FastTrackBoard.vue` — 调整为 6x6 网格
4. `src/stores/game.ts` — 新格子类型处理逻辑
5. `src/data/cards.ts` — 新增快车道相关卡片

#### 实现细节

**A. 新增格子类型**
```typescript
type FastTrackCellType = 
  | 'cashflow'       // 现金流日（已有）
  | 'opportunity'    // 大机会（已有）
  | 'investment'     // 投资（已有）
  | 'doodad'         // 生活意外（已有）
  | 'dream'          // 梦想（已有）
  | 'market'         // 市场风云（新增）
  | 'charity'        // 慈善（新增）
  | 'random_event'   // 随机事件（新增）
  | 'big_deal'       // 特大交易（新增）
  | 'tax_audit'      // 税务审计（新增）
```

**B. 扩展到 20 格（6x6 外围）**
- 6x6 外围 = (6-1) × 4 = 20 格
- 格子分布：
  - 现金流日：4 格
  - 大机会：3 格
  - 投资：3 格
  - 市场风云：2 格
  - 生活意外：2 格
  - 慈善：1 格
  - 随机事件：2 格
  - 特大交易：1 格
  - 税务审计：1 格
  - 梦想：1 格
  - **合计：20 格**

**C. 新格子效果**

| 格子 | 效果 |
|------|------|
| 市场风云 | 抽取快车道市场卡，资产价格波动，可卖出 |
| 慈善 | 捐赠总资产 1%，获得下次双骰机会 |
| 随机事件 | 抽取随机事件卡（好/坏事，金额较大） |
| 特大交易 | 抽取特大交易卡（高投入高现金流） |
| 税务审计 | 补缴税款 = 年现金流 × 20% |

**D. 棋盘组件调整**
- Grid 从 5x5 改为 6x6
- `getCellGridArea()` 重新计算 20 格位置
- 新增格子类型的图标和颜色映射
- `FAST_TRACK_BOARD_SIZE` 常量更新为 20

**E. 新增卡片数据**
- 快车道市场卡（更大幅度波动）
- 快车道随机事件卡（10-15 张）
- 特大交易卡（5-8 张大型投资）

#### 验证
1. 进入快车道，确认 20 格布局正确
2. 每种新格子至少踩到一次，验证效果
3. 棋盘美观，无重叠

---

### 需求 3：破产机制

**问题**：玩家可以无限贷款，缺乏失败惩罚。

#### 修改文件
1. `src/types/game.ts` — 新增破产类型和状态
2. `src/stores/game.ts` — 破产判定与处理逻辑
3. `src/views/GameOverView.vue` — 扩展支持破产结算
4. `src/components/FinancialStatement.vue` — 破产警告提示

#### 实现细节

**A. 破产触发条件**
当玩家需支付一笔费用且：
1. 现金不足以支付
2. 已达银行贷款上限
3. 没有可出售的资产（或全部出售后仍不够）

触发检查时机：
- `requireLoanForPayment` 失败且无法再贷款时
- 发工资日现金流为负且现金耗尽时

**B. 破产处理流程**
1. 弹出破产确认对话框
2. 玩家选择：
   - **变卖所有资产**：自动按市价出售全部资产还债
   - **宣布破产**：退出游戏（变为观战者）
3. 变卖后仍有债务缺口 → 强制破产

**C. 玩家状态扩展**
- `Player.isBankrupt: boolean`
- 破产玩家 `moveToNextPlayer` 自动跳过
- 破产玩家可查看其他玩家（观战模式）
- 所有玩家破产 → 游戏结束

**D. 破产警告 UI**
- 现金 < 月支出 → 财务面板橙色警告
- 现金 < 0 且有贷款 → 红色"高破产风险"徽章

#### 验证
1. 故意高杠杆 + 连续 doodad，验证破产触发
2. 变卖资产后可避免破产
3. 破产玩家被跳过回合
4. 多人模式下破产玩家仍可观战

---

### 需求 4：多人模式玩家切换器

**问题**：左侧面板只显示当前回合玩家，无法查看其他人。

#### 修改文件
1. `src/views/RatRaceView.vue` — 添加玩家切换器
2. `src/views/FastTrackView.vue` — 添加玩家切换器
3. 新建 `src/components/PlayerSwitcher.vue` — 切换器组件

#### 实现细节

**A. PlayerSwitcher 组件**
- 水平排列的圆形头像列表（颜色标识）
- 当前回合玩家：高亮边框 + "回合中"徽章
- AI 玩家：Bot 图标叠加
- 破产玩家：灰色 + 半透明
- 点击切换查看的玩家

**B. 视图层改造**
- 新增 `viewedPlayerId` ref
- 计算属性 `viewedPlayer` → 根据 ID 查找玩家
- 所有财务展示数据使用 `viewedPlayer`
- 操作按钮（掷骰子、买入等）仍只对 `currentPlayer` 可用
- 查看他人时操作按钮禁用并显示"查看模式"

**C. 自动切换逻辑**
- 当前回合玩家变化时，若之前在看自己，自动切到新当前玩家
- 若正在看别人，保持当前查看对象

#### 验证
1. 3 人游戏，点击不同头像确认数据切换
2. 当前回合玩家有明显标识
3. 查看他人时操作按钮禁用
4. AI 和破产玩家状态正确显示

---

### 需求 5：多人股票机会规则

**问题**：小机会股票卡只有抽卡玩家能操作，持有该股票的其他玩家不能卖出。

#### 修改文件
1. `src/types/game.ts` — 新增 `StockOpportunityState`
2. `src/stores/game.ts` — 多玩家轮询逻辑
3. `src/views/RatRaceView.vue` — UI 显示
4. `src/utils/aiDecision.ts` — AI 卖出决策（复用）

#### 实现细节

**A. 新增状态结构**
```typescript
interface StockOpportunityState {
  card: OpportunityCard
  drawerIndex: number       // 抽卡玩家索引
  responderIndex: number    // 当前回应玩家索引
  respondedIds: string[]    // 已回应玩家ID
  phase: 'drawer_buy' | 'other_sell' | 'done'
}
```

**B. 流程改造**
1. 玩家抽到小机会股票买入卡
2. `drawer_buy` 阶段：抽卡玩家决定是否买入
3. 买入完成后 → `other_sell` 阶段
4. 轮询所有**持有该股票**的其他玩家，每人决定是否卖出
5. 全部处理完 → `done` → 清除

**C. 卖出价格**
- 其他玩家卖出价 = 卡上显示的买入价（市场收购价）

**D. AI 决策**
- 复用 `AIDecision.decideSellMarket` 逻辑
- AI 玩家持有该股票时自动决策是否卖出

**E. UI 展示**
- 股票机会卡显示"其他持有玩家可卖出"提示
- 显示当前回应玩家名称
- 非抽卡玩家但持有股票时显示卖出操作区

#### 验证
1. 2 人游戏，玩家 A 持股，玩家 B 抽到该股票买入卡
2. 验证玩家 A 可以选择卖出
3. AI 玩家自动决策
4. 只有持股玩家才需要回应

---

### 需求 6：跨阶段观战

**问题**：部分玩家进入资本游戏后，其他人无法查看快车道状态。

#### 修改文件
1. `src/stores/game.ts` — 新增观看阶段状态
2. `src/views/RatRaceView.vue` — 阶段切换入口
3. `src/views/FastTrackView.vue` — 阶段切换入口

#### 实现细节

**A. 设计方案**
- 两个独立路由视图，通过跳转切换
- 新增 `viewingPhase` 状态（'rat_race' | 'fast_track'）
- 路由跳转时通过 query 传递 `viewPlayerId`

**B. 顶部栏阶段切换器**
- 显示"原始积累"和"资本游戏"两个 Tab
- 当前游戏阶段的 Tab 高亮
- 有玩家在的阶段才可点击
- 另一个阶段显示玩家数量提示

**C. 切换逻辑**
- 点击阶段 Tab → 路由跳转 + 保留 `viewedPlayerId`
- 进入另一阶段视图时，默认查看该阶段的第一个玩家
- 通过玩家切换器可查看该阶段所有玩家

**D. 当前回合提示**
- 观看另一阶段时，顶部显示"当前回合：玩家 X（原始积累阶段）"
- 明确告知用户当前操作在哪边进行

#### 验证
1. 2 人游戏，玩家 1 进入快车道，玩家 2 仍在老鼠圈
2. 老鼠圈视图点击"查看资本游戏" → 跳转成功
3. 快车道视图可查看玩家 1 状态
4. 知道当前回合是玩家 2（在老鼠圈）
5. 可返回老鼠圈继续操作

---

### 需求 7：游戏目的性引导

**问题**：游戏目标不明确，玩家不知道为什么要玩。

#### 修改文件
1. `src/views/RatRaceView.vue` — 老鼠圈目标进度
2. `src/views/FastTrackView.vue` — 快车道目标进度
3. 新建 `src/components/GoalProgress.vue` — 目标进度组件

#### 实现细节

**A. 老鼠圈目标**
- 目标：被动收入 ≥ 总支出 → 进入资本游戏
- 进度条：`被动收入 / 总支出 × 100%`
- 显示：`被动收入 $X / 目标 $Y（ZZ%）`
- 位置：顶部栏下方，显眼的横向进度条
- 颜色：未达标橙色，达标绿色 + 脉冲动画

**B. 快车道目标（双目标）**
1. 购买梦想：`当前现金 / 梦想价格`
2. 达成百万净资产：`净资产 / 1,000,000`
- 哪个进度高突出显示哪个
- 显示预计回合数估算

**C. 里程碑庆祝**
- 被动收入达到 25%、50%、75%、100% 时弹出短暂庆祝提示
- 用 toast 形式，2 秒后自动消失

**D. GoalProgress 组件设计**
```
┌─────────────────────────────────────┐
│ 🎯 进入资本游戏            45%      │
│ ████████████░░░░░░░░░░░░░░░         │
│ 被动收入 $1,200 / 目标 $2,650       │
└─────────────────────────────────────┘
```

#### 验证
1. 新游戏显示 0% 进度
2. 购买资产后进度实时更新
3. 达标后变绿 + "可进入资本游戏"提示
4. 快车道显示双目标进度
5. 里程碑时有庆祝提示

---

### 需求 8：学习模式

**问题**：新手不理解游戏规则和财商概念，需要 AI 引导。

#### 修改文件
1. `src/types/game.ts` — 学习模式类型
2. 新建 `src/data/mentorTips.ts` — 导师知识库
3. `src/stores/game.ts` — 学习模式状态
4. `src/views/SetupView.vue` — 学习模式开关
5. 新建 `src/components/MentorPanel.vue` — 导师面板

#### 实现细节

**A. 学习模式开关**
- SetupView 新增"学习模式"开关
- 开启后显示导师面板

**B. 导师建议触发时机**
1. 机会卡出现：分析是否值得买 + 财商解释
2. 市场事件：解释波动含义 + 操作建议
3. 发工资：提醒检查现金流
4. 贷款时：杠杆风险警告
5. 接近目标：策略建议
6. 破产风险：警告 + 建议

**C. 建议内容结构**
```typescript
interface MentorAdvice {
  id: string
  category: 'opportunity' | 'market' | 'cashflow' | 'risk' | 'goal'
  title: string
  suggestion: string      // 具体操作建议
  reasoning: string       // 财商教育解释
  concept: string         // 关联财商概念名
  confidence: 'high' | 'medium' | 'low'
}
```

**D. MentorPanel 组件**
- 右侧浮动面板（可折叠）
- 导师头像 + "财商导师"名称
- 当前建议：简洁的操作建议
- "为什么？"展开按钮 → 显示详细解释 + 财商概念
- "采纳建议"按钮（自动执行）
- "忽略"按钮

**E. 导师决策逻辑**
- 复用 `AIDecision` 的决策函数
- 输出建议而非自动执行
- 附加解释性文字（ROI 计算、风险评估等）

**F. 财商知识库**
- 资产 vs 负债
- 被动收入 vs 主动收入
- 现金流象限
- ROI 计算
- 杠杆的双刃剑
- 市场周期
- 分散投资
- 风险管理

#### 验证
1. 开启学习模式，导师面板出现
2. 抽到机会卡 → 显示买入建议
3. 点击"为什么" → 展开财商解释
4. 市场事件 → 显示卖出/持有建议
5. 可采纳或忽略建议
6. 关闭学习模式后面板消失

---

### 需求 9：大小机会格子分离

**问题**：老鼠圈机会格不区分大小，抽卡随机。

#### 修改文件
1. `src/types/game.ts` — 新增格子类型
2. `src/data/board.ts` — 区分大小机会格
3. `src/stores/game.ts` — 按格子类型抽不同卡
4. `src/components/RatRaceBoard.vue` — 不同视觉样式
5. `src/data/cards.ts` — 分离大小机会卡池

#### 实现细节

**A. 类型扩展**
```typescript
type RatRaceCellType =
  | 'small_opportunity'  // 小机会（新增）
  | 'big_opportunity'    // 大机会（新增）
  // 其他不变
```

**B. 棋盘重新分配**
当前 24 格中 12 格是机会。重新分配：
- 小机会：8 格（绿色）
- 大机会：4 格（金色/深绿）
- 其他格子数量不变

**C. 抽卡逻辑改造**
- `CardDeck` 分离 `smallOpportunity` 和 `bigOpportunity` 牌堆
- 踩到小机会 → `drawSmallOpportunityCard()`
- 踩到大机会 → `drawBigOpportunityCard()`
- 卡片数据已有 `size: 'small' | 'big'` 字段，只需分离卡池

**D. 棋盘视觉区分**
- 小机会格：浅绿色背景 + "小"标签
- 大机会格：金色边框 + "大"标签 + 微闪光效果
- 图标也不同（小机会用 TrendingUp，大机会用 Gem）

#### 验证
1. 棋盘上大小机会格视觉不同
2. 踩小机会只出小机会卡
3. 踩大机会只出大机会卡
4. 概率分布合理

---

### 需求 10：图表节点悬停提示

**问题**：财务统计图表的数据点悬停不显示具体数值。

#### 修改文件
1. `src/components/FinancialCharts.vue`

#### 实现细节

**A. 折线图 tooltip**
- 新增 `hoveredPointIndex: number | null`
- 每个数据点 circle 添加 `mouseenter/mouseleave`
- 显示 HTML tooltip（样式灵活）

**B. Tooltip 内容**
- 第 X 回合
- 净资产：$XXX
- 总资产：$XXX
- 月现金流：$XXX

**C. 定位方式**
- 使用相对定位的 div
- 根据悬停点 x 坐标定位
- 超出右边界时自动左对齐
- y 坐标固定在图表顶部

**D. 柱状图 tooltip（同步增强）**
- 悬停柱子时显示收入和支出具体金额
- 保持体验一致

#### 验证
1. 鼠标悬停数据点 → tooltip 出现
2. 数值正确对应回合计
3. 位置正确，不超出边界
4. 移开后消失

---

## 实施顺序

### 第一阶段：快速修复（低风险独立）
1. 需求 10：图表 tooltip — 最小改动，纯 UI
2. 需求 1：AI 快车道 bug — 核心逻辑修复
3. 需求 9：大小机会分离 — 数据 + 小改动

### 第二阶段：核心增强
4. 需求 2：丰富快车道棋盘 — 依赖需求 1（AI 需处理新格子）
5. 需求 7：目标引导 — 纯 UI，独立
6. 需求 4：玩家切换器 — 多人模式基础

### 第三阶段：复杂功能
7. 需求 5：股票机会多人规则 — 依赖需求 4 UI 模式
8. 需求 6：跨阶段观战 — 依赖需求 4 玩家切换
9. 需求 3：破产机制 — 影响面大，独立但风险高

### 第四阶段：学习模式
10. 需求 8：学习模式 — 最大功能，内容最多

---

## 验证策略

### 每个功能完成后
1. 功能验证：所有场景测试通过
2. 回归验证：不影响已有功能
3. 类型检查：`npx vue-tsc --noEmit`
4. Git 提交：独立 commit，清晰描述

### 全部完成后
1. 端到端流程：设置 → 老鼠圈 → 快车道 → 获胜/破产
2. 多人验证：3-4 人混合 AI 和人类
3. 学习模式验证：开启学习模式完成一局
4. 响应式验证：桌面和移动端布局

---

## 约束与规范

1. **Doubao 暗色主题**：所有新组件遵循 `#0e1115` 背景、`#0065fd` 主色、`19.2px` 圆角
2. **本地热座模式**：不涉及网络通信
3. **TypeScript 严格类型**：避免 `any`，所有新增功能有完整类型
4. **独立 Git 提交**：每个功能一个 commit，message 格式：`feat(scope): 描述` / `fix(scope): 描述`
