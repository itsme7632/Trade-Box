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
}

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
 */
export function computeShipmentState(
  dbStatus: string,
  depDate: Date | null,
  arrDate: Date | null,
  origin: string,
  destination: string,
): ShipmentState {
  const now = new Date();
  const originCity = origin.split(",")[0];
  const destCity = destination.split(",")[0];

  if (dbStatus === "delivered") {
    return mk(6, "delivered", "Delivered", 100, false, false, false, destCity, null);
  }

  const hasDeparted = depDate != null && now >= depDate;

  if (!hasDeparted) {
    if (!depDate) {
      return mk(0, "booked", "Booked", 5, false, false, false, originCity, null);
    }
    const hoursToDepart = (depDate.getTime() - now.getTime()) / 3_600_000;
    if (dbStatus === "funded" || hoursToDepart <= 24) {
      return mk(1, "loaded", "Loaded", 15, false, false, false, originCity, null);
    }
    return mk(0, "booked", "Booked", 5, false, false, false, originCity, null);
  }

  const daysInTransit = Math.floor((now.getTime() - depDate.getTime()) / 86_400_000);

  if (!arrDate || now >= arrDate) {
    return mk(5, "arrived", "Arrived", 90, false, true, false, destCity, daysInTransit);
  }

  const total = arrDate.getTime() - depDate.getTime();
  const elapsed = now.getTime() - depDate.getTime();
  const ratio = Math.max(0, Math.min(1, elapsed / total));

  if (ratio >= 0.90) {
    return mk(5, "arrived", "Arrived", 90, false, true, false, destCity, daysInTransit);
  }
  if (ratio >= 0.72) {
    const p = Math.round(75 + ((ratio - 0.72) / (0.90 - 0.72)) * 14);
    return mk(4, "customs", "Customs", p, true, true, true, destCity, daysInTransit);
  }
  if (ratio >= 0.10) {
    const p = Math.round(50 + ((ratio - 0.10) / (0.72 - 0.10)) * 24);
    return mk(3, "at_sea", "At Sea", p, true, true, true, "International Waters", daysInTransit);
  }
  const p = Math.round(30 + (ratio / 0.10) * 19);
  return mk(2, "departed", "Departed", p, true, true, true, originCity, daysInTransit);
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
): ShipmentState {
  return {
    stageIdx, stageKey, stageLabel, progress,
    inTransit, showTransitDays, showRouteProgress,
    currentLocation, daysInTransit,
  };
}
