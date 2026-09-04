# Simulation

> v2.0.1 — What-if 模拟引擎

## 核心原则

**Simulation 是否影响真实游戏？**

> **不影响**。Simulation 在 deep clone 的状态上运行，原始状态完全不受影响。

## 架构

```text
BaseState (不变)
    ├── Branch A (clone, 模拟)
    ├── Branch B (clone, 模拟)
    └── Branch C (clone, 模拟)
```

任何 Branch 都不能污染其他 Branch。

## SimulationEngine

- `simulate(baseState, actions)`: 单次模拟，返回 SimulationResult
- `simulateBranches(baseState, branches)`: 批量模拟多个分支
- `compareBranches(branches)`: 比较分支结果，按评分排序
- `getBestBranch(branches)`: 获取最佳分支
- `evaluatePlayerActions(state, playerId, options)`: 单玩家行动评估

## SimulationResult

```typescript
interface SimulationResult {
  success: boolean
  finalState: GameState
  playerResults: PlayerSimulationResult[]
  error?: string
  actionsExecuted: number
}
```

## StateEvaluator

可插拔的评价器接口：

```typescript
interface StateEvaluator {
  readonly name: string
  evaluate(before: GameState, after: GameState, playerId: string): EvaluationScore
}
```

### BasicFinancialEvaluator

评分维度：
- **净值 30%**: 基于 tanh 归一化
- **现金流 25%**: 现金流 + 被动收入溢价
- **流动性 15%**: 现金/月支出比率
- **风险 15%**: 负债率（越低越安全）
- **进度 15%**: 被动收入/总支出比率

## 隔离保证

- 所有模拟在 deep clone 状态上运行
- 模拟前后 baseState 完全一致
- 多个分支互不干扰
- 失败分支不影响其他分支