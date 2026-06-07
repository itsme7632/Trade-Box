import { Shipment } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, TrendingUp, Clock, Zap, Users, Shield, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

const riskConfig: Record<string, { color: string; bg: string; label: string; border: string }> = {
  A: { color: "#059669", bg: "#ecfdf5", label: "Low Risk",  border: "#a7f3d0" },
  B: { color: "#2563eb", bg: "#eff6ff", label: "Moderate",  border: "#bfdbfe" },
  C: { color: "#d97706", bg: "#fffbeb", label: "Medium",    border: "#fde68a" },
  D: { color: "#dc2626", bg: "#fef2f2", label: "High Risk", border: "#fecaca" },
};

const cargoEmoji: Record<string, string> = {
  electronics:    "⚡",
  agricultural:   "🌿",
  cocoa:          "🍫",
  coffee:         "☕",
  minerals:       "⛏️",
  textiles:       "🧵",
  lithium:        "🔋",
  pharmaceuticals:"💊",
  pharma:         "💊",
  steel:          "⚙️",
  oil:            "🛢️",
  gas:            "🔥",
  food:           "🥩",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: "Open",       color: "#059669", bg: "#ecfdf5" },
  funded:     { label: "Funded",     color: "#2563eb", bg: "#eff6ff" },
  in_transit: { label: "In Transit", color: "#d97706", bg: "#fffbeb" },
  delivered:  { label: "Delivered",  color: "#7c3aed", bg: "#f5f3ff" },
};

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const risk = riskConfig[shipment.riskGrade] || riskConfig.C;
  const fundPct = Math.min(100, (shipment.fundingRaised / shipment.fundingGoal) * 100);
  const remaining = Math.max(0, shipment.fundingGoal - shipment.fundingRaised);
  const isClosingSoon = shipment.status === "open" && fundPct > 75;
  const isFeatured = (shipment as any).isFeatured === 1;
  const emoji = cargoEmoji[shipment.cargoType] || "📦";
  const statusCfg = statusConfig[shipment.status] || statusConfig.open;

  const arrDate = (shipment as any).arrivalDate ? parseISO((shipment as any).arrivalDate) : null;
  const formattedArrival = arrDate ? format(arrDate, "MMM d, yyyy") : null;

  return (
    <Link href={`/market/shipments/${shipment.id}`}>
      <div style={{
        background: "var(--tb-bg-card)",
        border: "1px solid var(--tb-border)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "var(--tb-shadow-card)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--tb-shadow-card)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
      >
        {/* Top accent bar */}
        <div style={{ height: "3px", background: isFeatured ? "linear-gradient(90deg, #2563eb, #7c3aed)" : risk.color }} />

        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "6px" }}>
                <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: risk.color, background: risk.bg, border: `1px solid ${risk.border}` }}>
                  Grade {shipment.riskGrade} · {risk.label}
                </span>
                {isClosingSoon && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <Zap size={9} /> Closing
                  </span>
                )}
                {isFeatured && (
                  <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                    ★ Featured
                  </span>
                )}
                <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: statusCfg.color, background: statusCfg.bg }}>
                  {statusCfg.label}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--tb-text-primary)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "'Space Grotesk', sans-serif" }}>
                {shipment.title}
              </h3>
            </div>
            <span style={{ fontSize: "22px", flexShrink: 0 }}>{emoji}</span>
          </div>

          {/* Route */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--tb-bg-subtle)", borderRadius: "10px", padding: "8px 10px", border: "1px solid var(--tb-border-subtle)" }}>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--tb-text-code)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>
              {shipment.origin.split(",")[0]}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
              <div style={{ width: "12px", height: "1px", background: "var(--tb-border-muted)" }} />
              <ArrowRight size={10} color="var(--tb-text-muted)" />
              <div style={{ width: "12px", height: "1px", background: "var(--tb-border-muted)" }} />
            </div>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--tb-text-code)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
              {shipment.destination.split(",")[0]}
            </span>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{ padding: "8px 10px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <TrendingUp size={9} color="#2563eb" />
                <span style={{ fontSize: "8px", fontFamily: "'JetBrains Mono', monospace", color: "var(--tb-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Return</span>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#2563eb", fontFamily: "'Space Grotesk', sans-serif" }}>+{shipment.profitPercent}%</div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: "10px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <Clock size={9} color="var(--tb-text-faint)" />
                <span style={{ fontSize: "8px", fontFamily: "'JetBrains Mono', monospace", color: "var(--tb-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transit</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipment.transitDays}d
              </div>
            </div>
          </div>

          {/* Extra info row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{ padding: "7px 10px", borderRadius: "9px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border-subtle)" }}>
              <div style={{ fontSize: "8px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Min Entry</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{shipment.minInvestment.toLocaleString()} <span style={{ fontSize: "9px", color: "var(--tb-text-muted)" }}>USDT</span></div>
            </div>
            <div style={{ padding: "7px 10px", borderRadius: "9px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border-subtle)" }}>
              <div style={{ fontSize: "8px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Remaining</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: remaining === 0 ? "#dc2626" : "var(--tb-text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{remaining === 0 ? "Full" : `${remaining.toLocaleString()}`}</div>
            </div>
          </div>

          {/* Arrival */}
          {formattedArrival && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              <Calendar size={10} color="var(--tb-text-muted)" />
              <span>ETA: {formattedArrival}</span>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <span style={{ fontSize: "9px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipment.fundingRaised.toLocaleString()} / {shipment.fundingGoal.toLocaleString()} USDT
              </span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: isClosingSoon ? "#d97706" : "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(fundPct)}%</span>
            </div>
            <div style={{ height: "5px", borderRadius: "999px", background: "var(--tb-bg-muted)", overflow: "hidden" }}>
              <div style={{ width: `${fundPct}%`, height: "100%", borderRadius: "999px", background: isClosingSoon ? "linear-gradient(90deg, #f59e0b, #fcd34d)" : "linear-gradient(90deg, #2563eb, #0891b2)", transition: "width 0.5s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
