import { useGetMarketSummary, useGetClosingSoonShipments, useGetDeliveryFeed } from "@workspace/api-client-react";
import { CommodityTicker } from "@/components/commodity-ticker";
import { ShipmentCard } from "@/components/shipment-card";
import { Link } from "wouter";
import {
  ArrowRight, TrendingUp, Ship, ArrowUpRight,
  BarChart2, Globe, Package, Zap, ChevronRight
} from "lucide-react";

function StatCard({
  label, value, sub, color, icon: Icon, bg
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  icon: any;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e8edf2",
        borderRadius: "16px",
        padding: "18px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#8c9ab0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div style={{ width: "30px", height: "30px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: "11px", color: color, fontFamily: "'JetBrains Mono', monospace", marginTop: "2px", fontWeight: 500 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

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

export default function Market() {
  const { data: summary, isLoading: isSummaryLoading } = useGetMarketSummary();
  const { data: closingSoon, isLoading: isClosingLoading } = useGetClosingSoonShipments();
  const { data: deliveryFeed, isLoading: isFeedLoading } = useGetDeliveryFeed();

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      <CommodityTicker />

      {/* Page header */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e8edf2",
        padding: "20px 16px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Market Overview
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Real-time global trade
            </p>
          </div>
          <Link href="/market/shipments">
            <div style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "8px 14px", borderRadius: "10px",
              background: "#eff6ff", color: "#2563eb",
              fontSize: "12px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
              cursor: "pointer", border: "1px solid #bfdbfe",
            }}>
              Browse <ChevronRight size={14} />
            </div>
          </Link>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "900px", margin: "0 auto" }}>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {isSummaryLoading ? (
            <>
              <SkeletonRect h={90} />
              <SkeletonRect h={90} />
              <SkeletonRect h={90} />
              <SkeletonRect h={90} />
            </>
          ) : (
            <>
              <StatCard label="Portfolio" value={(summary?.portfolioValue || 0).toLocaleString()} sub="USDT value" color="#2563eb" bg="#eff6ff" icon={BarChart2} />
              <StatCard label="Active Cargo" value={String(summary?.activeInvestments || 0)} sub="shipments" color="#0891b2" bg="#ecfeff" icon={Ship} />
              <StatCard label="Total Profit" value={`+${(summary?.totalProfit || 0).toLocaleString()}`} sub="USDT earned" color="#059669" bg="#ecfdf5" icon={TrendingUp} />
              <StatCard label="Shipped" value={String(summary?.totalShipped || 0)} sub="completed" color="#7c3aed" bg="#f5f3ff" icon={Globe} />
            </>
          )}
        </div>

        {/* Featured Manifest */}
        {summary?.featuredShipment && (
          <section style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                Featured Manifest
              </h2>
              <Link href={`/market/shipments/${summary.featuredShipment.id}`}>
                <span style={{ fontSize: "12px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
                  Details →
                </span>
              </Link>
            </div>

            <Link href={`/market/shipments/${summary.featuredShipment.id}`}>
              <div style={{
                background: "#ffffff",
                border: "1px solid #e8edf2",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                cursor: "pointer",
              }}>
                {/* Blue accent top strip */}
                <div style={{ height: "4px", background: "linear-gradient(90deg, #2563eb, #0891b2)" }} />
                <div style={{ padding: "18px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: "#eff6ff", marginBottom: "10px" }}>
                    <Zap size={10} color="#2563eb" />
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Prime Opportunity
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                    {summary.featuredShipment.title}
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Package size={13} color="#94a3b8" /> {summary.featuredShipment.cargoType}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#059669", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      <TrendingUp size={13} /> +{summary.featuredShipment.profitPercent}% return
                    </span>
                  </div>

                  {/* Route pill */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "#f8fafc", border: "1px solid #e8edf2",
                    borderRadius: "10px", padding: "10px 14px",
                    marginBottom: "14px",
                  }}>
                    <span style={{ fontSize: "13px", color: "#334155", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {summary.featuredShipment.origin.split(",")[0]}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8", flexShrink: 0 }}>
                      <div style={{ width: "24px", height: "1px", background: "#cbd5e1" }} />
                      <Ship size={14} color="#2563eb" />
                      <div style={{ width: "24px", height: "1px", background: "#cbd5e1" }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "#334155", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                      {summary.featuredShipment.destination.split(",")[0]}
                    </span>
                  </div>

                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "44px", borderRadius: "12px",
                    background: "#2563eb", color: "white",
                    fontSize: "14px", fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
                  }}>
                    Fund This Shipment →
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Closing Soon */}
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
              Closing Soon
            </h2>
            <Link href="/market/shipments">
              <span style={{ fontSize: "12px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
                View All →
              </span>
            </Link>
          </div>

          {isClosingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <SkeletonRect h={180} />
              <SkeletonRect h={180} />
            </div>
          ) : closingSoon?.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              {closingSoon.slice(0, 4).map(s => <ShipmentCard key={s.id} shipment={s} />)}
            </div>
          ) : (
            <div style={{
              background: "#ffffff", border: "1px dashed #e2e8f0",
              borderRadius: "16px", padding: "40px 20px", textAlign: "center",
            }}>
              <Ship size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                No shipments closing soon.
              </p>
            </div>
          )}
        </section>

        {/* Live Deliveries */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
              Live Deliveries
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "10px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>LIVE</span>
            </div>
          </div>

          <div style={{
            background: "#ffffff",
            border: "1px solid #e8edf2",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            {isFeedLoading ? (
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {[...Array(4)].map((_, i) => <SkeletonRect key={i} h={60} />)}
              </div>
            ) : deliveryFeed?.length ? (
              <div>
                {deliveryFeed.map((event, idx) => (
                  <div key={event.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "14px 16px",
                    borderBottom: idx < deliveryFeed.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Ship size={16} color="#059669" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.shipmentTitle}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                        {event.traderId}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#059669", fontWeight: 700, fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", justifyContent: "flex-end" }}>
                        <ArrowUpRight size={13} />
                        {event.profit.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                        USDT profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                  No recent deliveries.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
