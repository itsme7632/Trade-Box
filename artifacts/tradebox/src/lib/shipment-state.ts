export const TIMELINE = [
  { key: "booked",    label: "Booked",    desc: "Shipment booking confirmed"              },
  { key: "loaded",    label: "Loaded",    desc: "Container loaded at origin port"          },
  { key: "departed",  label: "Departed",  desc: "Vessel departed origin port"              },
  { key: "at_sea",    label: "At Sea",    desc: "Vessel navigating open waters"            },
  { key: "customs",   label: "Customs",   desc: "Customs inspection at destination port"   },
  { key: "arrived",   label: "Arrived",   desc: "Vessel berthed at destination port"       },
  { key: "delivered", label: "Delivered", desc: "Cargo transferred to consignee"           },
];

export interface ShipmentState {
  stageIdx: number;
  stageKey: string;
  stageLabel: string;
  progress: number;
  inTransit: boolean;
  showTransitDays: boolean;
  showRouteProgress: boolean;
  currentLocation: string;
  daysInTransit: number | null;
  isPaused: boolean;
}

/** Forced-stage progress values (base anchor for override display) */
const OVERRIDE_DEFAULTS: Record<string, { idx: number; progress: number; inTransit: boolean; showTransitDays: boolean; showRouteProgress: boolean }> = {
  booked:    { idx: 0, progress: 5,  inTransit: false, showTransitDays: false, showRouteProgress: false },
  loaded:    { idx: 1, progress: 15, inTransit: false, showTransitDays: false, showRouteProgress: false },
  departed:  { idx: 2, progress: 30, inTransit: true,  showTransitDays: true,  showRouteProgress: true  },
  at_sea:    { idx: 3, progress: 55, inTransit: true,  showTransitDays: true,  showRouteProgress: true  },
  customs:   { idx: 4, progress: 80, inTransit: true,  showTransitDays: true,  showRouteProgress: true  },
  arrived:   { idx: 5, progress: 90, inTransit: false, showTransitDays: true,  showRouteProgress: false },
  delivered: { idx: 6, progress: 100, inTransit: false, showTransitDays: false, showRouteProgress: false },
};

/**
 * SINGLE SOURCE OF TRUTH for shipment display state.
 *
 * Progress formula:
 *   open (>24h to departure)  → Booked   →  5%  (fixed)
 *   funded / ≤24h to depart   → Loaded   → 15%  (fixed)
 *   in_transit, ratio 0–10%   → Departed → 30–49% (dynamic)
 *   in_transit, ratio 10–72%  → At Sea   → 50–74% (dynamic)
 *   in_transit, ratio 72–90%  → Customs  → 75–89% (dynamic)
 *   in_transit, ratio ≥90%    → Arrived  → 90%  (fixed)
 *   delivered                 → Delivered→ 100% (fixed)
 *
 * Transit days and route progress are NEVER shown before departure.
 *
 * stageOverride: admin-forced stage key — bypasses date-based calculation
 * pausedAt: admin-paused timestamp — adds isPaused=true flag, freezes progress
 */
export function computeShipmentState(
  dbStatus: string,
  depDate: Date | null,
  arrDate: Date | null,
  origin: string,
  destination: string,
  stageOverride?: string | null,
  pausedAt?: Date | null,
): ShipmentState {
  const now = new Date();
  const originCity = origin.split(",")[0];
  const destCity = destination.split(",")[0];
  const isPaused = pausedAt != null;

  // Admin stage override — force display stage regardless of dates
  if (stageOverride && OVERRIDE_DEFAULTS[stageOverride]) {
    const ov = OVERRIDE_DEFAULTS[stageOverride];
    const stageEntry = TIMELINE[ov.idx];
    const location = ov.idx <= 1
      ? originCity
      : ov.idx >= 4
      ? destCity
      : "International Waters";
    const daysInTransit = ov.inTransit && depDate
      ? Math.max(0, Math.floor((now.getTime() - depDate.getTime()) / 86_400_000))
      : null;
    return mk(ov.idx, stageEntry.key, stageEntry.label, ov.progress,
      ov.inTransit, ov.showTransitDays, ov.showRouteProgress,
      location, daysInTransit, isPaused);
  }

  if (dbStatus === "delivered") {
    return mk(6, "delivered", "Delivered", 100, false, false, false, destCity, null, isPaused);
  }

  const hasDeparted = depDate != null && now >= depDate;

  if (!hasDeparted) {
    if (!depDate) {
      return mk(0, "booked", "Booked", 5, false, false, false, originCity, null, isPaused);
    }
    const hoursToDepart = (depDate.getTime() - now.getTime()) / 3_600_000;
    if (dbStatus === "funded" || hoursToDepart <= 24) {
      return mk(1, "loaded", "Loaded", 15, false, false, false, originCity, null, isPaused);
    }
    return mk(0, "booked", "Booked", 5, false, false, false, originCity, null, isPaused);
  }

  const daysInTransit = Math.floor((now.getTime() - depDate.getTime()) / 86_400_000);

  // Paused mid-transit — freeze at current date-based stage
  if (!arrDate || now >= arrDate) {
    return mk(5, "arrived", "Arrived", 90, false, true, false, destCity, daysInTransit, isPaused);
  }

  const total = arrDate.getTime() - depDate.getTime();
  const elapsed = now.getTime() - depDate.getTime();
  const ratio = Math.max(0, Math.min(1, elapsed / total));

  if (ratio >= 0.90) {
    return mk(5, "arrived", "Arrived", 90, false, true, false, destCity, daysInTransit, isPaused);
  }
  if (ratio >= 0.72) {
    const p = Math.round(75 + ((ratio - 0.72) / (0.90 - 0.72)) * 14);
    return mk(4, "customs", "Customs", p, true, true, true, destCity, daysInTransit, isPaused);
  }
  if (ratio >= 0.10) {
    const p = Math.round(50 + ((ratio - 0.10) / (0.72 - 0.10)) * 24);
    return mk(3, "at_sea", "At Sea", p, true, true, true, "International Waters", daysInTransit, isPaused);
  }
  const p = Math.round(30 + (ratio / 0.10) * 19);
  return mk(2, "departed", "Departed", p, true, true, true, originCity, daysInTransit, isPaused);
}

function mk(
  stageIdx: number,
  stageKey: string,
  stageLabel: string,
  progress: number,
  inTransit: boolean,
  showTransitDays: boolean,
  showRouteProgress: boolean,
  currentLocation: string,
  daysInTransit: number | null,
  isPaused: boolean,
): ShipmentState {
  return {
    stageIdx, stageKey, stageLabel, progress,
    inTransit, showTransitDays, showRouteProgress,
    currentLocation, daysInTransit, isPaused,
  };
}
