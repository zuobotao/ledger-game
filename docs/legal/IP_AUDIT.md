# IP Audit — Ledger

**Date:** 2026-09-04
**Version:** v2.0
**Scope:** Full repository audit of intellectual property and third-party content

---

## 1. Audit Summary

This document records the provenance and originality status of all content in the Ledger repository. Each item is classified into one of four categories:

| Category | Meaning |
|----------|---------|
| **ORIGINAL** | Created by Ledger project contributors, no third-party source |
| **INSPIRED** | Inspired by general concepts (ideas, mechanics) but original expression |
| **THIRD_PARTY** | Explicitly sourced from a third party with verified license |
| **UNKNOWN** | Source unclear — must be resolved before release |

**Goal:** Zero UNKNOWN items by end of v2.0.

---

## 2. Game Rules & Mechanics

| Item | Category | Notes |
|------|----------|-------|
| Two-phase game structure (accumulation → fast track) | INSPIRED | General financial education game concept; rule mechanics are original implementation |
| Dice-based board movement | INSPIRED | Standard board game mechanic |
| Passive income ≥ expenses = escape | INSPIRED | Generic financial education concept |
| Buy dreams to win fast track | ORIGINAL | Ledger's own framing and content |
| Financial statement UI layout | ORIGINAL | Original Vue component implementation |

---

## 3. Card Content

### 3.1 Opportunity Cards — Stocks

| Item | Category | Notes |
|------|----------|-------|
| Stock symbols (NOVA, MEDX, GRW, BLUE, TITAN, TECH, DYNA, GROW) | ORIGINAL | Fictional tickers created for Ledger — no real company reference |
| Stock company names (新星科技, 麦迪医疗, 长盛综合, 蓝海股份, 泰坦重工) | ORIGINAL | Fictional Chinese company names |
| Stock price tiers ($5–$120) | ORIGINAL | Original numeric design |
| Stock split / merge mechanism | INSPIRED | Generic financial concept; original implementation |

### 3.2 Opportunity Cards — Real Estate

| Item | Category | Notes |
|------|----------|-------|
| 2室1卫出租房 | ORIGINAL | Generic property description |
| 市中心公寓 | ORIGINAL | Generic property description |
| 双拼别墅 | ORIGINAL | Generic property description |
| 8户公寓楼 | ORIGINAL | Generic property description |
| 小型写字楼 | ORIGINAL | Generic property description |
| 海滨度假酒店 | ORIGINAL | Generic property description |
| REIT 投资组合 | ORIGINAL | Generic financial instrument name |

### 3.3 Opportunity Cards — Business

| Item | Category | Notes |
|------|----------|-------|
| 自动洗车店 | ORIGINAL | Generic business type |
| 披萨连锁店 | ORIGINAL | Generic business type |
| 零部件制造厂 | ORIGINAL | Generic business type |
| 软件公司股权 | ORIGINAL | Generic business type |
| 国际连锁加盟 | ORIGINAL | Generic business type |

### 3.4 Market Event Cards

| Item | Category | Notes |
|------|----------|-------|
| Stock boom / crash events | ORIGINAL | Generic market mechanics; fictional stock targets |
| Real estate boom | ORIGINAL | Generic market concept |
| Business M&A boom | ORIGINAL | Generic market concept |

### 3.5 Doodad Cards

| Item | Category | Notes |
|------|----------|-------|
| All 10 doodad cards (手机, 度假, 汽车维修, etc.) | ORIGINAL | Generic life expense categories |

### 3.6 Fast Track Opportunity Cards

| Item | Category | Notes |
|------|----------|-------|
| All fast track cards | ORIGINAL | Original descriptions and values |

### 3.7 Story Cards (商帮历史)

| Item | Category | Notes |
|------|----------|-------|
| 晋商系列 (票号传奇, 乔家大院, 走西口, 万里茶路) | INSPIRED | Based on well-known public historical events; original narrative text |
| 徽商系列 | INSPIRED | Based on public historical figures/events; original text |
| 其他商帮系列 | INSPIRED | Based on public history; original text |
| Historical notes | INSPIRED | Summaries of commonly known historical facts |

**Note:** Historical facts and events are not copyrightable. The narrative text is original. Historical figures referenced (乔致庸, etc.) are historical figures from public record.

---

## 4. Careers

| Item | Category | Notes |
|------|----------|-------|
| All career names (清洁工, 保安, 快递员, 外卖员, 司机, 护士, 教师, etc.) | ORIGINAL | Generic real-world job titles — not protected expression |
| Salary / expense numbers | ORIGINAL | Original numeric balance design |
| Career descriptions | ORIGINAL | Original short text |
| Career icons (from lucide-vue-next) | THIRD_PARTY | ISC License — see ASSET_LICENSES.md |

---

## 5. Dreams

| Item | Category | Notes |
|------|----------|-------|
| All dream names and descriptions | ORIGINAL | Generic lifestyle/charity/investment categories |
| Dream stories | ORIGINAL | Original narrative text |

---

## 6. UI & Visual Design

| Item | Category | Notes |
|------|----------|-------|
| Board layout (24-cell rat race, fast track) | INSPIRED | Board game layout is a functional/mechanical element |
| Color scheme (dark mode, blue primary) | ORIGINAL | Doubao design system theme — original implementation |
| Component layout (financial statement, card modal) | ORIGINAL | Original Vue components |
| Dice animation | ORIGINAL | Original CSS animation implementation |
| Chart visualizations | ORIGINAL | Original Canvas/SVG implementation |

---

## 7. Audio

| Item | Category | Notes |
|------|----------|-------|
| Audio assets | — | None currently used in the project |

---

## 8. Fonts

| Item | Category | Notes |
|------|----------|-------|
| Stack Sans Text | UNKNOWN | Referenced in CSS but not bundled — falls back to system fonts. Needs verification. |
| JetBrains Mono | UNKNOWN | Referenced in CSS but not bundled — falls back to system fonts. Needs verification. |
| System UI fonts | THIRD_PARTY | System-provided, no licensing concern |

**Resolution plan:** Remove custom font references that aren't actually bundled, or replace with explicitly licensed fonts.

---

## 9. Icons & Images

| Item | Category | Notes |
|------|----------|-------|
| lucide-vue-next icons | THIRD_PARTY | ISC License — see ASSET_LICENSES.md |
| logo.svg (Vue logo) | THIRD_PARTY | MIT License — Vue.js logo. **Should be replaced with original Ledger logo.** |
| favicon.ico | UNKNOWN | Source unclear. Needs replacement with original asset. |

---

## 10. Code

| Item | Category | Notes |
|------|----------|-------|
| All source code (.ts, .vue) | ORIGINAL | Written by project contributors |
| npm dependencies | THIRD_PARTY | See THIRD_PARTY_NOTICES.md |
| Game engine architecture | ORIGINAL | Original engine design (GameEngine, FinancialEngine, etc.) |
| AI decision logic | ORIGINAL | Original implementation |

---

## 11. Documentation

| Item | Category | Notes |
|------|----------|-------|
| README.md | ORIGINAL | Original project description |
| PRD.md (after v2.0 rewrite) | ORIGINAL | Original requirements document |
| docs/*.md (architecture docs) | ORIGINAL | Original technical documentation |
| Game rules text (RulesView) | ORIGINAL | Original rule explanations |

---

## 12. UNKNOWN Items (Must Resolve)

| # | Item | Risk | Resolution | Status |
|---|------|------|------------|--------|
| 1 | logo.svg contains Vue.js logo | LOW-MEDIUM | Replace with original Ledger logo | ⏳ Pending |
| 2 | favicon.ico source | LOW | Replace with original favicon | ⏳ Pending |
| 3 | "Stack Sans Text" font reference | LOW | Remove or replace with system font stack | ⏳ Pending |
| 4 | "JetBrains Mono" font reference | LOW | Remove or verify OFL compliance | ⏳ Pending |
| 5 | PRD.md contains Cashflow 101 references | HIGH | Full rewrite of PRD background section | ⏳ In Progress |

---

## 13. Risk Assessment Summary

| Risk Level | Count | Items |
|-----------|-------|-------|
| HIGH | 1 | PRD.md third-party game references |
| MEDIUM | 1 | Vue logo as project logo |
| LOW | 3 | Font references, favicon |
| NONE / CLEARED | — | All card content, careers, game code, UI components |

---

## 14. Conclusion

The vast majority of Ledger's content is **original or inspired by general concepts** (which is permitted — copyright protects expression, not ideas or mechanics). The main items requiring action before public release are:

1. ✅ Rewrite PRD.md to remove third-party game references (in progress)
2. ⏳ Replace logo.svg with original Ledger logo
3. ⏳ Replace favicon.ico with original Ledger favicon
4. ⏳ Clean up font references in base.css
