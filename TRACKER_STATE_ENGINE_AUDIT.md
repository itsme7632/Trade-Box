# TRACKER STATE ENGINE AUDIT

## Overview

All shipment progress, stage, location, and transit-day values across the tracker
are derived from a **single function**: `computeShipmentState()` in
`artifacts/tradebox/src/lib/shipment-state.ts`.

No component computes progress independently. No socket value overrides the stage.

---

## Calculation Method

### Input

| Field | Source | Notes |
|-------|--------|-------|
| `dbStatus` | `shipments.status` (DB) | `open \| funded \| in_transit \| delivered` |
| `depDate` | `shipments.departure_date` | Parsed as JS Date |
| `arrDate` | `shipments.arrival_date` | Parsed as JS Date |
| `origin` | `shipments.origin` | City extracted from first token |
| `destination` | `shipments.destination` | City extracted from first token |

### Decision Tree

```
dbStatus === "delivered"
  → Stage: Delivered (6), Progress: 100%, No transit display

now < depDate  (not yet departed)
  → dbStatus === "funded" OR hoursToDepart ≤ 24
      → Stage: Loaded (1), Progress: 15%
  → else
      → Stage: Booked (0), Progress: 5%

now ≥ depDate  (departed)
  → now ≥ arrDate  (past arrival)
      → Stage: Arrived (5), Progress: 90%
  → ratio = (now - depDate) / (arrDate - depDate)
      → ratio ≥ 0.90  → Arrived  (5), Progress: 90%
      → ratio ≥ 0.72  → Customs  (4), Progress: 75 + ((ratio-0.72)/0.18)*14
      → ratio ≥ 0.10  → At Sea   (3), Progress: 50 + ((ratio-0.10)/0.62)*24
      → else          → Departed (2), Progress: 30 + (ratio/0.10)*19
```

---

## Progress Formula

### Fixed-anchor stages (pre-departure & terminal)

| Stage | DB Status | Progress |
|-------|-----------|----------|
| Booked | `open` | **5%** |
| Loaded | `funded` or ≤24h to departure | **15%** |
| Arrived | past arrivalDate, not delivered | **90%** |
| Delivered | `delivered` | **100%** |

### Dynamic range stages (in_transit only)

| Stage | Ratio Range | Progress Range | Formula |
|-------|-------------|----------------|---------|
| Departed | 0 – 10% | 30 – 49% | `30 + (ratio / 0.10) * 19` |
| At Sea | 10 – 72% | 50 – 74% | `50 + ((ratio-0.10) / 0.62) * 24` |
| Customs | 72 – 90% | 75 – 89% | `75 + ((ratio-0.72) / 0.18) * 14` |

Ranges are **continuous** — no jump at stage boundaries.

---

## Stage Mapping (7 Stages)

| # | Key | Label | Progress | inTransit | showTransitDays | showRouteProgress |
|---|-----|-------|----------|-----------|-----------------|-------------------|
| 1 | `booked` | Booked | 5% | ✗ | ✗ | ✗ |
| 2 | `loaded` | Loaded | 15% | ✗ | ✗ | ✗ |
| 3 | `departed` | Departed | 30–49% | ✓ | ✓ | ✓ |
| 4 | `at_sea` | At Sea | 50–74% | ✓ | ✓ | ✓ |
| 5 | `customs` | Customs | 75–89% | ✓ | ✓ | ✓ |
| 6 | `arrived` | Arrived | 90% | ✗ | ✓ | ✗ |
| 7 | `delivered` | Delivered | 100% | ✗ | ✗ | ✗ |

### Display Gates

| Field | When shown |
|-------|-----------|
| Transit days counter | `showTransitDays === true` (stages 3–6) |
| Route % complete label | `showRouteProgress === true` (stages 3–5) |
| "Awaiting Departure" text | `showRouteProgress === false` (stages 1–2, 6–7) |
| ETA countdown (days) | Only when `inTransit === true` |
| Current Location | `state.currentLocation` — always from engine |

---

## Test Cases

### Stage 1 — BOOKED

```
Input:  dbStatus="open", depDate=+5 days, arrDate=+23 days
Output: stageIdx=0, stageLabel="Booked", progress=5,
        inTransit=false, showTransitDays=false, showRouteProgress=false,
        currentLocation="Origin City", daysInTransit=null

Expected UI:
  ✓ Badge: BOOKED
  ✓ Progress bar: 5%
  ✓ Timeline: Stage 1/7 — Booked (current)
  ✓ Route: "Awaiting Departure"
  ✗ Transit days: hidden
  ✗ "Xd transit": hidden
  ✗ "X% complete": hidden (shows "Awaiting Departure")
```

### Stage 2 — LOADED

```
Input:  dbStatus="funded", depDate=+10h, arrDate=+18 days
Output: stageIdx=1, stageLabel="Loaded", progress=15,
        inTransit=false, showTransitDays=false, showRouteProgress=false,
        currentLocation="Origin City", daysInTransit=null

Expected UI:
  ✓ Badge: LOADED
  ✓ Progress bar: 15%
  ✓ Timeline: Stage 2/7 — Loaded (current)
  ✓ Route: "Awaiting Departure"
  ✗ Transit days: hidden
```

### Stage 3 — DEPARTED

```
Input:  dbStatus="in_transit", depDate=-1 day, arrDate=+9 days
        ratio = 1/(1+9) = 0.10
Output: stageIdx=2, stageLabel="Departed", progress=30,
        inTransit=true, showTransitDays=true, showRouteProgress=true,
        currentLocation="Origin City", daysInTransit=1

Expected UI:
  ✓ Badge: DEPARTED
  ✓ Progress bar: 30%
  ✓ Timeline: Stage 3/7 — Departed (current)
  ✓ Route: "10d transit · 30% complete"
  ✓ Transit days: "1 / 10 days total"
```

### Stage 4 — AT SEA

```
Input:  dbStatus="in_transit", depDate=-10 days, arrDate=+18 days
        ratio = 10/28 = 0.357
Output: stageIdx=3, stageLabel="At Sea",
        progress=50 + ((0.357-0.10)/0.62)*24 = 50+9 = 59,
        inTransit=true, showTransitDays=true, showRouteProgress=true,
        currentLocation="International Waters", daysInTransit=10

Expected UI:
  ✓ Badge: AT SEA
  ✓ Progress bar: ~59%
  ✓ Timeline: Stage 4/7 — At Sea (current)
  ✓ Route: "28d transit · 59% complete"
  ✓ Transit days: "10 / 28 days total"
  ✗ Previous bug: "BOOKED · 36%" — eliminated
```

### Stage 5 — CUSTOMS

```
Input:  dbStatus="in_transit", depDate=-25 days, arrDate=+2 days
        ratio = 25/27 = 0.926  →  capped to 0.90 boundary → Arrived
        
Input2: depDate=-20 days, arrDate=+5 days
        ratio = 20/25 = 0.80
Output: stageIdx=4, stageLabel="Customs",
        progress=75 + ((0.80-0.72)/0.18)*14 = 75+6 = 81,
        inTransit=true, showTransitDays=true, showRouteProgress=true,
        currentLocation="Destination City", daysInTransit=20

Expected UI:
  ✓ Badge: CUSTOMS
  ✓ Progress bar: ~81%
  ✓ Timeline: Stage 5/7 — Customs (current)
```

### Stage 6 — ARRIVED

```
Input:  dbStatus="in_transit", depDate=-28 days, arrDate=-1 day
Output: stageIdx=5, stageLabel="Arrived", progress=90,
        inTransit=false, showTransitDays=true, showRouteProgress=false,
        currentLocation="Destination City", daysInTransit=28

Expected UI:
  ✓ Badge: ARRIVED (or OVERDUE if still in_transit)
  ✓ Progress bar: 90%
  ✓ Timeline: Stage 6/7 — Arrived (current)
  ✓ Route: "Awaiting Delivery"  (showRouteProgress=false)
```

### Stage 7 — DELIVERED

```
Input:  dbStatus="delivered", depDate=any, arrDate=any
Output: stageIdx=6, stageLabel="Delivered", progress=100,
        inTransit=false, showTransitDays=false, showRouteProgress=false,
        currentLocation="Destination City", daysInTransit=null

Expected UI:
  ✓ Badge: DELIVERED
  ✓ Progress bar: 100%
  ✓ Timeline: Stage 7/7 — Delivered (current)
  ✓ ETA box: "Delivered"
```

---

## Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| BOOKED showing 36% | `progressFromDates()` used raw date math ignoring DB status | `computeShipmentState()` gates progress on `dbStatus` |
| Wrong stage shown | `getStageFromDates()` used `pct` from socket as input | Stage now derived purely from dates + dbStatus |
| Transit days shown pre-departure | No gate on `showTransitDays` | Added `showTransitDays` flag; counter hidden until departed |
| "18d transit" on booked ship | `mktShipment.transitDays` shown unconditionally | Gated behind `showRouteProgress` |
| Live socket overriding stage | `live?.progressPercent` used for stage calculation | Socket only provides LIVE badge; stage always from engine |
| Wrong live position match | `p.id === invId` (investment ID vs shipment ID namespace) | Fixed to `p.id === inv.shipmentId` |

---

## Files Changed

| File | Role |
|------|------|
| `artifacts/tradebox/src/lib/shipment-state.ts` | **State engine** — single source of truth |
| `artifacts/api-server/src/routes/tracker.ts` | API: adds `dbStatus`, `departureDate`, `arrivalDate`; status-aware `progressPercent` |
| `artifacts/tradebox/src/pages/tracker-shipment.tsx` | Detail page: uses state engine exclusively |
| `artifacts/tradebox/src/pages/tracker.tsx` | List page: uses state engine exclusively |
