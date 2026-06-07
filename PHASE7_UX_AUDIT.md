# TradeBox Phase 7 UX Overhaul — Audit & Changelog

## Overview

Phase 7 delivers a comprehensive design system upgrade across the entire TradeBox platform: a dark mode system, dashboard stats overhaul, notification drawer, wallet improvements, image upload, tracker improvements, cargo market card improvements, 4 new shipments, mobile responsiveness audit, and documentation.

---

## 1. Dark Mode System

### Implementation
- **Theme context** (`src/components/theme-context.tsx`) — `ThemeProvider` wraps the app; `useTheme()` exposes `{ theme, isDark, toggleTheme }`.
- **CSS custom properties** (`src/index.css`) — Full dual-token system: `:root` defines light values, `[data-theme="dark"]` overrides all tokens.
- **Persistence** — preference saved to `localStorage` (instant restore on page load) and synced to the server via `PATCH /api/profile/preferences` (survives device changes).
- **Toggle locations** — App header (sun/moon button), sidebar (same), and Profile → Preferences section (animated toggle switch).

### Token Reference

| Token | Light | Dark |
|---|---|---|
| `--tb-bg-page` | `#f6f8fb` | `#0d1117` |
| `--tb-bg-card` | `#ffffff` | `#161b22` |
| `--tb-bg-subtle` | `#f8fafc` | `#1c2333` |
| `--tb-text-primary` | `#0f172a` | `#e6edf3` |
| `--tb-text-secondary` | `#475569` | `#adbac7` |
| `--tb-text-muted` | `#94a3b8` | `#6e7681` |
| `--tb-border` | `#e8edf2` | `#21262d` |
| `--tb-header` | `#ffffff` | `#161b22` |
| `--tb-nav` | `#ffffff` | `#161b22` |
| `--tb-shadow-sm` | `0 1px 4px rgba(0,0,0,0.06)` | `0 1px 4px rgba(0,0,0,0.3)` |

### Pages Updated
All pages now use only CSS custom properties for colors; no hardcoded hex values in page-level styles.

---

## 2. Dashboard (Market Page) Overhaul

### Stats Grid
- 6-stat cards: Balance, Invested, Available, Completions, Referral Earnings, Portfolio ROI
- Responsive grid: 2 columns on mobile, 3 columns on ≥600px screens
- Source: `GET /api/market` now returns `availableBalance`, `completedShipments`, `referralEarnings`, `recentActivity[]`

### Section Reordering
1. Stats grid
2. Featured Opportunity (highest ROI active shipment)
3. News Center (pulled up — was at bottom)
4. Closing Soon (invested shipments nearing deadline)
5. Recent Activity (transactions feed with type icons)
6. All Shipments (full browsable list)

### Recent Activity Feed
- Types: `deposit`, `withdrawal`, `investment`, `return`, `commission`, `referral_bonus`
- Each entry shows icon, label, timestamp (relative), and amount with sign+color

---

## 3. Notification Drawer

### UI
- Slide-down panel from header bell icon (layout.tsx)
- Badge shows unread count (red dot)
- Tabs: "All" / "Unread" filter
- Bell icon turns blue when drawer is open

### Hooks
- `useGetUserNotifications()` — fetches paginated notifications
- `useGetUnreadNotificationCount()` — badge count (polling)
- `useMarkAllNotificationsRead()` — mark all read button
- `useMarkNotificationRead()` — tap-to-read individual

### Behavior
- Clicking any notification marks it read
- "Mark all read" clears badge instantly (optimistic)
- Unread items have a blue left border accent

---

## 4. Wallet Improvements

### Summary Cards (2-col grid, responsive)
- Total Balance (USDT), Invested (locked), Available (liquid), Portfolio ROI

### Deposit Tab
- **QR code** generated via `api.qrserver.com` free API from wallet address
- Copy-address button with clipboard feedback
- Deposit Timeline (3-step: send → confirm → credited)
- Network fee breakdown table (min deposit, fee, processing time)

### Withdraw Tab
- Amount input with "Max" button (fills available balance)
- Estimated fee display
- Estimated arrival (1–2 business days)

### History Tab
- Full transaction history with type icons and status badges

---

## 5. Shipment Card Improvements (`shipment-card.tsx`)

### New Fields Displayed
- **Min Investment** badge (e.g. "1,000 USDT min")
- **Remaining Capacity** (colored by fill level: green/yellow/red)
- **Arrival Date** (estimated)
- **Transit Days** count
- **Status Badge** (OPEN / FUNDING / TRANSIT / COMPLETED)
- **Route line** with origin → destination and arrow

### Visual Changes
- Color-coded left border accent per cargo type
- Capacity bar (filled/total)
- Flag emoji for cargo origin region

---

## 6. New Shipments (4 Added)

| Name | Route | ROI | Cargo |
|---|---|---|---|
| Copper Run | Chile → China | 9.5% | copper |
| Natural Gas Export | USA → Germany | 11.2% | gas |
| Palm Oil Delivery | Indonesia → India | 8.8% | palm oil |
| Automotive Parts | Japan → Mexico | 10.1% | automotive |

Total shipments: 10 (was 6)

---

## 7. Tracker Improvements

### CSS Variables
- Full dark mode compatibility: all colors use `var(--tb-*)` tokens
- Progress bar track and ship indicator bubble use card background

### Port Activity Feed
- Each activity entry cross-references the user's invested shipments by vessel name
- **"YOUR VESSEL" badge** (blue pill) highlights entries where the user has stake
- Subtle blue tint (`rgba(37,99,235,0.04)`) on highlighted rows
- Entry dividers use `var(--tb-border-subtle)` for dark mode compat

### KPI Cards
- At Sea / Ports / On-Time % / Delayed — all now use CSS vars
- Mobile: collapses from 4-col to 2×2 grid at <480px

---

## 8. Profile Page Updates

### Preferences Section
- Animated dark mode toggle (Sun/Moon icon + pill switch)
- Toggle calls `useTheme().toggleTheme()` — syncs to server and localStorage

### CSS Variables
- All Card, CardHeader, Row, Div helper components updated
- Stats grid: 4-col → 2×2 on mobile
- Hover states use `var(--tb-bg-subtle)` instead of hardcoded `#f8fafc`

---

## 9. Mobile Responsiveness Audit

### Issues Fixed

| Location | Issue | Fix |
|---|---|---|
| Tracker KPI strip | `repeat(4,1fr)` too narrow on phones | `.tb-grid-4` → 2×2 below 480px |
| Profile stats | Same | Same `.tb-grid-4` class |
| Market stats | 6 cards in 2-col → 3-col on wider | `.tb-grid-stats` breakpoint at 600px |
| Wallet summary | 2-col always | `.tb-grid-2` (stacks at <340px) |

### Responsive CSS Classes Added (`index.css`)

```css
.tb-grid-4    /* 4→2 columns at max-width:479px */
.tb-grid-2    /* 2→1 columns at max-width:339px */
.tb-grid-stats /* 2→3 columns at min-width:600px */
```

### Existing Mobile Patterns (Already Good)
- All pages use `maxWidth + margin:0 auto` for centering
- Sidebar collapses to bottom nav on mobile (existing)
- All cards use `overflow:hidden + textOverflow:ellipsis` for long text
- Shipment cards use `minWidth:0` on flex children for overflow safety

---

## 10. API Changes

### `GET /api/market`
Added to response:
```json
{
  "availableBalance": 4200,
  "completedShipments": 3,
  "referralEarnings": 150,
  "recentActivity": [
    { "type": "investment", "amount": 1000, "coin": "USDT", "timestamp": "...", "description": "..." }
  ]
}
```

### `PATCH /api/profile/preferences`
New endpoint (auth required):
```json
{ "darkMode": true }
```
Updates `darkMode` boolean in `users` table.

---

## Known Limitations / Future Work

1. **Dark mode QR code** — The QR code generated by `api.qrserver.com` always has a white background. For full dark mode polish, consider generating it client-side with a library like `qrcode.react`.
2. **Image upload** — Avatar upload UI exists (camera icon) but upload is not yet wired to a storage backend.
3. **Tracker map** — Phase 7 does not include a geographic map view; port activity is list-only.
4. **Notifications drawer animation** — Uses CSS `top` transition; on iOS Safari, `position:fixed` + animated `top` can cause repaints. Consider `transform:translateY` if jank is reported.
