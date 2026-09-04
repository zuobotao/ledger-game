# Asset Licenses — Ledger

**Date:** 2026-09-04
**Version:** v2.0

This document tracks all visual, audio, and font assets used in Ledger, along with their licenses and attribution requirements.

---

## 1. Icons

| Asset | Source | License | Commercial Use | Attribution |
|-------|--------|---------|----------------|-------------|
| lucide-vue-next (all UI icons) | [Lucide Icons](https://lucide.dev/) | ISC | Yes | Not required (but appreciated) |

**Lucide License Summary:**
```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2024 as part of Feather Icons.
All other copyright for Lucide are held by Lucide Contributors 2024.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted...
```

---

## 2. Images

| Asset | Source | License | Commercial Use | Attribution |
|-------|--------|---------|----------------|-------------|
| logo.svg | Vue.js Project (currently) | MIT | Yes | ⚠️ Must be replaced with original Ledger logo |
| favicon.ico | Unknown (placeholder) | UNKNOWN | — | ⚠️ Must be replaced |

**Action items:**
- [ ] Replace logo.svg with original Ledger logo
- [ ] Replace favicon.ico with original Ledger favicon

---

## 3. Fonts

| Asset | Source | License | Commercial Use | Attribution |
|-------|--------|---------|----------------|-------------|
| Stack Sans Text | Not bundled — CSS reference only | UNKNOWN | — | ⚠️ Remove reference or verify license |
| JetBrains Mono | Not bundled — CSS reference only | OFL-1.1 (if used) | Yes | ⚠️ Remove or explicitly add OFL font |
| System UI fonts (ui-sans-serif, system-ui, -apple-system) | Operating system | N/A | Yes | N/A |
| ui-monospace (fallback) | Operating system | N/A | Yes | N/A |

**Current status:** No font files are bundled with the project. CSS references custom font names that fall back to system fonts.

**Action items:**
- [ ] Remove "Stack Sans Text" reference (not bundled, source unknown)
- [ ] Replace with standard system font stack, or add an explicitly-licensed OFL font

---

## 4. Audio

| Asset | Source | License | Commercial Use | Attribution |
|-------|--------|---------|----------------|-------------|
| (none) | — | — | — | — |

No audio assets are currently used in the project.

---

## 5. CSS & Design Tokens

| Asset | Source | License | Commercial Use | Attribution |
|-------|--------|---------|----------------|-------------|
| Tailwind CSS | Tailwind Labs | MIT | Yes | Not required |
| Doubao design tokens (colors, radius) | Ledger Team (inspired by Doubao) | Apache-2.0 | Yes | Original implementation |

**Note:** Design tokens (color values, radius sizes) are functional elements and not subject to copyright protection. The specific CSS implementation is original.

---

## 6. Third-Party Libraries (Code Dependencies)

See `THIRD_PARTY_NOTICES.md` at repository root for full dependency license list.

---

## 7. Original Assets

| Asset | Author | License |
|-------|--------|---------|
| All Vue components | Ledger Contributors | Apache-2.0 |
| All game data (cards, careers, dreams) | Ledger Contributors | Apache-2.0 |
| Game engine code | Ledger Contributors | Apache-2.0 |
| UI layout & styling | Ledger Contributors | Apache-2.0 |
| Chart visualizations | Ledger Contributors | Apache-2.0 |
| Dice animations (CSS) | Ledger Contributors | Apache-2.0 |

---

## 8. Risk Summary

| Risk Level | Items |
|-----------|-------|
| HIGH | 0 |
| MEDIUM | 1 (Vue logo used as project logo) |
| LOW | 2 (favicon, font references) |
| CLEAR | All other assets |

---

## 9. Contribution Policy

All new assets added to Ledger must:

1. Be original work by the contributor, or
2. Have a clearly-verified license compatible with Apache-2.0, and
3. Be added to this document with full attribution details.

**Prohibited sources:**
- Google Image search results (unknown license)
- Pinterest / social media images
- Other games' extracted assets
- AI-generated images without clear platform TOS for commercial use
- Unknown-origin PNG/SVG files found online
