# Game Events

> v2.0.1 — 所有状态变化产生 GameEvent

## 核心规则

1. 每个 `dispatch()` 调用可能产生 0 或多个 GameEvent
2. Event 是状态变化的不可变记录
3. Event 包含足够 replay 所需的信息
4. Replay 通过重新处理 event 序列来重建状态

## Event 类型

| Event | 触发时机 | 关键字段 |
|-------|---------|---------|
| `dice_rolled` | 掷骰子 | playerId, values, total |
| `player_moved` | 玩家移动 | playerId, from, to, steps |
| `payday_received` | 发薪日 | playerId, amount, cashBefore, cashAfter |
| `charity_paid` | 支付慈善 | playerId, amount |
| `opportunity_bought` | 买入机会 | playerId, card, cost, quantity |
| `opportunity_sold` | 卖出机会 | playerId, assetId, price, quantity |
| `opportunity_declined` | 拒绝机会 | playerId, cardId |
| `market_triggered` | 市场事件 | playerId, cardId, effect |
| `doodad_paid` | Doodad 支出 | playerId, amount, description |
| `bank_loan_taken` | 银行贷款 | playerId, amount, loanId, monthlyPayment |
| `bank_loan_repaid` | 还款 | playerId, amount, remainingLoan |
| `savings_deposited` | 储蓄存款 | playerId, amount |
| `savings_withdrawn` | 储蓄取款 | playerId, amount |
| `insurance_bought` | 买保险 | playerId |
| `bankruptcy_declared` | 宣告破产 | playerId |
| `turn_ended` | 回合结束 | playerId, turnNumber |
| `game_reset` | 重置游戏 | - |
| `age_retired` | 退休 | playerId, age |
| `child_born` | 生子 | playerId |
| `unemployment_started` | 失业 | playerId |
| `unemployment_ended` | 失业结束 | playerId |
| `fast_track_entered` | 进入快车道 | playerId |
| `fast_track_escaped` | 快车道逃脱 | playerId |
| `dream_achieved` | 实现梦想 | playerId, dream |
| `game_won` | 游戏胜利 | playerId |

## Event 原则

- 每个 Event 包含明确的 `type`, `timestamp`, `playerId`
- Event 描述真实状态变化，不包含 UI 信息
- 同一操作可能产生多个 Event（如转入快车道同时触发多个结算）
- Event 序列可重建完整游戏状态