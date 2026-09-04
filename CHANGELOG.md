# Changelog

## v2.0.1 — Engine Stabilization & Deterministic Simulation

> 2026-09-04

### 核心目标

将 Ledger Game Engine 从"已经存在"提升到"可信赖的游戏内核"。

### 确定性

- 游戏核心全部使用 `RandomSource`（mulberry32 PRNG），替换所有 `Math.random()`
- 新增 `GameClock` 接口，抽象 `Date.now()` 时间源
- 相同 seed + 相同 actions → 相同 finalState + 相同 events

### Replay

- 新增 `calculateStateHash` / `calculateReplayHash` 确定性哈希
- 新增 `GameReplay` 数据结构（version, seed, initialState, actions, events, finalStateHash）
- 新增 `verifyReplay` 回放完整性校验
- 13 个 replay 确定性测试

### Simulation

- 11 个隔离测试：验证 baseState 不受影响、分支互不污染
- 新增 `StateEvaluator` 可插拔接口
- 新增 `BasicFinancialEvaluator`（净值 30% + 现金流 25% + 流动性 15% + 风险 15% + 进度 15%）

### AI

- 新增 `AIStrategy` 接口：AI 只能产生 GameAction，不能直接修改 State
- 新增 `RandomStrategy`（随机策略，用于测试）
- 新增 `PolicyBasedStrategy`（适配现有 DecisionPolicy）
- 17 个 AI 策略测试

### Invariant

- 新增 `validateGameState` / `assertGameState` 状态验证
- 两级验证：basic（NaN 检查）/ full（财务一致性）
- 22 个不变式测试

### 压力测试

- 500 局确定性仿真：0 invariant violation
- 100 局自动 AI 游戏：0 deadlock, 0 error
- 确定性验证：相同 seed 产生相同结果

### 新增文件

| 文件 | 类型 |
|------|------|
| src/engine/stateHash.ts | Engine |
| src/engine/evaluator.ts | Engine |
| src/engine/aiStrategy.ts | Engine |
| src/engine/invariant.ts | Engine |
| test/unit/action-contract.spec.ts | Test |
| test/unit/event-contract.spec.ts | Test |
| test/unit/random-determinism.spec.ts | Test |
| test/integration/deterministic-game.spec.ts | Test |
| test/integration/replay-determinism.spec.ts | Test |
| test/unit/simulation-isolation.spec.ts | Test |
| test/unit/evaluator.spec.ts | Test |
| test/unit/ai-strategy.spec.ts | Test |
| test/unit/invariant.spec.ts | Test |
| test/regression/stress-game.spec.ts | Test |
| docs/ENGINE_ARCHITECTURE.md | Doc |
| docs/GAME_STATE.md | Doc |
| docs/GAME_ACTIONS.md | Doc |
| docs/GAME_EVENTS.md | Doc |
| docs/REPLAY.md | Doc |
| docs/SIMULATION.md | Doc |
| docs/AI_ARCHITECTURE.md | Doc |

### 修改文件

| 文件 | 变更 |
|------|------|
| src/engine/gameEngine.ts | createBankLoan 传入确定性 RandomSource |
| src/engine/contract.ts | 新增 GameReplay 接口 |
| src/engine/replay.ts | 增强 verifyReplay, toGameReplay, createReplayFromGameReplay |
| src/engine/eventLog.ts | 增强事件管理 |
| docs/ENGINE_BASELINE.md | 更新完成报告 |

### 测试统计

| 指标 | 数值 |
|------|------|
| 测试文件 | 24 |
| 总测试 | 260 |
| 通过 | 259 |
| 失败 | 1 (已有) |
| Build | ✅ |
| TypeCheck | ✅ |

### 下一版本建议

v2.1: Simulation & Economy Balance
- 10000+ 局自动游戏统计
- 经济平衡分析
- AI Strategy Benchmark
- Store 瘦身 (Strangler Pattern)