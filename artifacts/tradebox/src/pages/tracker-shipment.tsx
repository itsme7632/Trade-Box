import { useParams, useLocation } from "wouter";
import { useGetTrackerShipments, useGetShipment } from "@workspace/api-client-react";
import {
  ArrowLeft, Ship, MapPin, Calendar, Package, Clock, ArrowRight,
  CheckCircle2, AlertTriangle, Download, MessageSquare, Hash,
  Navigation, Anchor, RefreshCw, TrendingUp, ChevronRight
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

// ─── constants ─────────────────────────────────────────────────────────────────

const cargoColors: Record<string, string> = {
  electronics: "#2563eb", cocoa: "#92400e", coffee: "#78350f",
  lithium: "#059669", textiles: "#7c3aed", pharmaceuticals: "#db2777",
  pharma: "#db2777", agricultural: "#16a34a", minerals: "#d97706", steel: "#475569",
};

const cargoEmoji: Record<string, string> = {
  electronics: "⚡", agricultural: "🌿", cocoa: "🍫", coffee: "☕",
  minerals: "⛏️", textiles: "🧵", lithium: "🔋", pharmaceuticals: "💊",
  pharma: "💊", steel: "⚙️",
};

// 7-step journey timeline
const TIMELINE = [
  { key: "booked",    label: "Booked",   desc: "Shipment booking confirmed",            threshold: 0   },
  { key: "loaded",    label: "Loaded",   desc: "Container loaded at origin port",        threshold: 5   },
  { key: "departed",  label: "Departed", desc: "Vessel departed origin port",            threshold: 12  },
  { key: "at_sea",    label: "At Sea",   desc: "Vessel navigating open waters",          threshold: 18  },
  { key: "customs",   label: "Customs",  desc: "Customs inspection at destination port", threshold: 75  },
  { key: "arrived",   label: "Arrived",  desc: "Vessel berthed at destination port",     threshold: 90  },
  { key: "delivered", label: "Delivered","desc": "Cargo transferred to consignee",       threshold: 100 },
];

function getCurrentStageIdx(pct: number) {
  let idx = 0;
  for (let i = 0; i < TIMELINE.length; i++) {
    if (pct >= TIMELINE[i].threshold) idx = i;
  }
  return idx;
}

// Deterministic container number from shipment id
function containerNum(shipmentId: number, invId: number) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = alpha[(shipmentId * 3 + 7) % 26] + alpha[(invId * 5 + 11) % 26] + alpha[(shipmentId + invId) % 26] + "U";
  const nums = String((shipmentId * invId * 17 + 100000) % 1000000).padStart(6, "0");
  return `${prefix}-${nums}`;
}

// Generate activity log from progress + known ports
function buildActivity(pct: number, origin: string, destination: string, now: Date) {
  const events: Array<{ time: string; title: string; desc: string; color: string; done: boolean }> = [];
  const originCity = origin.split(",")[0];
  const destCity = destination.split(",")[0];

  const addEvt = (hoursAgo: number, title: string, desc: string, color: string, threshold: number) => {
    if (pct >= threshold) {
      const t = new Date(now.getTime() - hoursAgo * 3600 * 1000);
      events.push({ time: format(t, "MMM dd, HH:mm"), title, desc, color, done: true });
    }
  };

  addEvt(0,    "Tracking active",              "Real-time position updates enabled",              "#059669", 0   );
  addEvt(96,   `Booking confirmed`,            "Shipment booked and confirmed",                   "#2563eb", 0   );
  addEvt(72,   `Container loaded`,             `Cargo loaded at ${originCity} terminal`,           "#2563eb", 5   );
  addEvt(60,   `Vessel departed`,              `Left ${originCity} port`,                         "#d97706", 12  );
  addEvt(48,   "Open sea navigation",          "Vessel transiting international waters",           "#0891b2", 18  );
  addEvt(8,    "Customs pre-clearance filed",  `Paperwork submitted to ${destCity} authorities`,  "#7c3aed", 70  );
  addEvt(4,    "Customs inspection",           `Inspection underway at ${destCity} port`,          "#7c3aed", 75  );
  addEvt(2,    `Arrived at destination`,       `Vessel berthed at ${destCity} port`,              "#059669", 90  );
  addEvt(0.5,  "Cargo transfer in progress",   "Container being offloaded",                       "#059669", 95  );
  addEvt(0,    "Delivery confirmed",           `Cargo transferred to consignee`,                  "#059669", 100 );

  return events.reverse();
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function S({ h = 60, radius = 12 }: { h?: number; radius?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: radius }} />;
}

// ─── Download report helper ────────────────────────────────────────────────────

function downloadReport(data: {
  vesselName: string; containerNum: string; cargoType: string;
  origin: string; destination: string; pct: number; etaDays: number | null;
  myAmount: number; invId: number; shipmentId: number;
}) {
  const lines = [
    "TRADEBOX SHIPMENT REPORT",
    "========================",
    `Generated: ${new Date().toISOString()}`,
    "",
    "SHIPMENT DETAILS",
    `Investment ID  : #${data.invId}`,
    `Shipment ID    : #${data.shipmentId}`,
    `Vessel         : ${data.vesselName}`,
    `Container      : ${data.containerNum}`,
    `Cargo Type     : ${data.cargoType}`,
    `Origin         : ${data.origin}`,
    `Destination    : ${data.destination}`,
    "",
    "PROGRESS",
    `Current Status : ${data.pct}% complete`,
    `ETA            : ${data.etaDays != null ? `${data.etaDays} days` : "N/A"}`,
    "",
    "INVESTMENT",
    `Amount         : ${data.myAmount.toLocaleString()} USDT`,
    "",
    "---",
    "TradeBox Global Trade Finance Portal",
    "support@tradebox.io",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tradebox-shipment-${data.invId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function TrackerShipmentDetail() {
  const params = useParams<{ id: string }>();
  const invId = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();

  const { data: trackerShipments, isLoading: listLoading } = useGetTrackerShipments();
  const livePositions = useTrackerPositions();

  // Find the investment row
  const inv = trackerShipments?.find(s => s.id === invId);

  // Get live position override
  const live = livePositions.find(p => p.id === invId);
  const pct = Math.min(100, Math.max(0, live?.progressPercent ?? inv?.progressPercent ?? 0));

  // Also fetch the market shipment for extra detail (departure/arrival dates, profit %, etc)
  const shipmentId = inv?.shipmentId;
  const { data: mktShipment, isLoading: mktLoading } = useGetShipment(
    shipmentId ?? 0,
    { query: { enabled: !!shipmentId } } as any
  );

  const isLoading = listLoading || (!!shipmentId && mktLoading);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "14px 16px", position: "sticky", top: "56px", zIndex: 10 }}>
          <S h={32} radius={8} />
        </div>
        <div style={{ padding: "16px", maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          <S h={100} /><S h={160} /><S h={200} /><S h={140} />
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <Ship size={40} color="#cbd5e1" />
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment not found</h2>
        <button onClick={() => navigate("/tracker")} style={{ padding: "8px 16px", borderRadius: "10px", background: "#2563eb", border: "none", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Back to Tracker
        </button>
      </div>
    );
  }

  const color      = cargoColors[inv.cargoType] || "#2563eb";
  const emoji      = cargoEmoji[inv.cargoType] || "📦";
  const stageIdx   = getCurrentStageIdx(pct);
  const overdue    = (inv.etaDays ?? 99) <= 0 && pct < 100;
  const contNum    = containerNum(inv.shipmentId, inv.id);
  const now        = new Date();
  const actFeed    = buildActivity(pct, inv.origin, inv.destination, now);
  const etaDate    = inv.etaDays != null ? addDays(now, inv.etaDays) : null;
  const depDate    = mktShipment?.departureDate
    ? (typeof mktShipment.departureDate === "string" ? parseISO(mktShipment.departureDate) : new Date(mktShipment.departureDate))
    : null;

  const reportData = {
    vesselName: inv.vesselName, containerNum: contNum, cargoType: inv.cargoType,
    origin: inv.origin, destination: inv.destination, pct,
    etaDays: inv.etaDays, myAmount: inv.myAmount ?? 0, invId, shipmentId: inv.shipmentId,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Sticky header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "12px 16px", position: "sticky", top: "56px", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "760px", margin: "0 auto" }}>
          <button onClick={() => navigate("/tracker")} style={{ width: "32px", height: "32px", borderRadius: "9px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={15} color="#64748b" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {inv.vesselName}
            </h1>
            <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              INV-{String(invId).padStart(5, "0")} · {inv.origin.split(",")[0]} → {inv.destination.split(",")[0]}
            </p>
          </div>
          {overdue && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: "10px", fontWeight: 700, color: "#dc2626", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
              <AlertTriangle size={10} /> OVERDUE
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "760px", margin: "0 auto" }}>

        {/* ── Hero card ──────────────────────────────────── */}
        <div style={{ background: "#ffffff", border: `1px solid ${overdue ? "#fecaca" : "#e8edf2"}`, borderRadius: "18px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: "12px" }}>
          <div style={{ height: "4px", background: overdue ? "linear-gradient(90deg, #dc2626, #f87171)" : `linear-gradient(90deg, ${color}, ${color}99)` }} />
          <div style={{ padding: "16px" }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em", color: overdue ? "#dc2626" : color, background: overdue ? "#fef2f2" : `${color}12`, border: `1px solid ${overdue ? "#fecaca" : `${color}30`}` }}>
                    {overdue ? "⚠ Overdue" : TIMELINE[stageIdx].label}
                  </span>
                  {live && (
                    <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ecfdf5", fontFamily: "'JetBrains Mono', monospace" }}>● LIVE</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                  {inv.vesselName}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>
                  {inv.cargoType} · {Math.round(pct)}% complete
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{inv.origin.split(",")[0]}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: color, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(pct)}%</span>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{inv.destination.split(",")[0]}</span>
              </div>
              <div style={{ height: "8px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: overdue ? "#dc2626" : color, transition: "width 1.2s ease" }} />
              </div>
              <div style={{ position: "relative", height: "20px", marginTop: "4px" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#f1f5f9", transform: "translateY(-50%)" }} />
                <div style={{ position: "absolute", top: "50%", left: 0, width: `${pct}%`, height: "1px", background: color, transform: "translateY(-50%)", maxWidth: "100%" }} />
                <div style={{ position: "absolute", top: "50%", left: `${Math.min(Math.max(pct, 2), 96)}%`, transform: "translate(-50%, -50%)", width: "22px", height: "22px", borderRadius: "50%", background: "#fff", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 4px ${color}18` }}>
                  <Ship size={10} color={color} />
                </div>
              </div>
            </div>

            {/* ETA + Investment row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <p style={{ margin: "0 0 2px", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>ETA</p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: overdue ? "#dc2626" : "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {pct >= 100 ? "Delivered" : overdue ? "Overdue" : inv.etaDays === 1 ? "Tomorrow" : inv.etaDays != null ? `${inv.etaDays} days` : "—"}
                </p>
                {etaDate && pct < 100 && !overdue && (
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(etaDate, "MMM dd, yyyy")}</p>
                )}
              </div>
              <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <p style={{ margin: "0 0 2px", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Investment</p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {(inv.myAmount ?? 0).toLocaleString()} USDT
                </p>
                {mktShipment?.profitPercent && (
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>+{mktShipment.profitPercent}% return</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Journey Timeline ───────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Navigation size={13} color={color} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Journey Timeline</span>
          </div>

          <div style={{ padding: "16px" }}>
            {TIMELINE.map((stage, i) => {
              const done    = i < stageIdx;
              const current = i === stageIdx;
              const future  = i > stageIdx;
              return (
                <div key={stage.key} style={{ display: "flex", gap: "14px", position: "relative" }}>
                  {/* Connector line */}
                  {i < TIMELINE.length - 1 && (
                    <div style={{
                      position: "absolute",
                      left: "13px",
                      top: "28px",
                      width: "2px",
                      height: "calc(100% - 12px)",
                      background: done ? color : "#e8edf2",
                      borderRadius: "1px",
                      transition: "background 0.3s ease",
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{ flexShrink: 0, zIndex: 1 }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: done ? color : current ? "#ffffff" : "#f1f5f9",
                      border: current ? `2px solid ${color}` : done ? "none" : "2px solid #e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: current ? `0 0 0 4px ${color}18` : "none",
                      transition: "all 0.3s ease",
                    }}>
                      {done
                        ? <CheckCircle2 size={14} color="white" />
                        : current
                          ? <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                          : <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e2e8f0" }} />
                      }
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: i < TIMELINE.length - 1 ? "20px" : "0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: current || done ? 600 : 400, color: future ? "#94a3b8" : "#0f172a" }}>
                        {stage.label}
                        {current && (
                          <span style={{ marginLeft: "7px", padding: "1px 6px", borderRadius: "8px", fontSize: "9px", fontWeight: 700, background: `${color}15`, color, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                            Now
                          </span>
                        )}
                      </p>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shipment Details Grid ──────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={13} color="#2563eb" />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment Details</span>
          </div>

          <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { icon: Hash,       label: "Shipment ID",      value: `INV-${String(invId).padStart(5, "0")}` },
              { icon: Package,    label: "Container",        value: contNum },
              { icon: Ship,       label: "Vessel",           value: inv.vesselName },
              { icon: Package,    label: "Cargo Type",       value: inv.cargoType },
              { icon: MapPin,     label: "Origin Port",      value: inv.origin },
              { icon: MapPin,     label: "Destination",      value: inv.destination },
              { icon: Navigation, label: "Current Location", value: pct >= 90 ? inv.destination.split(",")[0] : pct >= 12 ? "International Waters" : inv.origin.split(",")[0] },
              { icon: Calendar,   label: "Departure Date",   value: depDate ? format(depDate, "MMM dd, yyyy") : "In transit" },
              { icon: Clock,      label: "ETA",              value: etaDate && pct < 100 ? format(etaDate, "MMM dd, yyyy") : pct >= 100 ? "Delivered" : "—" },
              { icon: TrendingUp, label: "Expected Return",  value: mktShipment?.profitPercent ? `+${mktShipment.profitPercent}% APY` : "—" },
            ].map((d, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: "11px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                  <d.icon size={10} color="#94a3b8" />
                  <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: d.label === "Cargo Type" ? "capitalize" : "none" }}>
                  {d.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Activity Feed ──────────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Anchor size={13} color="#d97706" />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment Activity</span>
            <span style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, background: "#fffbeb", color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>
              {actFeed.length} events
            </span>
          </div>

          <div>
            {actFeed.map((evt, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: i < actFeed.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: "5px" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{evt.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>{evt.desc}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{evt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Delay warning (if overdue) ─────────────────── */}
        {overdue && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>Shipment Delayed</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#f87171", lineHeight: 1.5 }}>
                  This shipment has passed its estimated arrival date. Your capital remains secured. Contact your freight forwarder or our support team for an update on port congestion or customs delays.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons ─────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => downloadReport(reportData)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              height: "52px", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer",
              fontSize: "14px", fontWeight: 700, color: "#0f172a", background: "#ffffff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <Download size={16} color="#2563eb" />
            Download Shipment Report
          </button>

          <button
            onClick={() => navigate("/help")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              height: "52px", borderRadius: "14px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: 700, color: "white",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
            }}
          >
            <MessageSquare size={16} />
            Contact Support
          </button>
        </div>

      </div>
    </div>
  );
}
