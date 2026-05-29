import { useEffect, useRef, useState } from "react";
import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  Ship, Anchor, Activity, Clock, MapPin, AlertTriangle,
  CheckCircle2, ArrowRight, RefreshCw, TrendingUp, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

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

const STAGES = [
  { label: "Booked",    threshold: 0   },
  { label: "Loaded",    threshold: 5   },
  { label: "Departed",  threshold: 12  },
  { label: "At Sea",    threshold: 18  },
  { label: "Customs",   threshold: 75  },
  { label: "Arrived",   threshold: 90  },
  { label: "Delivered", threshold: 100 },
];

function getStageIdx(pct: number) {
  let i = 0;
  for (let j = 0; j < STAGES.length; j++) { if (pct >= STAGES[j].threshold) i = j; }
  return i;
}

function getStatusLabel(pct: number) { return STAGES[getStageIdx(pct)].label; }

function statusBadge(pct: number, overdue: boolean) {
  if (overdue) return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Overdue" };
  if (pct >= 100) return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Delivered" };
  if (pct >= 90)  return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Arrived" };
  if (pct >= 75)  return { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "Customs" };
  if (pct >= 18)  return { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "At Sea" };
  if (pct >= 12)  return { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", label: "Departed" };
  return                  { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", label: "Booked" };
}

export default function Tracker() {
  const { data: shipments, isLoading: shipmentsLoading, refetch } = useGetTrackerShipments();
  const { data: activities, isLoading: activitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();
  const activityRef = useRef<HTMLDivElement>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [, navigate] = useLocation();

  const merged = shipments?.map(s => {
    const live = livePositions.find(p => p.id === s.id);
    return live ? { ...s, progressPercent: live.progressPercent ?? s.progressPercent } : s;
  }) ?? [];
  const list = merged.length ? merged : (shipments ?? []);

  const atSea    = list.filter(s => { const p = s.progressPercent ?? 0; return p > 0 && p < 100; }).length;
  const delayed  = list.filter(s => (s.etaDays ?? 99) <= 0).length;
  const onTime   = atSea > 0 ? Math.round(((atSea - delayed) / atSea) * 100) : 100;
  const ports    = new Set(activities?.map(a => a.portName)).size;

  useEffect(() => {
    if (activityRef.current) activityRef.current.scrollTop = activityRef.current.scrollHeight;
  }, [activities]);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "14px 16px", position: "sticky", top: "56px", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Live Tracking</h1>
            <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Logistics Control Center</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "10px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>LIVE</span>
            </div>
            <button onClick={() => { refetch(); setLastRefresh(new Date()); }} style={{ width: "32px", height: "32px", borderRadius: "9px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <RefreshCw size={13} color="#64748b" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "800px", margin: "0 auto" }}>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
          {[
            { label: "At Sea",    value: atSea,        color: "#2563eb", bg: "#eff6ff",                                     icon: Ship         },
            { label: "Ports",     value: ports,        color: "#7c3aed", bg: "#f5f3ff",                                     icon: MapPin       },
            { label: "On-Time",   value: `${onTime}%`, color: "#059669", bg: "#ecfdf5",                                     icon: TrendingUp   },
            { label: "Delayed",   value: delayed,      color: delayed > 0 ? "#dc2626" : "#94a3b8",
              bg: delayed > 0 ? "#fef2f2" : "#f8fafc", icon: AlertTriangle },
          ].map((s, i) => (
            <div key={i} style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "14px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                <div style={{ width: "22px", height: "22px", borderRadius: "7px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={11} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Delayed banner */}
        {delayed > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderRadius: "12px", marginBottom: "14px", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>{delayed} shipment{delayed > 1 ? "s" : ""} overdue — tap to review</p>
            </div>
          </div>
        )}

        {/* Shipment summary header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Your Shipments</h2>
            {!shipmentsLoading && (
              <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#eff6ff", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>{list.length}</span>
            )}
          </div>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(lastRefresh, "HH:mm")}</span>
        </div>

        {/* Shipment list */}
        {shipmentsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(3)].map((_, i) => <S key={i} h={110} />)}
          </div>
        ) : list.length === 0 ? (
          <div style={{ background: "#ffffff", border: "1px dashed #e2e8f0", borderRadius: "16px", padding: "56px 20px", textAlign: "center" }}>
            <Ship size={32} color="#cbd5e1" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>No Active Shipments</h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Fund a shipment from the Market to start tracking.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {list.map(s => {
              const pct      = Math.min(100, Math.max(0, s.progressPercent ?? 0));
              const color    = cargoColors[s.cargoType] || "#2563eb";
              const emoji    = cargoEmoji[s.cargoType] || "📦";
              const overdue  = (s.etaDays ?? 99) <= 0;
              const isLive   = livePositions.some(p => p.id === s.id);
              const badge    = statusBadge(pct, overdue);
              const eta      = s.etaDays != null
                ? s.etaDays <= 0 ? "Overdue"
                : s.etaDays === 1 ? "Tomorrow"
                : `${s.etaDays}d left`
                : null;

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/tracker/shipment/${s.id}`)}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${overdue ? "#fecaca" : "#e8edf2"}`,
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s ease, transform 0.1s ease",
                    userSelect: "none",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{ height: "3px", background: overdue ? "#dc2626" : color }} />

                  <div style={{ padding: "12px 14px 12px" }}>
                    {/* Row 1: icon + name + badges + chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                        {emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                            {badge.label}
                          </span>
                          {isLive && (
                            <span style={{ padding: "2px 6px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: "#059669", background: "#ecfdf5", fontFamily: "'JetBrains Mono', monospace" }}>● LIVE</span>
                          )}
                          {eta && (
                            <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, color: overdue ? "#dc2626" : s.etaDays! <= 3 ? "#d97706" : "#64748b", background: overdue ? "#fef2f2" : s.etaDays! <= 3 ? "#fffbeb" : "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
                              {eta}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.vesselName}
                        </p>
                      </div>
                      <ChevronRight size={15} color="#cbd5e1" style={{ flexShrink: 0 }} />
                    </div>

                    {/* Row 2: route + pct */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "38%" }}>
                        {s.origin.split(",")[0]}
                      </span>
                      <ArrowRight size={10} color="#cbd5e1" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {s.destination.split(",")[0]}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{Math.round(pct)}%</span>
                    </div>

                    {/* Progress bar + ship marker */}
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ height: "5px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden", marginBottom: "4px" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: overdue ? "#dc2626" : color, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ position: "relative", height: "18px" }}>
                        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#f1f5f9", transform: "translateY(-50%)" }} />
                        <div style={{ position: "absolute", top: "50%", left: 0, width: `${pct}%`, height: "1px", background: color, transform: "translateY(-50%)", maxWidth: "100%" }} />
                        <div style={{ position: "absolute", top: "50%", left: `${Math.min(Math.max(pct, 2), 95)}%`, transform: "translate(-50%, -50%)", width: "18px", height: "18px", borderRadius: "50%", background: "#ffffff", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 3px ${color}18` }}>
                          <Ship size={8} color={color} />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: investment + cargo */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #f8fafc" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                        <b style={{ color: "#0f172a" }}>{(s.myAmount ?? 0).toLocaleString()} USDT</b> invested
                      </span>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>
                        {s.cargoType}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Port Activity */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Port Activity</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: "9px", color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: "uppercase" }}>Feed</span>
            </div>
          </div>

          <div ref={activityRef} style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", maxHeight: "320px", overflowY: "auto" }}>
            {activitiesLoading ? (
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...Array(3)].map((_, i) => <S key={i} h={54} />)}
              </div>
            ) : activities?.length ? (
              <div>
                {activities.map((act, idx) => {
                  const isArr = act.eventType === "arrival";
                  const c = isArr ? "#059669" : "#2563eb";
                  const bg = isArr ? "#ecfdf5" : "#eff6ff";
                  return (
                    <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "11px 14px", borderBottom: idx < activities.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                        {isArr ? <Anchor size={12} color={c} /> : <Ship size={12} color={c} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                          <b style={{ color: "#0f172a" }}>{act.vesselName}</b>
                          {" "}<span style={{ color: c, fontWeight: 500 }}>{isArr ? "arrived at" : "departed from"}</span>{" "}
                          <b style={{ color: "#0f172a" }}>{act.portName}</b>
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {format(parseISO(act.timestamp), "HH:mm · MMM dd")}
                          </span>
                          {act.cargoType && (
                            <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "20px", background: `${cargoColors[act.cargoType] || "#94a3b8"}15`, color: cargoColors[act.cargoType] || "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>
                              {act.cargoType}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ padding: "2px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: 700, color: c, background: bg, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", flexShrink: 0, marginTop: "2px" }}>
                        {isArr ? "ARR" : "DEP"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <Activity size={24} color="#cbd5e1" style={{ marginBottom: "8px" }} />
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>No port activity yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
