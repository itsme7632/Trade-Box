import { Shipment } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, TrendingUp, Clock, Zap } from "lucide-react";

const riskConfig: Record<string, { color: string; bg: string; label: string; border: string }> = {
  A: { color: "#059669", bg: "#ecfdf5", label: "Low Risk", border: "#a7f3d0" },
  B: { color: "#2563eb", bg: "#eff6ff", label: "Moderate", border: "#bfdbfe" },
  C: { color: "#d97706", bg: "#fffbeb", label: "Medium", border: "#fde68a" },
  D: { color: "#dc2626", bg: "#fef2f2", label: "High Risk", border: "#fecaca" },
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

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const risk = riskConfig[shipment.riskGrade] || riskConfig.C;
  const fundPct = Math.min(100, (shipment.fundingRaised / shipment.fundingGoal) * 100);
  const isClosingSoon = shipment.status === "open" && fundPct > 80;
  const emoji = cargoEmoji[shipment.cargoType] || "📦";

  return (
    <Link href={`/market/shipments/${shipment.id}`}>
      <div style={{
        background: "#ffffff",
        border: "1px solid #e8edf2",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.06)";
          (e.currentTarget as HTMLDivElement).style.transform = "none";
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: "3px", background: risk.color }} />

        <div style={{ padding: "14px 14px 14px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "6px" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: "20px", fontSize: "10px",
                  fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  color: risk.color, background: risk.bg, border: `1px solid ${risk.border}`,
                }}>
                  Grade {shipment.riskGrade}
                </span>
                {isClosingSoon && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "3px",
                    padding: "2px 8px", borderRadius: "20px", fontSize: "10px",
                    fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                    color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a",
                  }}>
                    <Zap size={9} /> Closing
                  </span>
                )}
              </div>
              <h3 style={{
                margin: 0, fontSize: "13px", fontWeight: 700,
                color: "#0f172a", lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {shipment.title}
              </h3>
            </div>
            <span style={{ fontSize: "22px", flexShrink: 0 }}>{emoji}</span>
          </div>

          {/* Route */}
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#f8fafc", borderRadius: "10px", padding: "8px 10px",
          }}>
            <span style={{
              fontSize: "11px", fontWeight: 500, color: "#334155",
              flex: 1, minWidth: 0, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {shipment.origin.split(",")[0]}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0, color: "#94a3b8" }}>
              <div style={{ width: "12px", height: "1px", background: "#e2e8f0" }} />
              <ArrowRight size={10} color="#94a3b8" />
              <div style={{ width: "12px", height: "1px", background: "#e2e8f0" }} />
            </div>
            <span style={{
              fontSize: "11px", fontWeight: 500, color: "#334155",
              flex: 1, minWidth: 0, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              textAlign: "right",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {shipment.destination.split(",")[0]}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{
              padding: "8px 10px", borderRadius: "10px",
              background: "#eff6ff", border: "1px solid #bfdbfe",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <TrendingUp size={10} color="#2563eb" />
                <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Return
                </span>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#2563eb", fontFamily: "'Space Grotesk', sans-serif" }}>
                +{shipment.profitPercent}%
              </div>
            </div>
            <div style={{
              padding: "8px 10px", borderRadius: "10px",
              background: "#f8fafc", border: "1px solid #e8edf2",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <Clock size={10} color="#64748b" />
                <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Min Entry
                </span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipment.minInvestment.toLocaleString()}
                <span style={{ fontSize: "9px", color: "#94a3b8", marginLeft: "2px" }}>USDT</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipment.fundingRaised.toLocaleString()} / {shipment.fundingGoal.toLocaleString()} USDT
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: isClosingSoon ? "#d97706" : "#2563eb",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {Math.round(fundPct)}%
              </span>
            </div>
            <div style={{ height: "5px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{
                width: `${fundPct}%`,
                height: "100%",
                borderRadius: "999px",
                background: isClosingSoon
                  ? "linear-gradient(90deg, #f59e0b, #fcd34d)"
                  : "linear-gradient(90deg, #2563eb, #0891b2)",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
