# Engine Architecture

> v2.0.1 — Engine Stabilization & Deterministic Simulation

## 核心原则

**谁可以修改 GameState？**

> **GameEngine**。只有 GameEngine 通过 `dispatch(GameAction)` 修改 GameState。

其他所有组件（UI、AI、Store、Simulation）都只能通过产生 GameAction 来间接影响游戏状态。

## 架构图

```
Human / AI / Replay / Simulation
        │
        ▼
   GameAction
        │
        ▼
   GameEngine.dispatch()
        │
        ├── GameEvent (记录)
        │
        └── GameState (修改)
```

## 核心模块

### GameEngine (`src/engine/gameEngine.ts`)
- 统一 action dispatch 入口
- 管理 RandomSource（确定性随机）
- 协调 FinancialEngine, AssetEngine, LoanEngine, TurnEngine
- 产生 GameEvent 记录

### RandomSource (`src/engine/randomSource.ts`)
- mulberry32 PRNG 算法
- 相同 seed → 相同随机序列
- 替代所有游戏核心的 Math.random()
- 提供 GameClock 接口（SystemGameClock / FixedGameClock）

### GameClock (`src/engine/randomSource.ts`)
- 抽象时间源，测试用 FixedGameClock，生产用 SystemGameClock
- Date.now() 不参与游戏结果

### ReplayEngine (`src/engine/replay.ts`)
- 从 GameEventLog 重建游戏状态
- 支持逐步回放、跳转
- verifyReplay 校验回放完整性
- 导出/导入 GameReplay 数据结构

### SimulationEngine (`src/engine/simulation.ts`)
- 从任意状态创建分叉模拟
- 原始状态不受影响（deep clone）
- 分支互不污染
- 支持 compareBranches, getBestBranch

### StateEvaluator (`src/engine/evaluator.ts`)
- 可插拔状态评价器
- BasicFinancialEvaluator: 净值 30% + 现金流 25% + 流动性 15% + 风险 15% + 进度 15%
- 可用于 Simulation 分支比较和 AI 决策

### AIStrategy (`src/engine/aiStrategy.ts`)
- AI 只能产生 GameAction，不能直接修改 State
- RandomStrategy: 随机决策（测试用）
- PolicyBasedStrategy: 基于 DecisionPolicy 的适配器
- ConservativePolicy / BalancedPolicy / AggressivePolicy

### AIValidator (`src/engine/aiValidator.ts`)
- AI 产生的 Action 必须经过验证
- 检查 playerId 存在性、金额合法性、资产所有权等

### GameState Invariant (`src/engine/invariant.ts`)
- validateGameState: 检测 NaN、负数、不一致
- assertGameState: debug 模式断言
- 两级验证：basic（快速 NaN 检查）/ full（财务一致性）

### StateHash (`src/engine/stateHash.ts`)
- 确定性 GameState 哈希（FNV-1a）
- 只包含影响游戏结果的核心字段
- 用于 replay 校验、AI 比赛验证

## 确定性保证

```text
相同初始状态 + 相同 Seed + 相同 Action Sequence = 相同最终状态 + 相同 Event Sequence
```

- 游戏核心无直接 Math.random()
- 游戏核心无直接 Date.now()
- 所有 ID 生成使用 RandomSource
- StateHash 排除 UI 状态和时间戳

## 数据流

```
GameState (只读)
    ↓
AIStrategy.decide() → GameAction
    ↓
AIValidator.validate() → valid
    ↓
GameEngine.dispatch() → GameResult + GameEvent[]
    ↓
GameState (已修改)
```

## 测试覆盖

| 测试文件 | 数量 | 说明 |
|---------|------|------|
| replay-determinism.spec.ts | 13 | Replay 确定性 |
| simulation-isolation.spec.ts | 11 | Simulation 隔离 |
| evaluator.spec.ts | 10 | 评价器 |
| ai-strategy.spec.ts | 17 | AI 策略 |
| invariant.spec.ts | 22 | 状态不变式 |
| stress-game.spec.ts | 12 | 压力测试 |
| action-contract.spec.ts | 已有 | Action 契约 |
| event-contract.spec.ts | 已有 | Event 契约 |
| random-determinism.spec.ts | 已有 | 随机确定性 |
| deterministic-game.spec.ts | 已有 | 确定性游戏 |