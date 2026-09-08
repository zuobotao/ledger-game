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
- 字段顺序断言为：姓名、职业、梦想、玩家类型、颜色。
- 两名玩家各有姓名、职业、梦想、颜色随机按钮，职业和梦想详情按钮数量正确。
- 选择梦想后，梦想详情按钮可用并能打开详情弹窗。
- 设置页在移动端无横向溢出。
