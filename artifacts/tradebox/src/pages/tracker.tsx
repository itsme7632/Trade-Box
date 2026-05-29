import { useEffect, useRef, useState } from "react";
import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import {
  Ship, Anchor, Activity, Clock, MapPin, AlertTriangle,
  CheckCircle2, ArrowRight, Package, Zap, Calendar,
  RefreshCw, TrendingUp, Globe, Navigation
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

// ─── helpers ──────────────────────────────────────────────────────────────────

function S({ h = 80 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: 14 }} />;
}

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

// Progress stages aligned to 0-100% journey
const STAGES = [
  { id: "departed",  label: "Departed",  threshold: 0  },
  { id: "at_sea",   label: "At Sea",    threshold: 15 },
  { id: "approach", label: "Approach",  threshold: 55 },
  { id: "customs",  label: "Customs",   threshold: 75 },
  { id: "arrived",  label: "Arrived",   threshold: 90 },
  { id: "delivered",label: "Delivered", threshold: 100 },
];

function getStageIndex(pct: number) {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (pct >= STAGES[i].threshold) idx = i;
  }
  return idx;
}

function getStatusLabel(pct: number) {
  return STAGES[getStageIndex(pct)].label;
}

function getStatusColors(pct: number) {
  if (pct >= 100) return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
  if (pct >= 90)  return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  if (pct >= 75)  return { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" };
  if (pct >= 55)  return { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
  if (pct >= 15)  return { color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return             { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
}

function etaCountdown(etaDays: number | undefined) {
  if (!etaDays) return null;
  if (etaDays <= 0) return { label: "Overdue", color: "#dc2626", bg: "#fef2f2" };
  if (etaDays === 1) return { label: "Tomorrow", color: "#d97706", bg: "#fffbeb" };
  if (etaDays <= 3) return { label: `${etaDays}d left`, color: "#d97706", bg: "#fffbeb" };
  return { label: `ETA ${etaDays}d`, color: "#2563eb", bg: "#eff6ff" };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressTimeline({ pct, color }: { pct: number; color: string }) {
  const stageIdx = getStageIndex(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: "12px" }}>
      {STAGES.map((stage, i) => {
        const done = i < stageIdx;
        const current = i === stageIdx;
        const future = i > stageIdx;
        return (
          <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: current ? "14px" : "10px",
                height: current ? "14px" : "10px",
                borderRadius: "50%",
                background: done || current ? color : "#e2e8f0",
                border: current ? `2px solid ${color}` : "none",
                boxShadow: current ? `0 0 0 3px ${color}25` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }}>
                {done && <CheckCircle2 size={7} color="white" />}
              </div>
              <span style={{
                fontSize: "8px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: current ? 700 : 400,
                color: done || current ? color : "#cbd5e1",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
              }}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{
                flex: 1,
                height: "2px",
                background: done ? color : "#e2e8f0",
                margin: "0 2px",
                marginBottom: "12px",
                borderRadius: "1px",
                transition: "background 0.3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RouteMapPreview({
  shipments,
}: {
  shipments: Array<{ id: number; origin: string; destination: string; progressPercent?: number; cargoType: string }>;
}) {
  // Simple SVG world silhouette with trade route arcs
  const W = 340, H = 160;

  // Deterministic port positions mapped from common origins/destinations
  const portCoords: Record<string, [number, number]> = {
    default_origin: [60, 80],
    default_dest: [280, 80],
  };

  function hashStr(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return Math.abs(h);
  }

  function portPos(name: string, side: "origin" | "dest"): [number, number] {
    const h = hashStr(name);
    const x = side === "origin" ? 30 + (h % 80) : 220 + (h % 80);
    const y = 40 + (h % 80);
    return [x, y];
  }

  const arcs = shipments.slice(0, 6).map(s => {
    const [ox, oy] = portPos(s.origin, "origin");
    const [dx, dy] = portPos(s.destination, "dest");
    const color = cargoColors[s.cargoType] || "#2563eb";
    const pct = (s.progressPercent ?? 0) / 100;
    const vx = ox + (dx - ox) * pct;
    const vy = oy + (dy - oy) * pct - 18; // slight lift for ship position
    const cpx = (ox + dx) / 2;
    const cpy = Math.min(oy, dy) - 40;
    return { ox, oy, dx, dy, cpx, cpy, color, pct, vx, vy, id: s.id };
  });

  return (
    <div style={{
      background: "#f0f9ff",
      border: "1px solid #bae6fd",
      borderRadius: "14px",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "10px 14px", borderBottom: "1px solid #e0f2fe",
        background: "white",
      }}>
        <Globe size={13} color="#0891b2" />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
          Route Overview
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: "9px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* Ocean background */}
        <rect width={W} height={H} fill="#f0f9ff" />

        {/* Simplified land masses */}
        <ellipse cx="55" cy="75" rx="38" ry="28" fill="#e2e8f0" opacity="0.6" />
        <ellipse cx="150" cy="90" rx="22" ry="16" fill="#e2e8f0" opacity="0.5" />
        <ellipse cx="275" cy="68" rx="42" ry="32" fill="#e2e8f0" opacity="0.6" />
        <ellipse cx="160" cy="130" rx="28" ry="14" fill="#e2e8f0" opacity="0.4" />

        {/* Grid lines */}
        {[40, 80, 120].map(y => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#bae6fd" strokeWidth="0.5" strokeDasharray="4,6" />
        ))}
        {[68, 136, 204, 272].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2={H} stroke="#bae6fd" strokeWidth="0.5" strokeDasharray="4,6" />
        ))}

        {/* Route arcs */}
        {arcs.map(arc => (
          <g key={arc.id}>
            {/* Dashed future path */}
            <path
              d={`M ${arc.ox} ${arc.oy} Q ${arc.cpx} ${arc.cpy} ${arc.dx} ${arc.dy}`}
              fill="none"
              stroke={arc.color}
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.25"
            />
            {/* Solid completed path (approximate with short segment) */}
            <path
              d={`M ${arc.ox} ${arc.oy} Q ${arc.cpx} ${arc.cpy} ${arc.dx} ${arc.dy}`}
              fill="none"
              stroke={arc.color}
              strokeWidth="2"
              strokeDasharray={`${arc.pct * 320} 400`}
              opacity="0.7"
            />
            {/* Origin port dot */}
            <circle cx={arc.ox} cy={arc.oy} r="4" fill={arc.color} opacity="0.9" />
            <circle cx={arc.ox} cy={arc.oy} r="7" fill={arc.color} opacity="0.15" />
            {/* Destination port dot */}
            <circle cx={arc.dx} cy={arc.dy} r="4" fill={arc.color} opacity="0.4" stroke={arc.color} strokeWidth="1.5" strokeDasharray="2,2" />
            {/* Ship position */}
            {arc.pct > 0.02 && arc.pct < 0.98 && (
              <g>
                <circle cx={arc.vx} cy={arc.vy} r="6" fill="white" stroke={arc.color} strokeWidth="2" />
                <text x={arc.vx} y={arc.vy + 4} textAnchor="middle" fontSize="7" fill={arc.color}>⛵</text>
              </g>
            )}
          </g>
        ))}

        {shipments.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="JetBrains Mono">
            No active routes
          </text>
        )}
      </svg>

      {/* Legend */}
      {arcs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px 14px", borderTop: "1px solid #e0f2fe", background: "white" }}>
          {arcs.map((arc, i) => (
            <div key={arc.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "8px", height: "3px", borderRadius: "2px", background: arc.color }} />
              <span style={{ fontSize: "9px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipments[i]?.origin.split(",")[0]} → {shipments[i]?.destination.split(",")[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Tracker() {
  const { data: shipments, isLoading: isShipmentsLoading, refetch } = useGetTrackerShipments();
  const { data: activities, isLoading: isActivitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();
  const activityRef = useRef<HTMLDivElement>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const mergedShipments = shipments?.map(s => {
    const live = livePositions.find(p => p.id === s.id);
    return live ? { ...s, progressPercent: live.progressPercent ?? s.progressPercent } : s;
  }) ?? [];

  const displayShipments = mergedShipments.length > 0 ? mergedShipments : (shipments ?? []);

  // Derived stats
  const shipsAtSea      = displayShipments.filter(s => { const p = s.progressPercent ?? 0; return p > 0 && p < 100; }).length;
  const delivered       = displayShipments.filter(s => (s.progressPercent ?? 0) >= 100).length;
  const delayed         = displayShipments.filter(s => (s.etaDays ?? 99) <= 0).length;
  const onTime          = shipsAtSea > 0 ? Math.round(((shipsAtSea - delayed) / shipsAtSea) * 100) : 100;
  const uniquePorts     = new Set(activities?.map(a => a.portName)).size;
  const activeRoutes    = displayShipments.length;
  const totalInvested   = displayShipments.reduce((a, s) => a + (s.myAmount ?? 0), 0);

  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight;
    }
  }, [activities]);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Page header */}
      <div style={{
        background: "#ffffff", borderBottom: "1px solid #e8edf2",
        padding: "16px 16px 14px",
        position: "sticky", top: "56px", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Live Tracking
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Logistics Control Center
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "10px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>LIVE</span>
            </div>
            <button onClick={handleRefresh} style={{
              width: "32px", height: "32px", borderRadius: "9px",
              background: "#f1f5f9", border: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <RefreshCw size={13} color="#64748b" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "960px", margin: "0 auto" }}>

        {/* ── KPI strip ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "Active Vessels", value: shipsAtSea,  color: "#2563eb", bg: "#eff6ff",  icon: Ship         },
            { label: "Ports Reached",  value: uniquePorts, color: "#7c3aed", bg: "#f5f3ff",  icon: MapPin       },
            { label: "On-Time Rate",   value: `${onTime}%`,color: "#059669", bg: "#ecfdf5",  icon: TrendingUp   },
            { label: "Delayed",        value: delayed,     color: delayed > 0 ? "#dc2626" : "#94a3b8",
              bg: delayed > 0 ? "#fef2f2" : "#f8fafc", icon: AlertTriangle },
          ].map((s, i) => (
            <div key={i} style={{
              background: "#ffffff", border: "1px solid #e8edf2",
              borderRadius: "14px", padding: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </span>
                <div style={{ width: "24px", height: "24px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={12} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Delayed alert banner ───────────────────────────── */}
        {delayed > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", borderRadius: "12px", marginBottom: "14px",
            background: "#fef2f2", border: "1px solid #fecaca",
          }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#dc2626" }}>
                {delayed} shipment{delayed > 1 ? "s" : ""} overdue
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
                Review vessel status below and contact freight forwarder if needed.
              </p>
            </div>
          </div>
        )}

        {/* ── Route map preview ─────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <RouteMapPreview shipments={displayShipments.map(s => ({
            id: s.id,
            origin: s.origin,
            destination: s.destination,
            progressPercent: s.progressPercent,
            cargoType: s.cargoType,
          }))} />
        </div>

        {/* ── Live Shipments ────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                Live Shipments
              </h2>
              {!isShipmentsLoading && (
                <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#eff6ff", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>
                  {displayShipments.length}
                </span>
              )}
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              Updated {format(lastRefresh, "HH:mm")}
            </span>
          </div>

          {isShipmentsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(3)].map((_, i) => <S key={i} h={200} />)}
            </div>
          ) : displayShipments.length === 0 ? (
            <div style={{
              background: "#ffffff", border: "1px dashed #e2e8f0",
              borderRadius: "16px", padding: "60px 20px", textAlign: "center",
            }}>
              <Ship size={36} color="#cbd5e1" style={{ marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>
                No Active Shipments
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                Invest in a shipment from the Market to start tracking.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {displayShipments.map(s => {
                const pct     = Math.min(100, Math.max(0, s.progressPercent ?? 0));
                const color   = cargoColors[s.cargoType] || "#2563eb";
                const emoji   = cargoEmoji[s.cargoType] || "📦";
                const sc      = getStatusColors(pct);
                const eta     = etaCountdown(s.etaDays);
                const isLive  = livePositions.some(p => p.id === s.id);
                const isDelayed = (s.etaDays ?? 99) <= 0;
                const isExpanded = selectedId === s.id;

                return (
                  <div key={s.id} style={{
                    background: "#ffffff",
                    border: `1px solid ${isDelayed ? "#fecaca" : "#e8edf2"}`,
                    borderRadius: "18px",
                    overflow: "hidden",
                    boxShadow: isExpanded ? "0 4px 24px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
                    transition: "box-shadow 0.2s ease",
                  }}>
                    {/* Top color bar */}
                    <div style={{ height: "3px", background: isDelayed ? "#dc2626" : color }} />

                    {/* Header row — clickable to expand */}
                    <div
                      onClick={() => setSelectedId(isExpanded ? null : s.id)}
                      style={{
                        padding: "14px 16px 10px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        {/* Emoji + cargo type */}
                        <div style={{ flexShrink: 0, marginTop: "1px" }}>
                          <div style={{
                            width: "40px", height: "40px", borderRadius: "12px",
                            background: `${color}12`, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: "20px",
                          }}>
                            {emoji}
                          </div>
                        </div>

                        {/* Name + route */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                            {/* Status badge */}
                            <span style={{
                              padding: "2px 8px", borderRadius: "20px",
                              fontSize: "9px", fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              textTransform: "uppercase", letterSpacing: "0.05em",
                              color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                            }}>
                              {isDelayed ? "⚠ Overdue" : getStatusLabel(pct)}
                            </span>
                            {isLive && (
                              <span style={{ padding: "2px 6px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: "#059669", background: "#ecfdf5", fontFamily: "'JetBrains Mono', monospace" }}>
                                ● LIVE
                              </span>
                            )}
                            {eta && (
                              <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: eta.color, background: eta.bg, fontFamily: "'JetBrains Mono', monospace" }}>
                                {eta.label}
                              </span>
                            )}
                          </div>

                          {/* Vessel name */}
                          <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.vesselName}
                          </p>

                          {/* Route */}
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "35%" }}>
                              {s.origin.split(",")[0]}
                            </span>
                            <ArrowRight size={11} color="#cbd5e1" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "35%" }}>
                              {s.destination.split(",")[0]}
                            </span>
                            <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: "12px", padding: "0 0 4px" }}>
                        <div style={{ height: "6px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%", borderRadius: "999px",
                            background: isDelayed
                              ? "linear-gradient(90deg, #dc2626, #f87171)"
                              : `linear-gradient(90deg, ${color}, ${color}aa)`,
                            transition: "width 1s ease",
                          }} />
                        </div>
                        {/* Ship position marker */}
                        <div style={{ position: "relative", height: "16px", marginTop: "4px" }}>
                          <div style={{
                            position: "absolute",
                            left: `${Math.min(Math.max(pct, 2), 96)}%`,
                            top: "50%", transform: "translate(-50%, -50%)",
                            width: "22px", height: "22px", borderRadius: "50%",
                            background: "#ffffff", border: `2px solid ${color}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 0 4px ${color}18`,
                            zIndex: 1,
                          }}>
                            <Ship size={10} color={color} />
                          </div>
                          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#e8edf2", transform: "translateY(-50%)" }} />
                          <div style={{ position: "absolute", top: "50%", left: 0, width: `${pct}%`, height: "2px", background: color, transform: "translateY(-50%)", borderRadius: "1px", maxWidth: "100%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail section */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #f1f5f9" }}>
                        {/* Progress timeline */}
                        <div style={{ padding: "14px 16px 8px" }}>
                          <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Journey Timeline
                          </p>
                          <ProgressTimeline pct={pct} color={color} />
                        </div>

                        {/* Detail grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "0 16px 14px" }}>
                          {[
                            { icon: Ship,      label: "Vessel",        value: s.vesselName },
                            { icon: Package,   label: "Cargo Type",    value: s.cargoType  },
                            { icon: MapPin,    label: "Origin Port",   value: s.origin     },
                            { icon: Navigation,label: "Destination",   value: s.destination },
                            { icon: Calendar,  label: "ETA (Days)",    value: s.etaDays != null ? `${s.etaDays}d remaining` : "—" },
                            { icon: Clock,     label: "Last Updated",  value: format(lastRefresh, "HH:mm, MMM dd") },
                          ].map((d, i) => (
                            <div key={i} style={{
                              padding: "10px 12px", borderRadius: "10px",
                              background: "#f8fafc", border: "1px solid #e8edf2",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                                <d.icon size={11} color="#94a3b8" />
                                <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  {d.label}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {d.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Investment footer */}
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 16px", borderTop: "1px solid #f1f5f9",
                          background: "#fafbff",
                        }}>
                          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                            Your investment
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>
                            {(s.myAmount ?? 0).toLocaleString()} USDT
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Collapsed footer */}
                    {!isExpanded && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 16px 12px",
                      }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                          {(s.myAmount ?? 0).toLocaleString()} USDT invested
                        </span>
                        <button style={{
                          fontSize: "10px", fontWeight: 600, color: "#2563eb",
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace", padding: 0,
                        }}>
                          Details ↓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Completed stats ──────────────────────────────────── */}
        {delivered > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
              Completed Shipments
            </h2>
            <div style={{
              background: "#ffffff", border: "1px solid #e8edf2",
              borderRadius: "16px", padding: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {[
                  { label: "Delivered",     value: delivered,       color: "#059669", icon: CheckCircle2 },
                  { label: "Active",        value: shipsAtSea,      color: "#2563eb", icon: Zap          },
                  { label: "Total Routes",  value: activeRoutes,    color: "#7c3aed", icon: Globe        },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                      <s.icon size={16} color={s.color} />
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {totalInvested > 0 && (
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Total Capital Deployed</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>
                      {totalInvested.toLocaleString()} USDT
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Port Activity feed ──────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
              Port Activity
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: "9px", color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: "uppercase" }}>
                Live Feed
              </span>
            </div>
          </div>

          <div ref={activityRef} style={{
            background: "#ffffff", border: "1px solid #e8edf2",
            borderRadius: "16px", overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            maxHeight: "360px", overflowY: "auto",
          }}>
            {isActivitiesLoading ? (
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...Array(4)].map((_, i) => <S key={i} h={60} />)}
              </div>
            ) : activities?.length ? (
              <div>
                {activities.map((act, idx) => {
                  const isArrival = act.eventType === "arrival";
                  const evtColor  = isArrival ? "#059669" : "#2563eb";
                  const evtBg     = isArrival ? "#ecfdf5"  : "#eff6ff";
                  return (
                    <div key={act.id} style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      padding: "12px 16px",
                      borderBottom: idx < activities.length - 1 ? "1px solid #f8fafc" : "none",
                    }}>
                      {/* Icon */}
                      <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: evtBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                        {isArrival ? <Anchor size={14} color={evtColor} /> : <Ship size={14} color={evtColor} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                          <b style={{ color: "#0f172a" }}>{act.vesselName}</b>
                          {" "}
                          <span style={{ color: evtColor, fontWeight: 500 }}>
                            {isArrival ? "arrived at" : "departed from"}
                          </span>
                          {" "}
                          <b style={{ color: "#0f172a" }}>{act.portName}</b>
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            <Clock size={9} />
                            {format(parseISO(act.timestamp), "HH:mm · MMM dd")}
                          </span>
                          {act.cargoType && (
                            <span style={{
                              fontSize: "9px", padding: "1px 6px", borderRadius: "20px",
                              background: `${cargoColors[act.cargoType] || "#94a3b8"}18`,
                              color: cargoColors[act.cargoType] || "#64748b",
                              fontFamily: "'JetBrains Mono', monospace",
                              textTransform: "capitalize", fontWeight: 500,
                            }}>
                              {act.cargoType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrival/departure tag */}
                      <span style={{
                        padding: "2px 7px", borderRadius: "20px",
                        fontSize: "9px", fontWeight: 700,
                        color: evtColor, background: evtBg,
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: "uppercase", flexShrink: 0,
                      }}>
                        {isArrival ? "ARR" : "DEP"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <Activity size={28} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                  No port activity recorded yet.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
