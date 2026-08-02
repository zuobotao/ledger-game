# Cashflow 101 v6：年龄机制 + 失业保险 实现计划

## 摘要

为 Cashflow 101 游戏新增两个机制：
1. **年龄机制**：每次发薪 = 过 1 个月，25 岁起始，65 岁退休（40 年 = 480 个月），退休后按净资产结算排名
2. **失业保险**：银行新增月缴型失业保险，月薪 3% 保费，失业期间照常领取全额工资

两个功能彼此独立但在 `handlePayday` 中有交互点（同时处理保费扣除、失业金、年龄递增）。

---

## 当前状态分析

### 已有基础
- `handlePayday(player)` 函数：处理发薪逻辑，失业时扣支出，就业时发现金流
- `hasInsurance` 字段：一次性防裁员保险（总支出×6，layoff 格子免疫）
- `buyInsurance()` 函数：购买一次性保险
- `turnNumber`：全局回合数（非年龄/月数）
- `BankModal.vue`：5 个 tab（存款/贷款/还款/资产/财务报表）
- `RatRaceView.vue` + `FastTrackView.vue`：两个阶段主视图，Header 显示回合数
- `GameSummary.vue`：游戏结束总结组件，支持 rat_race_end/victory/game_over 模式
- 路过 payday 格子也会调用 `handlePayday`（在 `ratRaceRollDice` 的循环中）

### 关键文件路径
- 类型：`src/types/game.ts`
- 状态：`src/stores/game.ts`
- 银行 UI：`src/components/BankModal.vue`
- 视图：`src/views/RatRaceView.vue`、`src/views/FastTrackView.vue`
- AI 决策：`src/utils/aiDecision.ts`
- 游戏总结：`src/components/GameSummary.vue`

---

## 功能 1：年龄机制

### 设计决策
- **起始年龄**：25 岁，退休年龄 65 岁，共 480 个月
- **时间推进**：每次经过 payday 格子（含路过）= 1 个月
- **游戏结束**：用全局 `gameMonth` 计数器，达到 480 时游戏结束，按净资产排名
- **FastTrack 阶段**：年龄继续推进（现金流日也推进年龄）
- **可配置**：`GameConfig.ageLimit` 开关，默认开启

### 类型变更（src/types/game.ts）

1. **Player 接口新增**：
   - `ageMonths: number` — 已度过的月数，起始 0（对应 25 岁 0 月）

2. **GameConfig 接口新增**：
   - `ageLimit: boolean` — 是否启用年龄上限（默认 true）

3. **新增常量**（与 BANK_CONFIG、MAX_CHILDREN 同区域）：
   - `START_AGE = 25`
   - `RETIREMENT_AGE = 65`
   - `MAX_AGE_MONTHS = 480` — (65-25) × 12

4. **TransactionType 新增**：
   - `'age_retire'` — 退休结算交易记录

### Store 变更（src/stores/game.ts）

1. **新增 ref**：
   - `gameMonth = ref(0)` — 全局游戏月数，每有玩家经过 payday 就 +1

2. **新增计算属性**：
   - `currentPlayerAge` — 返回 `{ years, months, percent }` 供 UI 显示
     - `years = START_AGE + Math.floor(player.ageMonths / 12)`
     - `months = player.ageMonths % 12`
     - `percent = Math.min(100, player.ageMonths / MAX_AGE_MONTHS * 100)`

3. **createPlayer 初始化**：
   - 增加 `ageMonths: 0`

4. **handlePayday 修改**：
   - 在函数末尾增加：`player.ageMonths += 1` 和 `gameMonth.value += 1`
   - 之后检查：如果 `gameConfig.ageLimit && gameMonth.value >= MAX_AGE_MONTHS`，调用 `triggerRetirement()`

5. **新增函数 triggerRetirement()**：
   - 遍历所有未破产玩家，按净资产（总资产-总负债）从高到低排序
   - 设置 `winnerId = sortedPlayers[0].id`
   - 设置 `phase = 'finished'`，`turnStatus = 'finished'`
   - `saveState()`

6. **loadState 兼容**：
   - player patch 中加 `patched.ageMonths ??= 0`
   - 加 `gameMonth.value = state.gameMonth ?? 0`

7. **导出新增**：
   - `gameMonth`
   - `currentPlayerAge`
   - `START_AGE`、`RETIREMENT_AGE`、`MAX_AGE_MONTHS`（或用函数封装）

### UI 变更

#### RatRaceView.vue + FastTrackView.vue Header

在副标题区域（回合数旁）增加年龄显示：
- 图标：Calendar（lucide）
- 文案：`25岁 3月 · 第 12 回合`
- 鼠标悬停显示：`已度过 X 个月 / 共 480 个月`

具体位置：将 `第 {{ gameStore.turnNumber }} 回合` 改为：
```
{{ ageDisplay }} · 第 {{ gameStore.turnNumber }} 回合
```
其中 `ageDisplay` 是计算属性：`${years}岁 ${months}月`

#### GameSummary.vue 新增 retirement 模式

新增 `phase: 'retirement'` 类型：
- 标题：「退休结算」
- 副标题：「40 年投资旅程结束」
- 内容：所有玩家净资产排名列表（从高到低）
- 第一名高亮为冠军
- 底部按钮：「再来一局」「返回首页」

复用现有 victory/game_over 的布局结构，仅替换文案和排名逻辑。

---

## 功能 2：失业保险

### 设计决策
- **保费**：月薪的 3%，每月发薪时自动从现金扣除
- **保障**：失业期间照常领取全额工资（cashFlow）
- **参保/停保**：随时可切换，已缴保费不返还
- **与一次性保险的关系**：独立并存。一次性保险防失业（layoff 免疫），失业保险保工资（失业了仍领工资）
- **保费扣除方式**：直接从现金扣，不影响 cashFlow 计算（实现简单）
- **失业期间**：不扣保费，但照领工资（因为没有月薪基数了）

### 类型变更（src/types/game.ts）

1. **Player 接口新增**：
   - `hasUnemploymentInsurance: boolean` — 是否参保失业保险（月缴型）

2. **新增常量**：
   - `UNEMPLOYMENT_INSURANCE_RATE = 0.03` — 月薪 3%

3. **TransactionType 新增**：
   - `'unemployment_insurance_premium'` — 失业保险保费
   - `'unemployment_insurance_benefit'` — 失业保险金

### Store 变更（src/stores/game.ts）

1. **createPlayer 初始化**：
   - 增加 `hasUnemploymentInsurance: false`

2. **新增函数 toggleUnemploymentInsurance(): boolean**：
   - 切换 `player.hasUnemploymentInsurance` 状态
   - 记录交易（参保/停保各记一条，type 用 'other' 或新增子类型）
   - `saveState()`
   - 返回 true

3. **handlePayday 修改**（核心变更）：

修改前逻辑：
```
if (player.isUnemployed) {
  扣支出，无工资
} else {
  发现金流
}
```

修改后逻辑：
```
if (player.isUnemployed) {
  if (player.hasUnemploymentInsurance) {
    // 失业+有保险：领全额工资
    player.cash += player.cashFlow
    recordTransaction('unemployment_insurance_benefit', player.cashFlow, '失业保险金', player.id)
    msg = `失业中：失业保险生效，领取 ${formatMoney(player.cashFlow)} 全额工资。`
  } else {
    // 失业+无保险：扣支出（原有逻辑）
    player.cash -= player.totalExpenses
    recordTransaction('expense', -player.totalExpenses, '失业支出', player.id)
    msg = `失业中：没有工资，仍需支付 ${formatMoney(player.totalExpenses)} 支出。`
  }
} else {
  // 就业：先扣保费，再发工资
  let premium = 0
  if (player.hasUnemploymentInsurance) {
    premium = Math.round(player.salary * UNEMPLOYMENT_INSURANCE_RATE)
    player.cash -= premium
    recordTransaction('unemployment_insurance_premium', -premium, '失业保险保费', player.id)
  }
  player.cash += player.cashFlow
  recordTransaction('salary', player.cashFlow, '发工资', player.id)
  msg = `发工资：获得 ${formatMoney(player.cashFlow)} 现金流${premium > 0 ? `，扣除失业保险 ${formatMoney(premium)}` : ''}。`
}

// 年龄递增（功能1）
player.ageMonths += 1
gameMonth.value += 1
// 检查退休（功能1）
if (gameConfig.ageLimit && gameMonth.value >= MAX_AGE_MONTHS) {
  triggerRetirement()
}
```

4. **layoff 格子逻辑不变**：
   - 一次性保险（hasInsurance）的免失业逻辑保持不变
   - 失业保险不防止失业，只保工资
   - 同时有两个保险时，先触发一次性保险（免疫失业），失业保险不触发

5. **loadState 兼容**：
   - player patch 中加 `patched.hasUnemploymentInsurance ??= false`

6. **导出新增**：
   - `toggleUnemploymentInsurance`
   - `UNEMPLOYMENT_INSURANCE_RATE`（或封装成计算属性供 UI 显示月保费）

### UI 变更

#### BankModal.vue 新增「保险」Tab

在现有 5 个 tab 后新增第 6 个 tab「保险」，图标 Shield。

Tab 内容分两个卡片：

**卡片 1：裁员保险（一次性）**
- 状态：已购买 / 未购买
- 说明：遭遇裁员时免疫一次失业
- 费用：总支出 × 6
- 按钮：未购买时显示「购买」，已购买时禁用并显示「已投保」
- 点击购买调用 `store.buyInsurance()`

**卡片 2：失业保险（月缴型）**
- 状态：参保中 / 未参保
- 说明：失业期间照常领取全额工资
- 月缴：月薪 × 3% = $XXX
- 提示：保费按月从工资中扣除，已缴保费不返还
- 按钮：未参保显示「参保」（绿色），已参保显示「停保」（红色/灰色）
- 点击调用 `store.toggleUnemploymentInsurance()`

#### RatRaceView.vue 顶部保险按钮

当前顶部有一个 Shield 图标按钮调用 `buyInsurance()`。改为：
- 点击打开 BankModal 并定位到保险 tab
- 按钮颜色根据至少一个保险是否生效变化
- 保留快捷入口的便捷性

#### Header 状态徽章（可选）

在失业/双骰/慈善保护徽章区域旁，增加：
- 失业保险徽章：参保时显示绿色 Shield + 「失业险」
- 仅参保时显示

#### TransactionHistory.vue 交易类型

新增交易类型的中文显示：
- `unemployment_insurance_premium` → 失业保险保费
- `unemployment_insurance_benefit` → 失业保险金

### AI 决策变更（src/utils/aiDecision.ts）

**新增函数 decideUnemploymentInsurance(player, difficulty): boolean**

| 难度 | 策略 |
|------|------|
| easy | 始终参保（保守求稳） |
| medium | 现金 > 3个月支出 时参保，否则停保 |
| hard | 不参保（节省成本，靠现金储备应对） |

**在 runAITurn 中增加调用**：
在「AI 买保险」步骤（第 6 步）之后，增加失业保险决策：
- 如果决策结果与当前状态不同 → 调用 `toggleUnemploymentInsurance()`

---

## 实施顺序

### 阶段 1：年龄机制（独立可提交）
1. `src/types/game.ts` — 新增 ageMonths、常量、TransactionType
2. `src/stores/game.ts` — gameMonth ref、handlePayday 修改、triggerRetirement、导出
3. `src/views/RatRaceView.vue` + `FastTrackView.vue` — Header 年龄显示
4. `src/components/GameSummary.vue` — retirement 模式
5. 存档兼容验证
6. 类型检查 + 提交

### 阶段 2：失业保险（独立可提交）
1. `src/types/game.ts` — 新增 hasUnemploymentInsurance、常量、TransactionType
2. `src/stores/game.ts` — toggle 函数、handlePayday 修改、导出
3. `src/components/BankModal.vue` — 保险 Tab（含两个保险卡片）
4. `src/views/RatRaceView.vue` — 保险按钮改为打开银行保险 tab
5. `src/utils/aiDecision.ts` + store — AI 决策
6. `src/components/TransactionHistory.vue` — 交易类型文案
7. 类型检查 + 提交

### 阶段 3：集成验证
- 手动测试两个功能交互
- 边界情况：退休当月失业 + 有失业保险
- 边界情况：刚好第 480 个月发薪
- 多人模式下退休结算排名

---

## 验证步骤

### 年龄机制
1. 新游戏开始，年龄显示 25 岁 0 月
2. 经过 payday 格子后，年龄增加 1 个月
3. 路过 payday 格子也推进年龄
4. 12 个月后进位为 1 岁
5. 480 个月后触发退休结算，按净资产排名
6. FastTrack 阶段现金流日也推进年龄
7. 旧存档加载后 ageMonths 默认为 0
8. 关闭 ageLimit 配置后游戏不会因年龄结束

### 失业保险
1. 新游戏默认未参保
2. 银行保险 tab 可切换参保/停保状态
3. 参保后每次发薪扣除月薪×3%
4. 失业时有保险的玩家领全额工资
5. 失业期间不扣保费
6. 两个保险可同时购买，状态独立
7. 同时有两个保险时，layoff 先触发一次性保险（免疫失业）
8. 停保不返还已缴保费
9. AI easy 参保，hard 不参保
10. 旧存档加载后 hasUnemploymentInsurance 默认为 false

---

## 涉及文件清单

| 文件 | 变更 |
|------|------|
| `src/types/game.ts` | 新增字段、常量、TransactionType |
| `src/stores/game.ts` | 新增函数、修改 handlePayday、导出 |
| `src/components/BankModal.vue` | 新增保险 Tab（含两个保险卡片） |
| `src/views/RatRaceView.vue` | Header 年龄显示、保险按钮跳转 |
| `src/views/FastTrackView.vue` | Header 年龄显示 |
| `src/components/GameSummary.vue` | 新增 retirement 模式 |
| `src/utils/aiDecision.ts` | 新增失业保险决策函数 |
| `src/components/TransactionHistory.vue` | 新增交易类型文案 |

共 8 个文件。

---

## 假设与决策记录

1. **全局 gameMonth vs 每玩家独立 ageMonths**：两者都有。gameMonth 用于判定游戏结束（统一时间线），ageMonths 用于显示每玩家年龄（理论上应该一致，但分开存更安全）
2. **保费从现金扣 vs 计入 expenses**：选现金扣，不影响 cashFlow，实现简单
3. **失业期间不扣保费**：符合逻辑（没有月薪就没有 3% 的基数）
4. **退休结算用净资产排名**：资产 - 负债，最公平
5. **一次性保险 vs 失业保险并存**：两者定位不同，同时存在增加策略深度
