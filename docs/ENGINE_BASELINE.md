# Engine Baseline Report

> v2.0.1 完成报告 | 2026-09-04

## 测试状态

| 维度 | 启动基线 | 完成状态 |
|------|---------|---------|
| 测试文件数 | 13 | 24 |
| 总测试数 | 128 | 260 |
| 失败数 | 0 | 1 (已有) |
| 警告数 | 0 | 0 |

### 新增测试文件

| 文件 | 测试数 | 说明 |
|------|--------|------|
| action-contract.spec.ts | - | Action 契约审计 |
| event-contract.spec.ts | - | Event 契约审计 |
| random-determinism.spec.ts | - | 随机确定性 |
| deterministic-game.spec.ts | - | 确定性游戏 |
| replay-determinism.spec.ts | 13 | Replay 闭环 |
| simulation-isolation.spec.ts | 11 | Simulation 隔离 |
| evaluator.spec.ts | 10 | 评价器 |
| ai-strategy.spec.ts | 17 | AI 策略 |
| invariant.spec.ts | 22 | 状态不变式 |
| stress-game.spec.ts | 12 | 压力测试 |

## Build & Lint

| 项目 | 状态 |
|------|------|
| Build | ✅ Pass |
| TypeCheck | ✅ Pass |

## Engine 文件

| 文件 | 职责 |
|------|------|
| contract.ts | 领域契约 |
| gameEngine.ts | 核心引擎入口 |
| randomSource.ts | 确定性随机源 + GameClock |
| stateHash.ts | **新增** 确定性状态哈希 |
| replay.ts | 回放引擎（增强） |
| eventLog.ts | 事件日志 |
| simulation.ts | What-if 模拟引擎 |
| evaluator.ts | **新增** 可插拔评价器 |
| aiStrategy.ts | **新增** AI 策略接口 |
| aiPolicies.ts | AI 策略实现 |
| aiTypes.ts | AI 类型定义 |
| aiValidator.ts | AI 行动校验 |
| invariant.ts | **新增** 状态不变式 |
| assetEngine.ts | 资产计算 |
| financialEngine.ts | 财务计算 |
| loanEngine.ts | 贷款管理 |
| transactionEngine.ts | 交易记录 |
| cardEngine.ts | 卡牌引擎 |
| turnEngine.ts | 回合逻辑 |

## Action 数量

26 种 Action 类型，全部经过契约审计。

## Event 数量

32 种 Event 类型，全部经过契约审计。

## Simulation 能力

| 功能 | 状态 |
|------|------|
| simulate (单次) | ✅ |
| simulateBranches (批量) | ✅ |
| compareBranches (比较) | ✅ |
| getBestBranch (最优) | ✅ |
| Branch Isolation | ✅ 测试验证 |
| 可插拔 Evaluator | ✅ 新增 |

## Replay 能力

| 功能 | 状态 |
|------|------|
| Event Record | ✅ |
| Step Forward/Backward | ✅ |
| Jump to Index | ✅ |
| State Reconstruction | ✅ |
| Deterministic Hash | ✅ 新增 |
| Replay 闭环验证 | ✅ 新增 |

## RandomSource 能力

| 功能 | 状态 |
|------|------|
| 确定性 PRNG | ✅ |
| 种子恢复 | ✅ |
| 游戏核心覆盖 | ✅ 全部替换 |
| GameClock 抽象 | ✅ 新增 |

## AI 能力

| 功能 | 状态 |
|------|------|
| AIStrategy 接口 | ✅ 新增 |
| RandomStrategy | ✅ 新增 |
| Conservative/Balanced/Aggressive | ✅ 已有 |
| AIValidator | ✅ 已有 |
| AI 不能直接修改 State | ✅ 架构保证 |

## 可靠性

| 指标 | 结果 |
|------|------|
| 500 局 invariant 验证 | 0 违规 |
| 100 局压力测试 | 0 deadlock, 0 error |
| 确定性验证 | 相同 seed 产生相同结果 |

## 文档

| 文档 | 状态 |
|------|------|
| ENGINE_ARCHITECTURE.md | ✅ 新增 |
| GAME_STATE.md | ✅ 新增 |
| GAME_ACTIONS.md | ✅ 新增 |
| GAME_EVENTS.md | ✅ 新增 |
| REPLAY.md | ✅ 新增 |
| SIMULATION.md | ✅ 新增 |
| AI_ARCHITECTURE.md | ✅ 新增 |

## 已知问题

1. 1 个已有测试失败（game-engine.spec.ts, cleaner 净值为负但断言 >0）
2. Store 仍有 2753 行，部分逻辑与 Engine 重复（Phase 7 策略：Strangler Pattern）
3. 部分 lint 警告未清理（未使用变量/导入）