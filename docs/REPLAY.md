# Replay

> v2.0.1 — 真正的回放闭环

## 核心原则

**Replay 如何重建游戏？**

从 `InitialState + Seed + Actions` 开始，通过 GameEngine 重新执行所有 Action，产生完全相同的 Event 序列和最终状态。

## 数据结构

```typescript
interface GameReplay {
  version: string      // "2.0.1"
  seed: number         // 随机种子
  initialState: GameState  // 初始状态
  actions: GameAction[]    // 操作序列
  events: GameEvent[]      // 事件序列
  finalStateHash?: string  // 最终状态哈希
}
```

## 确定性保证

```text
相同 initialState + 相同 seed + 相同 actions
= 相同 events + 相同 finalState + 相同 stateHash
```

## ReplayEngine

- `skipToEnd()`: 快进到结束
- `stepForward()`: 单步前进
- `stepBackward()`: 单步后退
- `jumpTo(index)`: 跳转到指定事件
- `verifyReplay(expectedHash)`: 校验回放完整性
- `toGameReplay(seed, actions)`: 导出 GameReplay
- `createReplayFromGameReplay(replay)`: 从 GameReplay 导入

## State Hash

- 使用 FNV-1a 哈希算法
- 只包含影响游戏结果的核心字段
- 排除 UI 状态、时间戳、非确定性字段
- 相同状态 → 相同哈希
- 用于 replay 校验、AI 比赛、调试

## 使用场景

1. **调试**: 保存游戏过程，逐帧回放分析
2. **测试**: 验证游戏逻辑确定性
3. **AI 比赛**: 相同初始条件下比较不同 AI 策略
4. **分享**: 导出游戏录像供他人观看