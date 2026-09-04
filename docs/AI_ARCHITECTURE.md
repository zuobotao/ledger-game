# AI Architecture

> v2.0.1 — AI 与 Engine 解耦

## 核心原则

**AI 能不能修改 State？**

> **不能**。AI 只能产生 GameAction，不能直接修改 GameState。

## 架构

```text
GameState (只读)
    ↓
AIStrategy.decide()
    ↓
GameAction
    ↓
AIValidator.validate()
    ↓
GameEngine.dispatch()
    ↓
GameState (修改)
```

## AIStrategy 接口

```typescript
interface AIStrategy {
  readonly name: string
  decide(state: GameState, playerId: string): GameAction | null
}
```

AI 策略只做一件事：从 GameState 读取信息，返回一个 GameAction 或 null。

## 可用策略

| 策略 | 名称 | 说明 |
|------|------|------|
| RandomStrategy | Random | 随机选择合法操作，用于测试和基准测试 |
| PolicyBasedStrategy + ConservativePolicy | Conservative | 保守策略：ROI > 12% 才买入，不贷款 |
| PolicyBasedStrategy + BalancedPolicy | Balanced | 均衡策略：ROI > 8% 买入，适度贷款 |
| PolicyBasedStrategy + AggressivePolicy | Aggressive | 激进策略：ROI > 5% 买入，积极杠杆 |

## DecisionPolicy（底层决策）

PolicyBasedStrategy 基于 DecisionPolicy 接口：

```typescript
interface DecisionPolicy {
  readonly name: string
  decideBuyOpportunity(obs, random): BuyDecision
  decideSellStock(obs, symbol, price, random): SellDecision
  decideCharity(obs, donationAmount, random): boolean
  decideTakeLoan(obs, random): LoanDecision
  decideRepayLoan(obs, random): RepayDecision
}
```

## AIValidator

AI 产生的 Action 必须经过验证：
- playerId 必须指向存在的玩家
- 金额必须合法
- 资产所有权检查
- 贷款余额检查
- AI 不能操作非 AI 玩家

## 确定性

- 相同 seed → 相同 RandomSource → 相同决策序列
- 所有策略使用 deterministic RandomSource
- 不接入 LLM（v2.1+ 阶段）

## 下一阶段

- v2.2: AI Strategy Benchmark
- v2.3: Search AI (Monte Carlo / Minimax)
- v2.4: LLM Player
- v2.5: AI Coach