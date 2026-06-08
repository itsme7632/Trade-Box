---
name: TradeBox semantic CSS tokens
description: Semantic CSS custom property tokens for status colors — defined in index.css, dark mode overrides included.
---

## Status color token families (defined in :root)
All follow the pattern `--tb-status-{COLOR}-{ROLE}`:

| Color   | bg                  | text                | border               |
|---------|---------------------|---------------------|----------------------|
| green   | `#ecfdf5`           | `#059669`           | `#a7f3d0`            |
| red     | `#fef2f2`           | `#dc2626`           | `#fecaca`            |
| blue    | `#eff6ff`           | `#2563eb`           | `#bfdbfe`            |
| yellow  | `#fffbeb`           | `#d97706`           | `#fde68a`            |
| purple  | `#f5f3ff`           | `#7c3aed`           | `#ddd6fe`            |
| cyan    | `#ecfeff`           | `#0891b2`           | `#a5f3fc`            |

## Dark mode overrides
All 6 families have dark mode overrides in `[data-theme="dark"]` in `index.css`.
Dark versions use rgba with low opacity backgrounds and lighter text.

## Balance strip classes
- `.tb-balance-blue` — dark mode overrides the light blue gradient
- `.tb-balance-green` — dark mode overrides the light green gradient
- `.tb-popup-icon-bg` — adapts popup icon background in dark mode

## Rule
**Always use CSS vars** for status/badge colors instead of hardcoded hex. Hardcoded colors break dark mode.

**Why:** The app supports full dark mode toggle via `[data-theme="dark"]` on `<html>`. CSS vars cascade automatically; hex values do not.
