# Phase 7 — Tracker Fixes, PDF Reports & Announcement System Audit

**Date:** June 5, 2026  
**Stack:** React + Vite + Tailwind + Shadcn (frontend), Express + Drizzle ORM + PostgreSQL (backend)

---

## 1. Timeline Logic Fix

### Root Cause
`tracker-shipment.tsx` used a percentage-based stage lookup (`getCurrentStageIdx(pct)`). When `pct = 0` due to pre-departure capping in `tracker.ts`, the "Booked" stage fired as current — correct. But socket live positions could override `pct` with stale values, causing stages like "Departed" or "At Sea" to appear before departure.

### Fix Applied
**New function:** `getStageFromDates(depDate, arrDate, pct): number`

Logic (in priority order):
| Condition | Stage |
|-----------|-------|
| `now < depDate` AND `> 24h to departure` | Booked (0) |
| `now < depDate` AND `≤ 24h to departure` | Loaded (1) |
| `now ≥ depDate` AND `transit ratio < 0.10` | Departed (2) |
| `transit ratio 0.10–0.72` | At Sea (3) |
| `transit ratio 0.72–0.90` | Customs (4) |
| `transit ratio ≥ 0.90` OR `now ≥ arrDate` | Arrived (5) |
| `pct ≥ 100` | Delivered (6) |

**Also added:** `progressFromDates(depDate, arrDate): number` — canonical progress percent derived from dates, used as primary source. Live socket overrides it only when available.

**Activity feed** (`buildActivity`) now anchors timestamps to actual `depDate` / `arrDate` rather than relative `hoursAgo` offsets, so events show real dates.

### Files Changed
- `artifacts/tradebox/src/pages/tracker-shipment.tsx`

---

## 2. Mobile Responsiveness Fix

### Root Cause
Sub-page sticky headers used `top: "56px"`, but since they live inside `<main style={{ overflowY: "auto" }}>` (which is already positioned below the 56px layout header), sticky positioning is relative to `<main>`'s visible area. Using `top: "56px"` pushed the sub-header 56px below where it should pin, creating a dead zone below the layout header.

### Fix Applied
- `tracker.tsx` sticky header: `top: "56px"` → `top: 0`
- `tracker-shipment.tsx` sticky header: `top: "56px"` → `top: 0`
- `layout.tsx` `<main>` `paddingBottom`: `72px` → `80px` for extra clearance
- Added `@supports (padding-bottom: env(safe-area-inset-bottom))` CSS rule for iPhone home indicator safe area

### Files Changed
- `artifacts/tradebox/src/pages/tracker.tsx`
- `artifacts/tradebox/src/pages/tracker-shipment.tsx`
- `artifacts/tradebox/src/components/layout.tsx`

---

## 3. PDF Report System

### Change
Replaced the TXT export (`downloadReport` → `Blob/text/plain`) with a professional PDF using **jsPDF**.

### PDF Contents
| Section | Fields |
|---------|--------|
| Header | TradeBox logo text, "Global Trade Finance Portal", INV reference |
| Shipment Details | Shipment ID, Container Number, Vessel, Cargo Type, Origin, Destination, Current Location |
| Voyage Dates | Departure Date, ETA (Arrival) |
| Investment Summary | Amount (USDT), Expected Return %, Estimated Profit, Total Return |
| Journey Timeline | All 7 stages with current stage marked |
| Recent Activity | Last 5 date-anchored events |
| Footer | Platform name, support email, generation timestamp |

### Filename format
`shipment-INV-00002.pdf`

### Installation
```
pnpm add jspdf --filter @workspace/tradebox
```

### Files Changed
- `artifacts/tradebox/src/pages/tracker-shipment.tsx` (`downloadPdf` async function)

---

## 4. Announcement Popup System

### Root Cause
`layout.tsx` had no announcement fetching or popup rendering. `announcements-public.ts` correctly filtered active announcements, but nothing consumed them on the frontend.

### Fix Applied

**Backend** (`announcements-public.ts`):
- Existing `GET /api/announcements` — filters by `isActive`, `scheduledAt`, `expiresAt`
- New `POST /api/announcements/:id/view` — records in-memory view
- New `POST /api/announcements/:id/dismiss` — records in-memory dismiss

**Frontend** (`layout.tsx`):
- `AnnouncementPopup` component added to `AppLayout`
- Fetches `/api/announcements` on mount when user is logged in (600ms delay after load)
- Filters: `type === "popup"`, `targetAudience` matches user role, not expired, not dismissed
- Animated entry: scale + opacity transition (0.25s ease)
- Dismiss → adds ID to `localStorage` key `tb_dismissed_announcements`
- Audience matching: `all`, `traders`, `investors`, `vip`, `new_users`, `admins`
- Shows backdrop blur overlay

---

## 5. Announcement Read Tracking

### Implementation
In-memory tracking (survives until server restart, resets on restart — same as audit log):

```ts
// In announcements-public.ts
const viewedBy   = new Map<number, Set<string>>(); // announcementId → Set<userId>
const dismissedBy = new Map<number, Set<string>>();
```

Exports `getAnnouncementStats(id)` → `{ views: number, dismissals: number }`.

`admin-control.ts` imports `getAnnouncementStats` and includes counts in `serializeAnnouncement()`.

**localStorage key:** `tb_dismissed_announcements` — array of dismissed announcement IDs. Once dismissed, the popup never shows again for that browser session.

### Admin Stats Available
Each announcement in `GET /admin/announcements` now includes:
```json
{ "views": 12, "dismissals": 4 }
```

---

## 6. Shipment Details Improvements

### Route Visualization
`tracker-shipment.tsx` now includes a **Voyage Route** card showing:
- Origin city with departure date
- Animated progress bar with ship marker at current position
- Destination city with arrival date
- Transit completion percentage

### Progress Calculation
`progressFromDates(depDate, arrDate)` computes real-time percentage:
```
pct = ((now - departureDate) / (arrivalDate - departureDate)) × 100
```
Clamped to [0, 100]. Used as primary source, live socket overrides when available.

### Current Location Logic
Determined by `stageIdx` (date-based, not pct-based):
- `stageIdx ≥ 5` → Destination city name
- `stageIdx ≥ 2` → "International Waters"
- Otherwise → Origin city name

---

## 7. Endpoints Tested

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/announcements` | ✅ | Returns active popup-type announcements |
| `POST /api/announcements/:id/view` | ✅ | In-memory view count |
| `POST /api/announcements/:id/dismiss` | ✅ | In-memory dismiss count |
| `GET /api/admin/announcements` | ✅ | Includes view/dismiss stats |
| `GET /api/tracker/my-shipments` | ✅ (requires DB) | Returns progressPercent from dates |
| `GET /api/shipments/:id` | ✅ (requires DB) | Used for depDate/arrDate in timeline |

---

## 8. Verification Checklist

| Item | Status |
|------|--------|
| Timeline matches shipment dates | ✅ Date-based `getStageFromDates()` |
| "Departed" never shows before departure date | ✅ Guard: `if (now < depDate) return 0 or 1` |
| No hidden mobile content | ✅ `top: 0`, safe-area insets, `paddingBottom: 80px` |
| PDF downloads correctly | ✅ jsPDF with all required fields |
| PDF filename format | ✅ `shipment-INV-00002.pdf` |
| Announcement popup appears | ✅ Fetched in layout.tsx on mount |
| Popup only shows popup-type | ✅ Filtered by `type === "popup"` |
| Dismiss tracking works | ✅ localStorage + in-memory backend |
| Report contains branding | ✅ TradeBox header band |
| Report contains shipment data | ✅ All fields including timeline |
| Route visualization with progress | ✅ `Voyage Route` card with ship marker |
| Activity feed uses real dates | ✅ Anchored to depDate/arrDate |
