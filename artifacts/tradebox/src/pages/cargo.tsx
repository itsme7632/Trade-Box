import { useState } from "react";
import { useListInvestments, type ListInvestmentsStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Ship, Clock, CheckCircle2, TrendingUp, Search, ArrowRight, Package } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusCfg = {
  delivered: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: CheckCircle2, label: "Delivered" },
  active: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: Clock, label: "In Transit" },
  cancelled: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: Ship, label: "Cancelled" },
};

const filters: { id: ListInvestmentsStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
];

const cargoEmoji: Record<string, string> = {
  electronics: "⚡", agricultural: "🌿", cocoa: "🍫", coffee: "☕",
  minerals: "⛏️", textiles: "🧵", lithium: "🔋", pharmaceuticals: "💊",
  pharma: "💊", steel: "⚙️",
};

function S({ h = 100 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: 14 }} />;
}

export default function Cargo() {
  const [statusFilter, setStatusFilter] = useState<ListInvestmentsStatus>("all");
  const [search, setSearch] = useState("");
  const { data: investments, isLoading } = useListInvestments({ status: statusFilter });

  const filtered = investments?.filter(inv =>
    search
      ? inv.shipment?.title.toLowerCase().includes(search.toLowerCase()) ||
        inv.shipment?.cargoType.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>My Cargo</h1>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active & completed investments</p>
      </div>

      <div style={{ padding: "16px", maxWidth: "720px", margin: "0 auto" }}>

        {/* Controls */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: "4px", padding: "3px", background: "#f1f5f9", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                padding: "6px 14px", borderRadius: "9px", border: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: statusFilter === f.id ? 600 : 500,
                background: statusFilter === f.id ? "#ffffff" : "transparent",
                color: statusFilter === f.id ? "#2563eb" : "#64748b",
                boxShadow: statusFilter === f.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}>{f.label}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
            <Search size={13} color="#94a3b8" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              placeholder="Search cargo..."
              style={{
                width: "100%", height: "38px", paddingLeft: "32px", paddingRight: "12px",
                borderRadius: "10px", border: "1.5px solid #e2e8f0",
                background: "#ffffff", fontSize: "13px", color: "#0f172a",
                outline: "none", fontFamily: "'Inter', sans-serif",
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Portfolio summary */}
        {!isLoading && filtered && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "16px" }}>
            {[
              { label: "Committed", value: `${filtered.reduce((a, i) => a + i.amount, 0).toLocaleString()} USDT`, color: "#2563eb" },
              { label: "Expected", value: `+${filtered.reduce((a, i) => a + (i.expectedProfit || 0), 0).toLocaleString()} USDT`, color: "#d97706" },
              { label: "Realized", value: `+${filtered.reduce((a, i) => a + (i.actualProfit || 0), 0).toLocaleString()} USDT`, color: "#059669" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{s.label}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[...Array(3)].map((_, i) => <S key={i} h={130} />)}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(inv => {
              const cfg = statusCfg[inv.status as keyof typeof statusCfg] || statusCfg.active;
              const StatusIcon = cfg.icon;
              const isActive = inv.status === "active";
              const isDelivered = inv.status === "delivered";
              const emoji = cargoEmoji[inv.shipment?.cargoType || ""] || "📦";

              return (
                <div key={inv.id} style={{
                  background: "#ffffff", border: "1px solid #e8edf2",
                  borderRadius: "16px", overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ height: "3px", background: cfg.color }} />
                  <div style={{ padding: "14px 16px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "22px", flexShrink: 0, marginTop: "2px" }}>{emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "'JetBrains Mono', monospace" }}>
                            <StatusIcon size={9} style={{ marginRight: "3px", display: "inline" }} />
                            {cfg.label}
                          </span>
                          {inv.shipment?.cargoType && (
                            <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", color: "#64748b", background: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>
                              {inv.shipment.cargoType}
                            </span>
                          )}
                        </div>
                        <Link href={`/market/shipments/${inv.shipmentId}`}>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.3, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                            {inv.shipment?.title}
                          </h3>
                        </Link>
                        {inv.shipment?.origin && inv.shipment?.destination && (
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Ship size={10} /> {inv.shipment.origin.split(",")[0]} → {inv.shipment.destination.split(",")[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e8edf2" }}>
                        <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "2px" }}>Committed</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>{inv.amount.toLocaleString()}</div>
                      </div>
                      <div style={{ padding: "8px 10px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                        <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "2px" }}>Return</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>+{inv.profitPercent}%</div>
                      </div>
                      <div style={{ padding: "8px 10px", background: isDelivered ? "#ecfdf5" : "#fffbeb", borderRadius: "10px", border: `1px solid ${isDelivered ? "#a7f3d0" : "#fde68a"}` }}>
                        <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "2px" }}>{isDelivered ? "Realized" : "Expected"}</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: isDelivered ? "#059669" : "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>
                          +{(inv.actualProfit || inv.expectedProfit || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  {(isActive || isDelivered) && (
                    <div style={{
                      padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                      borderTop: "1px solid #f1f5f9",
                      background: isDelivered ? "#f0fdf4" : "#fafbff",
                    }}>
                      {isActive && inv.shipment && (
                        <>
                          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                            ETA: <b style={{ color: "#0f172a" }}>{format(parseISO(inv.shipment.arrivalDate), "MMM dd, yyyy")}</b>
                          </span>
                          <Link href="/tracker">
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
                              Track <ArrowRight size={11} />
                            </span>
                          </Link>
                        </>
                      )}
                      {isDelivered && (
                        <>
                          <span style={{ fontSize: "11px", color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>
                            Delivered {inv.deliveredAt ? format(parseISO(inv.deliveredAt), "MMM dd, yyyy") : ""}
                          </span>
                          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>Profit credited ✓</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "#ffffff", border: "1px dashed #e2e8f0", borderRadius: "16px", padding: "60px 20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <Package size={36} color="#cbd5e1" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>No Cargo Found</h3>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {search ? "No investments match your search." : "You haven't invested yet."}
            </p>
            <Link href="/market/shipments">
              <button style={{ padding: "10px 20px", borderRadius: "12px", background: "#2563eb", color: "white", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                Browse Market
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
