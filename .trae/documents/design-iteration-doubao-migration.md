# Cashflow 101 设计稿迭代计划 — 豆包设计系统迁移 + 三页面扩展

> 状态：规划中  
> 范围：设计原型 + PRD + 需求跟踪矩阵 + 前端代码同步  
> 设计系统：苹果 → 豆包（深色模式优先）

---

## 一、迭代目标与范围

**目标结果**：将现有 5 页面原型从苹果设计系统完整迁移到豆包设计系统（深色模式），新增规则页、胜利结算页、银行弹窗三个关键页面/状态，同步更新 PRD、需求跟踪矩阵和代码实现。

**成功标准**：
1. 所有 8 个页面/状态在豆包设计系统下视觉一致，通过原型质量验证
2. PRD 与需求跟踪矩阵完整覆盖新增需求（FR-026 ~ FR-041）
3. 代码项目与设计原型 token 对齐，页面风格统一
4. 深色模式（`#0e1115` 背景）作为默认主题

**关键约束**：
- 豆包设计系统为深色优先，原型 `themeMode` 设为 `dark`
- 豆包按钮有 primary/secondary/ghost/destructive 四种变体
- 豆包系统使用单一主色蓝 `#0065fd`，棋盘格子的多彩色需基于主色 + 语义色（success/destructive）通过 `color-mix` 派生
- 圆角统一为 `19.2px`（即 `--radius`）
- 字体更换为 Stack Sans Text
- 豆包 shadow token 透明度为 0，elevation 效果使用 border + background 色差替代

**非目标（Out of Scope）**：
- 不新增游戏玩法机制（如 AI 玩家、网络对战、音效动画）
- 不改变游戏核心数值平衡
- 不重构 store 层数据结构
- 不引入新的第三方依赖库

---

## 二、设计系统迁移方案

### 2.1 Token 替换清单

| 类别 | 苹果系统（旧） | 豆包系统（新） | 说明 |
|------|---------------|---------------|------|
| 前缀 | `--apple-*` | `--doubao-*` | 所有消费别名前缀变更 |
| 主色 | `#007aff` | `#0065fd` | 品牌蓝更冷更深 |
| 背景（暗） | `#000000` | `#0e1115` | 深灰黑，非纯黑 |
| 前景文字（暗） | `#f5f5f7` | `#eff1f4` | 浅灰白 |
| Card（暗） | `#1c1c1e` | `#0e1115` | 与背景同色，靠边框区分 |
| Muted（暗） | `#1c1c1e` | `#161a20` | 略深于背景的面 |
| Secondary（暗） | `#1c1c1e` | `#22252a` | 次级表面 |
| Accent（暗） | `#3a3a3c` | `#00266b` | 深蓝强调色 |
| 边框（暗） | `#3a3a3c` | `#333942` | 细边框分隔 |
| Ring/Focus | `#2e8dff` | `#00266b` | 聚焦环为深蓝 |
| 字体 | DM Sans | Stack Sans Text | 无衬线字体 |
| 基础圆角 | 19.2px | 19.2px | 保持一致 |
| 间距单位 | 0.24rem | 3.84px（0.24rem） | 保持一致 |

### 2.2 组件映射策略

| 当前用法 | 豆包对应 | 实现方式 |
|---------|---------|---------|
| `bg-primary` 主按钮 | `primary` | 直接映射 |
| `bg-secondary` 次按钮 | `ghost`（推荐） | 豆包 secondary 语义不同，用 ghost 替代次级操作 |
| Ghost/文字按钮 | `ghost` | 直接映射 |
| 危险操作 | `destructive` | 直接映射 |
| `bg-card` 卡片 | `bg-doubao-card` | 直接映射（暗模式下 = #0e1115 + 边框） |
| `bg-muted` 静音面 | `bg-doubao-muted` | 直接映射 |
| 输入框 | Search Input 组件风格 | 参考 search-input 的 border + focus ring |
| 表格/数据展示 | Data Table 组件 | 参考 data-table 的表头、行分隔样式 |
| 侧边栏导航 | Sidebar Nav 组件 | 规则页左侧目录使用 |

### 2.3 棋盘格子颜色派生方案

基于豆包 token，用 `color-mix` 从基础 token 派生 7 种棋盘格子色，保持在同一色系内不引入新品牌色：

```css
.space-green  { --space-accent: var(--doubao-success, #34c759); }     /* 机会 - 绿色语义 */
.space-red    { --space-accent: var(--doubao-destructive, #ef4444); } /* 负债 - 红色语义 */
.space-blue   { --space-accent: var(--doubao-primary, #0065fd); }     /* 市场风云 - 主色 */
.space-gold   { --space-accent: color-mix(in srgb, var(--doubao-primary) 30%, var(--doubao-destructive) 70%); } /* 慈善 */
.space-yellow { --space-accent: color-mix(in srgb, var(--doubao-primary) 50%, var(--doubao-success) 50%); }     /* 发工资 */
.space-teal   { --space-accent: color-mix(in srgb, var(--doubao-primary) 60%, var(--doubao-success) 40%); }     /* 孩子 */
.space-purple { --space-accent: color-mix(in srgb, var(--doubao-primary) 60%, var(--doubao-destructive) 40%); } /* 裁员 */
```

### 2.4 迁移步骤（有序）

**第 1 步：基础资产与配置切换**
- 用豆包 `colors_and_type.css` 覆盖原型根目录的同名文件
- 复制豆包 `assets/icons/` 全部 SVG 到原型 `assets/icons/dl_builtin_doubao/`
- 更新 `.design` 配置：
  - `config.designLibrary.name` → `"豆包"`
  - `config.designLibrary.id` → `"dl_builtin_doubao"`
  - `config.designLibrary.path` → 豆包库路径
  - `config.designLibrary.prefix` → `"doubao"`
  - `config.themeMode` → `"dark"`

**第 2 步：全局 Token 前缀替换**
- 每个页面 HTML 中 `<style id="theme-vars">` 块整体替换为豆包 token 定义
- `@theme inline` 块中所有 `--apple-*` 引用替换为 `--doubao-*`
- `#semantic-token-fallback` 中所有 `--apple-*` 替换为 `--doubao-*`
- `<html class="light">` 改为 `<html class="dark">`

**第 3 步：页面级样式调整（优先级排序）**

1. **首页（home.html）**：
   - "开始游戏"按钮保持 primary 变体
   - "游戏规则"按钮从 ghost text 改为豆包 `ghost` 样式
   - 标题文字颜色、描述文字颜色自动适配 dark 模式

2. **设置页（setup.html）**：
   - 玩家卡片：从 `bg-card` + border 迁移，豆包暗模式 card 与背景同色靠边框区分
   - 下拉选择框：参考 search-input 的 border + focus 样式
   - 开关（可选规则）：保持自定义，用主色 + 边框风格

3. **老鼠赛跑棋盘（ratrace.html）**：
   - 顶部栏、底部操作栏：`bg-secondary/50` → `bg-doubao-secondary/50`
   - 左侧财务报表面板：卡片样式调整为豆包 app-card 风格
   - 棋盘格子：应用 color-mix 派生色
   - 底部按钮：primary（掷骰子）、ghost（贷款）、ghost text（结束回合）

4. **机会卡片（card.html）**：
   - 卡片弹窗：`rounded-[var(--radius)]` 迁移，豆包 radius=19.2px 一致
   - 底部操作按钮：primary（买入）、ghost（卖出）、ghost text（放弃）

5. **快车道（fasttrack.html）**：
   - 轨道格子：复用棋盘 color-mix 方案
   - 梦想卡片：使用 accent 变体（`bg-accent text-accent-foreground`）
   - 胜利覆盖层：使用 success 语义色

---

## 三、新增页面详细设计方案

### 3.1 游戏规则说明页（Rules）

**页面定位**：从首页"游戏规则"按钮进入，完整介绍游戏玩法。

**页面 ID**：`page-rules`  
**文件**：`pages/rules.html`  
**画布位置**：`x: 620, y: 377`（设置页下方，与快车道对齐）

**页面结构**：
```
┌──────────────────────────────────────────────────┐
│  ← 返回首页           游戏规则说明             │ 顶部栏
├──────────────────────────────────────────────────┤
│  ┌─ 左侧导航（sticky） ─┐  ┌─ 右侧内容区 ──────┐ │
│  │  游戏简介            │  │                    │ │
│  │  ▸ 老鼠赛跑规则      │  │  章节标题 + 内容   │ │
│  │    胜利条件          │  │                    │ │
│  │    回合流程          │  │  数据表格 / 列表   │ │
│  │    格子类型          │  │                    │ │
│  │    财务模型          │  │  图示 / 示意      │ │
│  │  快车道规则          │  │                    │ │
│  │  贷款与银行          │  │  上一章 / 下一章   │ │
│  │  可选规则            │  │                    │ │
│  └──────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**内容分区**：

| 分区 | 内容要点 | 交互 |
|------|---------|------|
| 游戏简介 | 游戏背景、目标、适用人群 | 静态 |
| 老鼠赛跑 - 胜利条件 | 被动收入 ≥ 总支出 | 静态 + 公式高亮 |
| 老鼠赛跑 - 回合流程 | 掷骰子 → 触发事件 → 操作 → 结束回合 | 步骤编号列表 |
| 老鼠赛跑 - 格子类型 | 7 种格子：机会/负债/发工资/市场风云/孩子/慈善/裁员 | 彩色圆点 + 文字表格 |
| 老鼠赛跑 - 财务模型 | 收入/支出/资产/负债/现金流计算公式 | data-table 组件风格 |
| 快车道规则 | 进入条件、轨道格子、梦想购买 | 静态 + 轨道示意 |
| 贷款与银行 | 贷款额度、利息、还款方式 | 与银行弹窗联动 |
| 可选规则 | 保险/大家庭/抵押贷款/速开 四种规则说明 | 开关式列表 |

**设计决策**：
- 使用豆包 `sidebar-nav` 组件作为左侧章节目录
- 内容区标题使用 `text-2xl font-semibold`，正文 `text-sm` 行高 1.6
- 财务数据使用豆包 `data-table` 组件风格呈现
- 顶部返回按钮：ghost 样式 + 左箭头图标

**交互链接**：
- 首页 `btn-rules` → navigate → `page-rules`
- `btn-rules-back` → navigate → `page-home`
- `btn-rules-start` → navigate → `page-setup`

### 3.2 胜利结算页（Victory）

**页面定位**：游戏结束时展示获胜玩家、梦想、最终财务报表。

**页面 ID**：`page-victory`  
**文件**：`pages/victory.html`  
**画布位置**：`x: 1240, y: 377`（老鼠赛跑下方）

**页面结构**：
```
┌──────────────────────────────────────────────────┐
│                                                    │
│          ★  胜利！  ★                              │
│                                                    │
│    ┌─────────────────────────────────────┐        │
│    │  🏆 玩家 1 实现了财务自由！          │        │
│    │                                      │        │
│    │  梦想：环球旅行                      │        │
│    │  花费：$50,000                       │        │
│    └─────────────────────────────────────┘        │
│                                                    │
│  ┌─ 最终财务报表 ───────────────────────────────┐ │
│  │  总收入        $XX,XXX   总支出   $XX,XXX    │ │
│  │  被动收入      $XX,XXX   资产数量  X 项      │ │
│  │  月现金流      $XX,XXX   负债数量  X 项      │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  ┌─ 玩家排行榜 ─────────────────────────────────┐ │
│  │  #1  玩家 1  🎉  梦想达成                    │ │
│  │  #2  玩家 2      $XX,XXX 现金                │ │
│  │  #3  玩家 3      $XX,XXX 现金                │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  [ 再来一局 ]   [ 回到首页 ]                       │
│                                                    │
└──────────────────────────────────────────────────┘
```

**模块详情**：

| 模块 | 内容 | 组件风格 |
|------|------|---------|
| 胜利标题 | "玩家 X 获胜！" + 庆祝图标 | 大号文字 + 主色渐变图标背景 |
| 梦想卡片 | 梦想名称、描述、购买价格 | accent card 风格（豆包 accent 色） |
| 最终财务概览 | 总收入/总支出/被动收入/月现金流/现金/资产数/负债数 | 2 列 data-grid，app-card 样式 |
| 玩家排名 | 所有玩家按现金+资产总值排序 | data-table 风格，第一名高亮 |
| 操作按钮 | "再来一局"（primary）、"回到首页"（ghost） | 豆包 button 组件 |

**设计决策**：
- 胜利标题使用 success 绿色语义色作为强调
- 梦想卡片使用豆包 accent 色（深蓝背景 + 浅蓝文字）
- 获胜玩家行使用 `bg-accent/30` 高亮

**交互链接**：
- 快车道页 `btn-buy-dream` → navigate → `page-victory`
- `btn-play-again` → navigate → `page-setup`
- `btn-back-home` → navigate → `page-home`

### 3.3 银行操作弹窗（Bank Modal）

**页面定位**：从棋盘底部"贷款"按钮触发的覆盖层（overlay），包含贷款申请、还款、负债详情三个 Tab。

**页面 ID**：`page-bank`  
**文件**：`pages/bank.html`  
**类型**：overlay（从老鼠赛跑页 `btn-loan` 触发）  
**画布位置**：`x: 1860, y: 754`（机会卡片下方）

**页面结构**：
```
┌──────────────────────────────────────────────────┐
│  银行操作                              [× 关闭]  │
├──────────────────────────────────────────────────┤
│  [ 贷款申请 ]  [ 还款 ]  [ 负债详情 ]             │  Tab 切换
├──────────────────────────────────────────────────┤
│                                                    │
│  Tab 1 - 贷款申请：                                │
│  ┌──────────────────────────────────────────────┐ │
│  │  可贷额度：$132,000（总收入的 10 倍）         │ │
│  │                                              │ │
│  │  贷款金额                                    │ │
│  │  [ $10,000  ]  -  +                          │ │
│  │  步进：$1,000                                │ │
│  │                                              │ │
│  │  月还款额：$1,000（10% 利息）                 │ │
│  └──────────────────────────────────────────────┘ │
│  [ 取消 ]                      [ 确认贷款 ]       │
│                                                    │
│  Tab 2 - 还款：                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  银行贷款 $20,000                            │ │
│  │  月还 $2,000                                 │ │
│  │  [ 还 $5,000  ]  [ 全部还清 ]                │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Tab 3 - 负债详情：                                │
│  ┌──────────────────────────────────────────────┐ │
│  │  类型        总额       月还       操作      │ │
│  │  房屋贷款   $228,000   $1,900    [还清]     │ │
│  │  学生贷款    $45,000     $750    [还清]     │ │
│  │  汽车贷款    $22,200     $370    [还清]     │ │
│  │  信用卡       $4,080     $170    [还清]     │ │
│  │  银行贷款    $20,000   $2,000    [还款]     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└──────────────────────────────────────────────────┘
```

**Tab 详情**：

| Tab | 内容 | 交互 |
|-----|------|------|
| 贷款申请 | 可贷额度、金额步进器、月还款额预览、确认按钮 | 金额增减 → 实时计算月还 |
| 还款 | 当前银行贷款列表、部分还款、全部还清 | 输入金额 → 校验现金是否充足 |
| 负债详情 | 所有负债完整列表（房贷/学贷/车贷/信用卡/银行贷） | 非银行贷款可"还清"，银行贷款可"还款" |

**设计决策**：
- 使用 overlay 类型（与机会卡片相同），浮在老鼠赛跑棋盘之上
- Tab 切换使用豆包 ghost button 组样式
- 数据表格参考 data-table 组件
- 金额输入框参考 search-input 的 border + focus 风格

**交互链接**：
- 老鼠赛跑页 `btn-loan` → overlay → `page-bank`
- `btn-bank-close` → close overlay

---

## 四、PRD 更新内容

### 4.1 版本号变更
- 从 `v1.3` 升级到 `v1.4`
- 状态："设计系统迁移 + 新增三页面，进入开发同步阶段"

### 4.2 新增功能需求

**5.6 游戏规则页（Rules）**
- FR-026：展示完整游戏规则，包含老鼠赛跑与快车道两大部分
- FR-027：左侧章节目录导航，支持点击跳转
- FR-028：格子类型说明（7 种格子的颜色与功能对照表）
- FR-029：财务模型公式说明（收入、支出、现金流、资产、负债）
- FR-030：贷款规则说明（额度、利息、还款方式）
- FR-031：可选规则说明（保险/大家庭/抵押贷款/速开）
- FR-032：提供"开始游戏"和"返回首页"入口

**5.7 胜利结算页（Victory）**
- FR-033：展示获胜玩家姓名与实现的梦想
- FR-034：展示获胜玩家最终财务报表（总收入、被动收入、现金流、资产、负债）
- FR-035：展示所有玩家排名（按现金+资产总值排序）
- FR-036：提供"再来一局"和"回到首页"操作

**5.8 银行操作弹窗（Bank Modal）**
- FR-037：贷款申请 Tab：显示可贷额度、金额选择、月还款预览、确认贷款
- FR-038：还款 Tab：显示银行贷款列表、部分还款、全部还清
- FR-039：负债详情 Tab：展示所有负债类型及金额，支持非银行贷款一次性还清
- FR-040：Tab 切换（贷款/还款/负债详情）
- FR-041：操作后实时更新财务报表

### 4.3 非功能需求更新

**NFR-003 更新**：
- 原文：`样式使用 Tailwind CSS，遵循苹果设计系统（原型已验证）`
- 更新：`样式使用 Tailwind CSS 4，遵循豆包设计系统（深色模式优先，主色 #0065fd）`

**NFR-008（新增）**：设计系统使用豆包设计库，Token 前缀 `--doubao-*`，默认深色模式。

### 4.4 页面与路由映射更新

| 路由 | 页面 | 说明 |
|------|------|------|
| `/rules` | Rules | 游戏规则说明 |
| `/victory` | Victory | 胜利结算 |
| （弹窗） | BankModal | 银行操作弹窗（组件级，无独立路由） |

---

## 五、需求跟踪矩阵更新

### 5.1 新增需求条目

| 需求 ID | 需求描述 | 优先级 | 状态 | 实现文件 | 备注 |
|---------|---------|--------|------|---------|------|
| FR-026 | 规则页展示完整游戏规则 | 中 | 待实现 | `src/views/RulesView.vue` | 新增页面 |
| FR-027 | 左侧章节目录导航 | 低 | 待实现 | `src/views/RulesView.vue` | sidebar-nav 风格 |
| FR-028 | 格子类型说明对照表 | 中 | 待实现 | `src/views/RulesView.vue` | data-table 风格 |
| FR-029 | 财务模型公式说明 | 中 | 待实现 | `src/views/RulesView.vue` | - |
| FR-030 | 贷款规则说明 | 中 | 待实现 | `src/views/RulesView.vue` | 与银行弹窗联动 |
| FR-031 | 可选规则说明 | 低 | 待实现 | `src/views/RulesView.vue` | - |
| FR-032 | 规则页提供开始游戏和返回首页 | 低 | 待实现 | `src/views/RulesView.vue` | - |
| FR-033 | 胜利页展示获胜玩家与梦想 | 高 | 待实现 | `src/views/VictoryView.vue` | 游戏结束必经 |
| FR-034 | 胜利页展示最终财务报表 | 中 | 待实现 | `src/views/VictoryView.vue` | app-card 风格 |
| FR-035 | 胜利页展示所有玩家排名 | 中 | 待实现 | `src/views/VictoryView.vue` | data-table 风格 |
| FR-036 | 胜利页提供再来一局和返回首页 | 高 | 待实现 | `src/views/VictoryView.vue` | - |
| FR-037 | 银行弹窗-贷款申请 Tab | 高 | 已完成（需 UI 升级） | `src/views/RatRaceView.vue` | 现有逻辑需优化 UI |
| FR-038 | 银行弹窗-还款 Tab | 中 | 已完成（需 UI 升级） | `src/views/RatRaceView.vue` | 现有内联还款需整合 |
| FR-039 | 银行弹窗-负债详情 Tab | 中 | 待实现 | `src/views/RatRaceView.vue` | 新增 Tab |
| FR-040 | 银行弹窗 Tab 切换 | 中 | 待实现 | `src/views/RatRaceView.vue` | - |
| FR-041 | 银行操作后实时更新财务报表 | 高 | 已完成 | `src/stores/game.ts` | 逻辑已实现 |
| NFR-008 | 使用豆包设计系统，深色模式优先 | 高 | 待实现 | `src/assets/base.css` | 设计系统迁移 |

### 5.2 需求变更记录新增行

| 日期 | 版本 | 变更内容 | 变更人 | 审批状态 |
|------|------|---------|--------|---------|
| 2026-08-02 | v1.4 | 设计系统迁移至豆包（深色模式）；新增规则页、胜利结算页、银行弹窗三页面；新增 FR-026 ~ FR-041 及 NFR-008 | Trae Design | 待审批 |

---

## 六、代码同步修改范围

### 6.1 Token 层 — `src/assets/base.css`

- 替换所有颜色 token 为豆包系统值
- 新增 `.dark` 类为默认（html 默认加 dark 类）
- 更新字体为 Stack Sans Text
- 保持 radius 19.2px 不变
- 新增 success 语义色

### 6.2 路由层 — `src/router/index.ts`

新增两条路由：
- `/rules` → `RulesView.vue`
- `/victory` → `VictoryView.vue`

### 6.3 视图层

| 文件 | 改动类型 | 改动范围 |
|------|---------|---------|
| `src/views/HomeView.vue` | 修改 | Token 适配 + "游戏规则"按钮链接到 /rules |
| `src/views/SetupView.vue` | 修改 | Token 适配 + 输入框/卡片样式调整为豆包风格 |
| `src/views/RatRaceView.vue` | 重大修改 | Token 适配 + 银行弹窗重构为三 Tab 模式 + 棋盘颜色派生 |
| `src/views/FastTrackView.vue` | 修改 | Token 适配 + 胜利后跳转到 /victory 路由 |
| `src/views/RulesView.vue` | 新增 | 完整规则页，左侧目录 + 右侧内容 |
| `src/views/VictoryView.vue` | 新增 | 胜利结算页，含梦想卡、财务概览、排行榜 |

### 6.4 Store 层 — `src/stores/game.ts`

- `buyDream` 后设置 winnerId 和 phase='finished'（逻辑已存在，保持不变）
- 新增 getter `playersRanked`（按现金 + 资产总值排序）

### 6.5 类型层 — `src/types/game.ts`

- 无结构性变更，胜利逻辑类型已存在

---

## 七、验证方式与验收标准

### 7.1 设计原型验证

| 验证项 | 验收标准 | 验证方式 |
|--------|---------|---------|
| 设计系统配置 | `.design` 中 `designLibrary.name = "豆包"`, `themeMode = "dark"` | 读取配置文件 |
| Token 一致性 | 所有 8 个页面的 theme-vars 块均为豆包 token，无 `--apple-` 残留 | 全局搜索 `--apple-` 应为 0 |
| 图标资产 | `assets/icons/dl_builtin_doubao/` 与豆包库 icons 目录文件一致 | 文件对比 |
| 页面完整性 | 8 个页面/状态全部注册 | .design data 数组长度 = 8 |
| 交互链接 | 所有声明的 navigate/overlay 交互均已配置 | 检查 devMetadata.interactions |
| 深色模式默认 | 所有页面 `<html class="dark">` | 检查 HTML 结构 |
| 棋盘颜色派生 | 7 种格子颜色均基于主色 + 语义色 color-mix | 检查 CSS 定义 |
| 质量门 | 通过 solo-design 验证（0 terminal errors） | 运行验证脚本 |

### 7.2 文档验证

| 验证项 | 验收标准 |
|--------|---------|
| PRD 完整性 | FR-026 ~ FR-041 全部定义，NFR-008 新增 |
| 跟踪矩阵 | 新增需求条目状态正确，实现文件标注到位 |
| 变更记录 | v1.4 变更记录行已添加 |

### 7.3 代码验证

| 验证项 | 验收标准 | 验证方式 |
|--------|---------|---------|
| Token 同步 | `base.css` 中颜色值与豆包 dark 模式一致 | 对比 CSS 变量值 |
| 页面路由 | `/rules` 和 `/victory` 路由可访问 | 手动测试 |
| 银行弹窗 | 三 Tab 切换正常，贷款/还款逻辑与 store 一致 | 手动测试 |
| 胜利流程 | 快车道购买梦想后跳转到胜利页 | 手动测试 |
| 深色模式 | 全站默认深色背景 #0e1115，文字对比度合规 | 视觉检查 |
| Lint 通过 | `npm run lint` 无错误 | 运行命令 |
| 构建通过 | `npm run build` 成功 | 运行命令 |

### 7.4 回归检查

- 老鼠赛跑核心流程：掷骰子 → 触发事件 → 结束回合 → 切换玩家 不受影响
- 机会卡片买入/卖出逻辑不受 UI 重构影响
- 本地持久化（localStorage）不受影响
- 响应式布局在桌面和平板下正常

---

## 八、版本控制提交规划

按以下顺序拆分提交，每个提交独立可验证：

| # | 提交信息 | 范围 |
|---|---------|------|
| 1 | `feat(design): 迁移设计系统到豆包（原型 token 层）` | colors_and_type.css + icons + .design 配置 |
| 2 | `feat(design): 重绘现有 5 个页面为豆包深色风格` | home/setup/ratrace/card/fasttrack 5 个 HTML |
| 3 | `feat(design): 新增游戏规则页（Rules）` | pages/rules.html + .design 注册 + 交互 |
| 4 | `feat(design): 新增胜利结算页（Victory）` | pages/victory.html + .design 注册 + 交互 |
| 5 | `feat(design): 新增银行操作弹窗（Bank Modal）` | pages/bank.html + .design 注册 + 交互 |
| 6 | `docs: 更新 PRD 和需求跟踪矩阵至 v1.4` | PRD.md + REQUIREMENTS_TRACEABILITY.md |
| 7 | `feat(web): 代码项目迁移豆包设计系统 token` | base.css + 视图类名适配 |
| 8 | `feat(web): 新增规则页和胜利页视图` | RulesView.vue + VictoryView.vue + router |
| 9 | `feat(web): 银行弹窗重构为三 Tab 模式` | RatRaceView.vue 银行弹窗重构 |
| 10 | `chore: 胜利流程调整 + 回归修复` | FastTrackView 路由跳转 + 排名 getter + 细节修复 |

---

## 九、风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 豆包系统无 secondary 按钮变体 | 原设计中大量使用 `bg-secondary` | 统一替换为 ghost 或 outline 风格，确保视觉层级正确 |
| 暗模式下棋盘颜色对比度不足 | 7 种派生色在 #0e1115 背景上辨识度低 | 调整 color-mix 比例，必要时提高饱和度 |
| Stack Sans Text 字体加载 | FOIT 或字体不可用 | 使用 CDN 加载 + system-ui 降级栈 |
| 银行弹窗三 Tab 与现有逻辑衔接 | 当前还款功能在财务面板内联实现 | 保持 store 逻辑不变，仅调整 UI 入口 |
| 胜利页与现有胜利 overlay 共存 | FastTrackView 已有内置胜利覆盖层 | 迁移到独立路由页后移除旧 overlay |
| 豆包 shadow token 透明度为 0 | elevation 效果缺失 | 使用 border + background 色差替代阴影 |
