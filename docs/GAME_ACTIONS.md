# Game Actions

> v2.0.1 — 所有游戏状态修改必须通过 GameAction

## 核心规则

1. 所有修改 GameState 的操作必须通过 `GameEngine.dispatch(GameAction)` 进行
2. UI、AI、Store 不得直接修改 GameState
3. 每个 Action 有明确的 `type` 和 `playerId`

## Action 列表

| Action | 说明 | 关键字段 |
|--------|------|---------|
| `start_game` | 开始游戏 | - |
| `roll_dice` | 掷骰子 | playerId |
| `move_player` | 移动玩家 | playerId, steps |
| `resolve_cell` | 处理格子效果 | playerId, position |
| `handle_payday` | 发薪日 | playerId |
| `handle_charity` | 慈善 | playerId, accepted |
| `buy_opportunity` | 买机会卡 | playerId, card, quantity |
| `sell_opportunity` | 卖机会卡 | playerId, assetId, quantity |
| `decline_opportunity` | 拒绝机会卡 | playerId |
| `handle_market` | 市场事件 | playerId, card |
| `handle_doodad` | Doodad 事件 | playerId, card |
| `handle_story` | 故事事件 | playerId, card |
| `take_bank_loan` | 银行贷款 | playerId, amount |
| `repay_bank_loan` | 还款 | playerId, amount, liabilityId |
| `deposit_savings` | 储蓄存款 | playerId, amount |
| `withdraw_savings` | 储蓄取款 | playerId, amount |
| `buy_insurance` | 买保险 | playerId |
| `declare_bankruptcy` | 宣告破产 | playerId |
| `end_turn` | 结束回合 | playerId |
| `reset_game` | 重置游戏 | - |
| `fast_track_escape` | 快车道逃脱 | playerId |
| `fast_track_opportunity` | 快车道机会 | playerId |
| `fast_track_dream` | 快车道梦想 | playerId |
| `fast_track_stock_trading` | 快车道股票交易 | playerId |
| `ai_think` | AI 思考 | playerId |
| `send_to_fast_track` | 送入快车道 | playerId |

## 数据流

```text
Human / AI / Replay
    ↓
GameAction
    ↓
GameEngine.dispatch()
    ↓
GameResult { success, state, events, messages }
```

## 验证

AI 产生的 Action 必须经过 `validateAIAction()` 验证：
- playerId 必须指向存在的玩家
- 金额必须为正数
- 贷款金额不能超过银行上限
- 还款金额不能超过贷款余额
- 卖出数量不能超过持有数量