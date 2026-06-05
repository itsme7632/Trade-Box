# Phase 5 — User Experience Audit

**Date:** June 5, 2026  
**Status:** ✅ Complete

---

## Summary

Phase 5 delivered all outstanding user-facing features: Profile page cleanup, a new Notifications page, Referral Center routing, Tracker/Market QA fixes, and a complete mobile layout audit.

---

## Changes Delivered

### 1. Profile Page Fixes ✅

**File:** `artifacts/tradebox/src/pages/profile.tsx`

| Fix | Before | After |
|-----|--------|-------|
| PRO badge | Showed amber "PRO" badge when 2FA was off | Shows neutral gray "2FA OFF" badge — no premium connotations |
| Currency format — Shipped stat | `$12,500` | `12,500 USDT` |
| Currency format — Profit stat | `+$340` | `+340 USDT` |
| Notifications row action | `toast({ title: "Coming soon" })` | Navigates to `/notifications` |
| Referral Guild row | Missing | Added — navigates to `/referrals` |
| Balance section | Missing | Two-card strip: Available USDT balance + Total Profit (both USDT) |

**Balance section** uses `useGetBalance()` (live from `/api/wallet/balance`) and shows:
- Available USDT (available wallet balance with 2 decimal places)
- Total Profit USDT (from trader stats)

---

### 2. Notifications Page ✅

**File:** `artifacts/tradebox/src/pages/notifications.tsx`  
**Route:** `/notifications`

Features:
- Pulls platform announcements from `/api/announcements` via `usePublicAnnouncements` hook (auto-refreshes every 60s)
- **Read/unread state** — tracked in localStorage under `tb_read_notifications`
- Unread count badge on the bell icon in the page header
- **Mark all read** button (only visible when unread count > 0)
- **Filter tabs** — All / Unread  
- Per-notification read state — clicking a card marks it read; a blue dot + left accent bar indicates unread
- Color-coded type badges: Announcement (blue), Alert (red), Maintenance (amber), Promotion (purple), Info (cyan)
- Empty states for both "no notifications" and "no unread"
- Expiry date shown inline when present

**API fix:** Updated `announcements-public.ts` to return `scheduledAt` and `createdAt` alongside the existing fields. Updated `usePublicAnnouncements` hook type accordingly.

---

### 3. Referral Center Route ✅

**Route:** `/referrals`  
**Renders:** Existing `Guild` component (full referral center with code copy, rank progress, tier stats, network tree, commission history)

The guild page was already feature-complete with:
- Guild Code copy/share
- Total earnings in USDT
- Rank badge + progress bar (Merchant → Trader → Broker → Magnate)
- 3-tier commission breakdown (7% / 2% / 1%)
- Network tab: referral tree with Trader ID, tier, join date, funded volume
- Commissions tab: chronological commission history

---

### 4. Layout — Bell Icon ✅

**File:** `artifacts/tradebox/src/components/layout.tsx`

- Added **Bell icon** (Lucide) to the mobile header, linking to `/notifications`
- Displayed between the Live indicator and the avatar button
- Consistent styling (32×32, rounded-10, `#f1f5f9` background)

---

### 5. Router Updates ✅

**File:** `artifacts/tradebox/src/components/router.tsx`

Added two new routes:
```
/notifications  →  NotificationsPage
/referrals      →  Guild (alias)
```

Both are protected (require auth) and wrapped in memo'd layout components following the existing pattern.

---

### 6. Tracker — Port Activity Sort Order ✅

**File:** `artifacts/api-server/src/routes/tracker.ts`

Port activity feed now returns events **newest-first** (descending by timestamp), giving users the most recent vessel arrivals/departures at the top of the feed.

---

## Currency Compliance Audit

All user-visible monetary values now use `USDT` format with no `$` prefix:

| Location | Status |
|----------|--------|
| Profile stats — Shipped | ✅ `12,500 USDT` |
| Profile stats — Profit | ✅ `+340 USDT` |
| Profile balance card | ✅ `1,000.00 USDT balance` |
| Market portfolio stat | ✅ `sub="USDT value"` |
| Market profit stat | ✅ `sub="USDT earned"` |
| Market live deliveries | ✅ `USDT profit` label |
| Tracker shipment cards | ✅ `1,000 USDT invested` |
| Guild earnings | ✅ `+340 USDT` |
| Wallet page | ✅ Pre-existing USDT format |
| Shipment detail fund form | ✅ Pre-existing USDT format |
| Notifications commissions | ✅ Pre-existing USDT format |

---

## No PRO / Premium References Audit

| Location | Status |
|----------|--------|
| Profile badge (2FA off) | ✅ Removed PRO — now shows "2FA OFF" in gray |
| Profile card header | ✅ No PRO/subscription copy |
| Navigation items | ✅ No premium labels |
| Plan/subscription UI | ✅ Not surfaced to users |

---

## Mobile QA Audit

### Pages reviewed (mobile 390px viewport):

| Page | Issues Found | Status |
|------|-------------|--------|
| Market | Stats grid 2×2 with proper wrapping | ✅ No overflow |
| Shipments list | Single column cards, full-width | ✅ Clean |
| Shipment Detail | Fund form and info rows wrap properly | ✅ Clean |
| Tracker | 4-col KPI strip can be tight on very narrow screens | ⚠️ Acceptable (≥360px ok) |
| Tracker — Shipment Detail | Scrollable, no clipping | ✅ Clean |
| Guild / Referrals | Tier grid 3×1 on narrow screens | ✅ Clean |
| Profile | Hero + stats + balance strip all within maxWidth 540px | ✅ Clean |
| Notifications | Single-column card list, no overflow | ✅ Clean |
| Wallet | Existing layout | ✅ Clean |
| Help / Support | Existing layout | ✅ Clean |

### Layout structural checks:
- Bottom nav: `height: 64px`, `position: fixed` — no content clipped underneath (main has `paddingBottom: 72px`) ✅
- Mobile header: `height: 56px`, `position: sticky, top: 0` — pages with sticky sub-headers correctly offset with `top: 56px` ✅
- Desktop sidebar: `display: flex` via `@media (min-width: 768px)` media query, mobile nav/header hidden — correct ✅

---

## Smoke Tests

| Feature | Test | Result |
|---------|------|--------|
| Profile — no PRO badge | Load `/profile` with 2FA off | ✅ Shows "2FA OFF" in gray |
| Profile — USDT stats | Load `/profile` | ✅ Values show `USDT` not `$` |
| Profile — balance section | Load `/profile` | ✅ Two balance cards visible |
| Profile → Notifications | Tap "Notifications" row | ✅ Navigates to `/notifications` |
| Profile → Referrals | Tap "Referral Guild" row | ✅ Navigates to `/referrals` (Guild UI) |
| Notifications — page loads | Navigate to `/notifications` | ✅ Renders empty state or announcement cards |
| Notifications — mark read | Click a card | ✅ Blue dot disappears, accent removed |
| Notifications — mark all | Click "Mark all read" | ✅ All marked, button disappears |
| Notifications — filter | Switch to "Unread" tab | ✅ Filters correctly |
| Referrals — route | Navigate to `/referrals` | ✅ Renders Guild component |
| Bell icon — header | View any authenticated page | ✅ Bell icon visible in mobile header |
| Bell → Notifications | Tap bell icon | ✅ Navigates to `/notifications` |
| Port activity — newest first | View Tracker page | ✅ Most recent events at top |
| API — announcements fields | `GET /api/announcements` | ✅ Returns `createdAt`, `scheduledAt` |

---

## Files Modified

| File | Change |
|------|--------|
| `artifacts/tradebox/src/pages/profile.tsx` | PRO badge → 2FA OFF, $ → USDT stats, balance section, nav fixes, icon updates |
| `artifacts/tradebox/src/pages/notifications.tsx` | **NEW** — Notifications page with read/unread, filtering |
| `artifacts/tradebox/src/components/router.tsx` | Added `/notifications` and `/referrals` routes |
| `artifacts/tradebox/src/components/layout.tsx` | Bell icon in mobile header |
| `artifacts/api-server/src/routes/announcements-public.ts` | Return `scheduledAt` + `createdAt` fields |
| `artifacts/api-server/src/routes/tracker.ts` | Port activity sorted newest-first |
| `lib/api-client-react/src/extra-hooks.ts` | Updated `usePublicAnnouncements` return type |
