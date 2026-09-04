# Asset Licenses Inventory — Ledger v2.0

**日期：** 2026-09-04
**版本：** v2.0

---

## 1. 目的

记录 Ledger 项目中所有视觉素材、字体、图标和其他资源的授权状态，确保合规使用。

---

## 2. 视觉素材

| 资源 | 位置 | 来源 | 许可 | 状态 |
|------|------|------|------|------|
| Ledger Logo | `src/assets/logo.svg` | 项目原创 | Apache-2.0 | ✅ |
| 游戏棋盘 SVG | 组件内联 | 项目原创 | Apache-2.0 | ✅ |
| 卡片图标 | lucide-vue-next | 第三方 | ISC | ✅ |
| UI 图标 | lucide-vue-next | 第三方 | ISC | ✅ |
| 背景渐变 | CSS 实现 | 项目原创 | Apache-2.0 | ✅ |
| 动画效果 | CSS 实现 | 项目原创 | Apache-2.0 | ✅ |

---

## 3. 字体

| 字体 | 用途 | 来源 | 许可 | 状态 |
|------|------|------|------|------|
| 系统字体栈 | 全局文本 | 用户操作系统 | 系统内置 | ✅ |
| 等宽字体 | 数字/代码 | 用户操作系统 | 系统内置 | ✅ |

**字体栈配置：**
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

项目不打包任何字体文件，不通过网络加载字体，完全依赖用户系统字体。

---

## 4. 图标库

### lucide-vue-next
- **许可：** ISC License
- **版权：** Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather Icons
- **使用范围：** 项目中所有 UI 图标
- **兼容性：** ISC 与 Apache-2.0 兼容 ✅

---

## 5. 第三方代码依赖

完整列表见 `THIRD_PARTY_NOTICES.md`。

| 类别 | 主要依赖 | 许可 |
|------|----------|------|
| 框架 | Vue.js, Vue Router, Pinia | MIT |
| 构建工具 | Vite | MIT |
| 样式 | Tailwind CSS | MIT |
| 图表 | Chart.js, vue-chartjs | MIT |
| 存储 | idb | ISC |
| 工具 | uuid | MIT |

所有第三方代码依赖的许可均与 Apache-2.0 兼容。

---

## 6. 卡牌内容

| 类别 | 来源 | 许可 | 状态 |
|------|------|------|------|
| 卡牌文案 | 项目原创 | Apache-2.0 | ✅ |
| 股票代码 | 项目原创（虚构） | Apache-2.0 | ✅ |
| 公司名称 | 项目原创（虚构） | Apache-2.0 | ✅ |
| 职业设定 | 通用职业名称 | 公共领域 | ✅ |
| 市场事件描述 | 项目原创 | Apache-2.0 | ✅ |

详见 `CARD_PROVENANCE.md`。

---

## 7. 合规状态

| 检查项 | 状态 |
|--------|------|
| 所有原创资源均为 Apache-2.0 | ✅ |
| 所有第三方资源许可兼容 | ✅ |
| 字体不涉及网络加载 | ✅ |
| 图标库许可明确 | ✅ |
| 卡牌内容可追溯 | ✅ |
| 无未授权素材 | ✅ |

---

## 8. 结论

Ledger 项目的所有资产均具有清晰的授权链，原创内容使用 Apache-2.0，第三方资源许可兼容。项目可以安全地公开发布和分发。

**审核结果：通过 ✅**
