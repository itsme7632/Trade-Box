import { useEffect, useRef, useState } from "react";
import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import { Ship, Anchor, Activity, Clock, MapPin, Radio, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

function SkeletonRect({ h = 80, radius = 12 }: { h?: number; radius?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: radius,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

const cargoColors: Record<string, string> = {
  electronics: "#2563eb",
  cocoa: "#92400e",
  coffee: "#78350f",
  lithium: "#059669",
  textiles: "#7c3aed",
  pharmaceuticals: "#db2777",
  pharma: "#db2777",
  agricultural: "#16a34a",
  minerals: "#d97706",
  steel: "#475569",
};

const cargoEmoji: Record<string, string> = {
  electronics: "⚡",
  agricultural: "🌿",
  cocoa: "🍫",
  coffee: "☕",
  minerals: "⛏️",
  textiles: "🧵",
  lithium: "🔋",
  pharmaceuticals: "💊",
  pharma: "💊",
  steel: "⚙️",
};

function StatusBadge({ pct }: { pct: number }) {
  const text = pct < 10 ? "Departed" : pct < 80 ? "Open Sea" : pct < 95 ? "Approach" : "Arrived";
  const color = pct < 10 ? "#2563eb" : pct < 80 ? "#d97706" : pct < 95 ? "#7c3aed" : "#059669";
  const bg = pct < 10 ? "#eff6ff" : pct < 80 ? "#fffbeb" : pct < 95 ? "#f5f3ff" : "#ecfdf5";
  return (
    <span style={{
      padding: "3px 8px", borderRadius: "20px",
      fontSize: "10px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
      textTransform: "uppercase", letterSpacing: "0.05em",
      color, background: bg,
    }}>
      {text}
    </span>
  );
}

export default function Tracker() {
  const { data: shipments, isLoading: isShipmentsLoading } = useGetTrackerShipments();
  const { data: activities, isLoading: isActivitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();
  const activityRef = useRef<HTMLDivElement>(null);

  const mergedShipments = shipments?.map(s => {
    const live = livePositions.find(p => p.id === s.id);
    return live ? { ...s, progressPercent: live.progressPercent ?? s.progressPercent } : s;
  }) ?? [];

  const displayShipments = mergedShipments.length > 0 ? mergedShipments : (shipments ?? []);
  const shipsAtSea = displayShipments.filter(s => (s.progressPercent ?? 0) > 0 && (s.progressPercent ?? 0) < 100).length;
  const uniquePorts = new Set(activities?.map(a => a.portName)).size;
  const activeRoutes = displayShipments.length;
  const avgTransit = displayShipments.length
    ? Math.round(displayShipments.reduce((a, s) => a + (s.etaDays ?? 0), 0) / displayShipments.length)
    : 0;

  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Page header */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e8edf2",
        padding: "20px 16px 16px",
        position: "sticky",
        top: "56px",
        zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          Fleet Tracker
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Live maritime tracking
        </p>
      </div>

      <div style={{ padding: "16px", maxWidth: "900px", margin: "0 auto" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Ships at Sea", value: shipsAtSea, color: "#0891b2", bg: "#ecfeff", icon: Ship },
            { label: "Ports Connected", value: uniquePorts, color: "#7c3aed", bg: "#f5f3ff", icon: MapPin },
            { label: "Active Routes", value: activeRoutes, color: "#2563eb", bg: "#eff6ff", icon: Radio },
            { label: "Avg Transit", value: avgTransit, suffix: "d", color: "#059669", bg: "#ecfdf5", icon: Clock },
          ].map((s, i) => (
            <div key={i} style={{
              background: "#ffffff",
              border: "1px solid #e8edf2",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#8c9ab0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {s.label}
                </span>
                <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={13} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.value}{s.suffix}
              </div>
            </div>
          ))}
        </div>

        {/* Radar / Fleet Map */}
        <section style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
            Fleet Radar
          </h2>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e8edf2",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            {/* Radar header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #f1f5f9",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Radio size={14} color="#2563eb" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Tracking {activeRoutes} vessel{activeRoutes !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "10px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>LIVE</span>
              </div>
            </div>

            {/* Radar display */}
            <div style={{
              position: "relative",
              height: "260px",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              {/* Concentric rings */}
              {[240, 180, 120, 60].map((size, i) => (
                <div key={i} style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  border: `1px solid ${i === 0 ? "#e2e8f0" : "#e8edf5"}`,
                  pointerEvents: "none",
                }} />
              ))}

              {/* Cross hairs */}
              <div style={{ position: "absolute", width: "240px", height: "1px", background: "#e8edf2", pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: "1px", height: "240px", background: "#e8edf2", pointerEvents: "none" }} />

              {/* Sweep (CSS only - no gradient artifacts) */}
              <div style={{
                position: "absolute",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0deg, rgba(37,99,235,0.12) 60deg, transparent 60deg)",
                animation: "radarSweep 5s linear infinite",
                pointerEvents: "none",
              }} />

              {/* Center dot */}
              <div style={{
                position: "absolute",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#2563eb",
                boxShadow: "0 0 0 3px rgba(37,99,235,0.2)",
                zIndex: 5,
              }} />

              {/* Ship blips */}
              {displayShipments.map((s, i) => {
                const angle = (i / Math.max(displayShipments.length, 1)) * 360;
                const pct = s.progressPercent ?? 0;
                const radius = (pct / 100) * 105;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                const color = cargoColors[s.cargoType] || "#2563eb";
                return (
                  <div key={s.id} style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    zIndex: 10,
                  }}
                    title={`${s.vesselName} · ${Math.round(pct)}%`}
                  >
                    <div style={{
                      width: "10px", height: "10px", borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 0 3px ${color}30`,
                      cursor: "pointer",
                    }} />
                  </div>
                );
              })}

              {displayShipments.length === 0 && (
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                  No vessels tracked
                </span>
              )}
            </div>

            {/* Legend */}
            {displayShipments.length > 0 && (
              <div style={{
                padding: "12px 16px",
                borderTop: "1px solid #f1f5f9",
                display: "flex", flexWrap: "wrap", gap: "10px",
              }}>
                {displayShipments.slice(0, 5).map(s => {
                  const color = cargoColors[s.cargoType] || "#2563eb";
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.vesselName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Active Routes */}
        <section style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
            Active Routes
          </h2>

          {isShipmentsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(3)].map((_, i) => <SkeletonRect key={i} h={120} />)}
            </div>
          ) : displayShipments.length === 0 ? (
            <div style={{
              background: "#ffffff", border: "1px dashed #e2e8f0",
              borderRadius: "16px", padding: "40px 20px", textAlign: "center",
            }}>
              <Ship size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                No active routes.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {displayShipments.map(s => {
                const pct = Math.min(100, Math.max(0, s.progressPercent ?? 0));
                const isLive = livePositions.some(p => p.id === s.id);
                const color = cargoColors[s.cargoType] || "#2563eb";
                const emoji = cargoEmoji[s.cargoType] || "📦";

                return (
                  <div key={s.id} style={{
                    background: "#ffffff",
                    border: "1px solid #e8edf2",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    {/* Colored accent bar */}
                    <div style={{ height: "3px", background: color }} />

                    <div style={{ padding: "14px 16px" }}>
                      {/* Row 1: vessel + status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "18px" }}>{emoji}</span>
                          <div>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                              {s.vesselName}
                            </p>
                            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>
                              {s.cargoType}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isLive && (
                            <span style={{
                              padding: "2px 7px", borderRadius: "20px", fontSize: "9px",
                              fontWeight: 600, color: "#059669", background: "#ecfdf5",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              LIVE
                            </span>
                          )}
                          <StatusBadge pct={pct} />
                        </div>
                      </div>

                      {/* Route labels */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.origin.split(",")[0]}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                          {Math.round(pct)}%
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                          {s.destination.split(",")[0]}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: "6px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden", marginBottom: "10px" }}>
                        <div style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background: color,
                          transition: "width 1s ease",
                        }} />
                      </div>

                      {/* Ship position indicator */}
                      <div style={{ position: "relative", height: "20px", marginBottom: "6px" }}>
                        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#e8edf2", transform: "translateY(-50%)" }} />
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: `${Math.min(pct, 93)}%`,
                          transform: "translate(-50%, -50%)",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          border: `2px solid ${color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 0 0 4px ${color}20`,
                        }}>
                          <Ship size={11} color={color} />
                        </div>
                        <div style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          width: `${pct}%`,
                          height: "2px",
                          background: color,
                          transform: "translateY(-50%)",
                          borderRadius: "1px",
                          maxWidth: "100%",
                        }} />
                      </div>

                      {/* Footer info */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        paddingTop: "10px",
                        borderTop: "1px solid #f1f5f9",
                      }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                          Invested: <b style={{ color: "#1e293b" }}>{(s.myAmount ?? 0).toLocaleString()} USDT</b>
                        </span>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                          ETA: <b style={{ color: "#1e293b" }}>{s.etaDays}d</b>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Port Activity */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
              Port Activity
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: "10px", color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>FEED</span>
            </div>
          </div>

          <div ref={activityRef} style={{
            background: "#ffffff",
            border: "1px solid #e8edf2",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            {isActivitiesLoading ? (
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...Array(4)].map((_, i) => <SkeletonRect key={i} h={60} />)}
              </div>
            ) : activities?.length ? (
              <div>
                {activities.map((act, idx) => {
                  const isArrival = act.eventType === "arrival";
                  const color = isArrival ? "#059669" : "#2563eb";
                  const bg = isArrival ? "#ecfdf5" : "#eff6ff";
                  return (
                    <div key={act.id} style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      padding: "13px 16px",
                      borderBottom: idx < activities.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "10px",
                        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: "2px",
                      }}>
                        <Anchor size={14} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.4 }}>
                          <b style={{ color: "#1e293b" }}>{act.vesselName}</b>
                          {" "}
                          <span style={{ color, fontWeight: 500 }}>
                            {isArrival ? "arrived at" : "departed from"}
                          </span>
                          {" "}
                          <b style={{ color: "#1e293b" }}>{act.portName}</b>
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                          <Clock size={10} color="#94a3b8" />
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {format(parseISO(act.timestamp), "HH:mm · MMM dd")}
                          </span>
                          {act.cargoType && (
                            <span style={{
                              fontSize: "9px", padding: "1px 6px", borderRadius: "20px",
                              background: `${cargoColors[act.cargoType] || "#94a3b8"}15`,
                              color: cargoColors[act.cargoType] || "#64748b",
                              fontFamily: "'JetBrains Mono', monospace",
                              textTransform: "capitalize",
                            }}>
                              {act.cargoType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <Activity size={28} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                  No port activity recorded.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
