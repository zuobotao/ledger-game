# SetupView QA

## Scope

验证玩家设置字段顺序、姓名/职业/梦想/颜色随机按钮、职业与梦想详情按钮，以及窄屏布局。

## Verification

运行：

```sh
npm run type-check
npx playwright test playtest/scenarios/setup-dream-selector.spec.ts
```

结果：

- `vue-tsc --build` 通过。
- Playwright 桌面端 1280×800 通过。
- Playwright 移动端 375×812 通过。
- 移动端点击“开始游戏”后可进入 `#/rat-race`，避免依赖部分浏览器对 sticky 表单提交的兼容行为。
- 字段顺序断言为：姓名、职业、梦想、玩家类型、颜色。
- 两名玩家各有姓名、职业、梦想、颜色随机按钮，职业和梦想详情按钮数量正确。
- 选择梦想后，梦想详情按钮可用并能打开详情弹窗。
- 设置页在移动端无横向溢出。

## 2026-09-08 开始按钮修复

- 根因：底部 sticky 操作区的按钮使用表单原生 `submit`，在部分移动浏览器中点击后未触发路由跳转。
- 修复：按钮改为显式点击 `beginGame`，表单仍保留回车提交能力。
- 回归：3 个 SetupView Playwright 场景通过，包含移动端开始按钮进入棋盘验证。
