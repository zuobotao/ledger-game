# 多人添丁随礼验收记录

日期：2026-09-08  
代码提交：`b107227`

## 验收范围

- 多人真人玩家触发添丁事件后，其他未破产真人玩家收到随礼面板。
- 每位符合资格的玩家只能响应一次；响应后显示剩余人数。
- 同意随礼时由权威 store 固定扣除 `$100`，收款人同步增加 `$100`，并写入双方交易记录。
- 现金不足时不会产生负现金，响应会安全结束并提示现金不足。
- 拒绝随礼不改变任一方现金；全部玩家响应后自动清除待处理事件并恢复回合解析。
- 单机与多人适配器均复用同一命令语义；多人服务端允许非当前回合的合资格玩家响应，并校验 recipient、资格和去重。

## 自动化验证

```text
npm run type-check
npx vitest run test/unit/child-gift.spec.ts test/unit/action-contract.spec.ts test/unit/asset.spec.ts test/unit/gameplay-single-adapter.spec.ts test/unit/gameplay-multiplayer-adapter.spec.ts
```

结果：类型检查通过；5 个测试文件、44 个测试通过。

## 设计边界

当前默认随礼金额为 `$100`，由规则端元数据统一下发。AI 玩家不会阻塞真人随礼环节；只有存在其他真人玩家时才创建随礼待处理事件，单人局和纯 AI 对局保留原有即时提示。
