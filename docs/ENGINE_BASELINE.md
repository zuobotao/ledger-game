# Engine Baseline Report

> v2.0.1 启动基线 | 2026-09-04

## 测试状态

| 维度 | 数值 |
|------|------|
| 测试文件数 | 13 |
| 总测试数 | 128 |
| 失败数 | 0 |
| 警告数 | 0 |
| 覆盖率 | 暂无工具 |

### 测试分布

| 文件 | 测试数 | 类型 |
|------|--------|------|
| ai-policies.spec.ts | 40 | Unit |
| replay-simulation.spec.ts | 39 | Unit |
| game-engine.spec.ts | 10 | Unit |
| cards.spec.ts | 8 | Unit |
| game-store.spec.ts | 7 | Unit |
| board.spec.ts | 6 | Unit |
| loan.spec.ts | 4 | Unit |
| careers.spec.ts | 4 | Unit |
| asset.spec.ts | 3 | Unit |
| game-over.spec.ts | 2 | Unit |
| ai-decision.spec.ts | 2 | Unit |
| financial-calculation.spec.ts | 2 | Regression |
| game-flow.spec.ts | 1 | Integration |

## Build & Lint

| 项目 | 状态 |
|------|------|
| Build | ✅ Pass |
| TypeCheck | ✅ Pass |
| Lint (oxlint) | ❌ 84 errors |
| Lint (eslint) | 待验证 |

### Lint 问题分类

- 未使用变量/导入 (no-unused-vars): ~40
- 未使用函数 (no-unused-func): ~5
- 其他 (vue/unicorn): ~5
- 类型相关问题: ~2

主要问题集中在 `src/stores/game.ts` 和 `src/utils/historyDB.ts`，属于技术债范畴。

## Engine 文件

| 文件 | 大小 | 职责 |
|------|------|------|
| contract.ts | 11.5KB | 领域契约 (GameAction/Result/Event) |
| gameEngine.ts | 10.2KB | 核心引擎入口 |
| aiPolicies.ts | 12.7KB | AI 策略 (Conservative/Balanced/Aggressive) |
| aiTypes.ts | 3.5KB | AI 类型定义 |
| aiValidator.ts | 6.6KB | AI 行动校验 |
| eventLog.ts | 8.1KB | 事件日志管理 |
| replay.ts | 11.4KB | 回放引擎 |
| simulation.ts | 9.2KB | What-if 模拟引擎 |
| assetEngine.ts | 3.7KB | 资产计算 |
| financialEngine.ts | 3.0KB | 财务计算 |
| loanEngine.ts | 4.2KB | 贷款管理 |
| transactionEngine.ts | 5.2KB | 交易记录 |
| cardEngine.ts | 3.2KB | 卡牌引擎 |
| turnEngine.ts | 1.9KB | 回合逻辑 |
| randomSource.ts | 2.1KB | 确定性随机源 |

## Action 数量

共 26 种 Action 类型：

start_game, roll_dice, move_player, resolve_cell, handle_payday, handle_charity,
buy_opportunity, sell_opportunity, decline_opportunity, handle_market, handle_doodad,
handle_story, take_bank_loan, repay_bank_loan, deposit_savings, withdraw_savings,
buy_insurance, declare_bankruptcy, end_turn, reset_game, fast_track_escape,
fast_track_opportunity, fast_track_dream, fast_track_stock_trading, ai_think, send_to_fast_track

## Event 数量

共 32 种 Event 类型：

game_started, dice_rolled, player_moved, cell_resolved, payday_received, charity_accepted,
opportunity_bought, opportunity_sold, opportunity_declined, market_event_applied, doodad_paid,
story_resolved, bank_loan_taken, bank_loan_repaid, savings_deposited, savings_withdrawn,
insurance_bought, child_born, laid_off, rehired, bankruptcy_declared, turn_ended, turn_started,
fast_track_entered, cash_flow_changed, asset_changed, liability_changed, game_over, game_reset,
stock_split, age_retired

## Simulation 能力

| 功能 | 状态 |
|------|------|
| simulate (单次) | ✅ |
| simulateBranches (批量) | ✅ |
| compareBranches (比较) | ✅ |
| getBestBranch (最优) | ✅ |
| evaluatePlayerActions | ✅ |
| Branch Isolation | ⚠️ 测试已覆盖，待深入验证 |

## Replay 能力

| 功能 | 状态 |
|------|------|
| Event Record | ✅ |
| Event Filter/Query | ✅ |
| Step Forward/Backward | ✅ |
| Jump to Index | ✅ |
| Skip to Event Type | ✅ |
| State Reconstruction | ✅ |
| Deterministic Hash | ❌ 不存在 |
| Replay 闭环验证 | ❌ 不存在 |

## RandomSource 能力

| 功能 | 状态 |
|------|------|
| 确定性 PRNG (mulberry32) | ✅ |
| 种子恢复 | ✅ |
| 状态序列化 | ✅ |
| 全项目覆盖 | ❌ 仍有 Math.random() 未替换 |

### Math.random() 残留

| 位置 | 用途 | 分类 |
|------|------|------|
| src/stores/game.ts:100 | ID 生成 | 非核心 |
| src/utils/historyDB.ts:379 | ID 生成 | 非核心 |
| src/components/DiceRoller.vue:67 | 骰子动画 | UI |
| src/views/SetupView.vue:195 | 颜色选择 | UI |
| src/engine/transactionEngine.ts:27 | ID 生成 | 引擎 |
| src/engine/loanEngine.ts:14 | ID 生成 | 引擎 |
| src/engine/gameEngine.ts:101 | ID 生成 | 引擎 |

其中引擎内的 ID 生成使用了 `Date.now()` + `Math.random()`，如果 ID 参与 Replay 校验则需替换。

### Date.now() 残留

12 处使用，分布在 engine 和 store 中。部分用于 Event timestamp，部分用于 ID 生成和日志。如果 timestamp 仅用于展示则可保留；如果用于确定性校验则需抽象。

## Store 状态

- `src/stores/game.ts`: 2753 行
- 包含大量重复计算逻辑（财务、资产、回合）
- 部分 Engine 函数已导入但未使用
- 存在直接 Math.random() 调用

## 已知问题

1. **Lint 错误 84 个**：主要为未使用变量/导入，集中在 store 和历史 DB
2. **Math.random() 残留**：引擎内部仍有非确定性 ID 生成
3. **Date.now() 未抽象**：无 GameClock 接口
4. **Replay 无 Hash 校验**：无法快速验证 replay 一致性
5. **Store 臃肿**：2753 行，部分逻辑与 Engine 重复
6. **无 GameState Invariant**：没有运行时状态合法性检查
7. **无 Stress Test**：没有大规模自动游戏测试
8. **AI 与 Store 耦合**：部分 AI 逻辑可能直接操作 Store