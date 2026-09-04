# Game State

> v2.0.1

## 核心字段

### GameState

| 字段 | 类型 | 说明 |
|------|------|------|
| players | Player[] | 所有玩家 |
| currentPlayerIndex | number | 当前玩家索引 |
| phase | 'rat_race' \| 'fast_track' \| 'game_over' | 游戏阶段 |
| config | GameConfig | 游戏配置 |
| winnerId | string \| null | 胜者 ID |
| turnNumber | number | 当前回合 |
| gameMonth | number | 游戏月份 |
| lastRoll | number | 最近一次骰子点数 |
| pendingAction | PendingAction | 待处理 UI 操作 |

### Player

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 玩家 ID（确定性生成） |
| name | string | 玩家名称 |
| career | Career | 职业 |
| salary | number | 工资 |
| cash | number | 现金 |
| savings | number | 储蓄 |
| passiveIncome | number | 被动收入 |
| totalIncome | number | 总收入 = salary + passiveIncome |
| totalExpenses | number | 总支出 |
| cashFlow | number | 现金流 = totalIncome - totalExpenses |
| assets | Asset[] | 资产列表 |
| liabilities | Liability[] | 负债列表 |
| childrenCount | number | 子女数量 |
| ageMonths | number | 年龄（月） |
| isBankrupt | boolean | 是否破产 |
| phase | 'rat_race' \| 'fast_track' | 玩家阶段 |

## 不变式

### 玩家级
- `cash` 不能为 NaN
- `childrenCount >= 0`
- `asset.quantity >= 0`
- `liability.amount >= 0`
- 所有资产数量不能为 NaN
- 所有资产价格不能为 NaN

### 财务级
- `totalIncome = salary + passiveIncome`（非失业时）
- `cashFlow = totalIncome - totalExpenses`

### 游戏级
- `currentPlayerIndex` 在合法范围内
- `phase` 为合法值
- `winnerId` 指向存在的玩家
- `game_over` 时必须有 `gameEndReason`

## 克隆与隔离

- 使用 `JSON.parse(JSON.stringify(state))` 进行深拷贝
- Simulation 在克隆状态上运行，不影响原始状态
- Replay 从初始状态重建，不修改原始事件日志