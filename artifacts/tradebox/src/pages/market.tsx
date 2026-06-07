import { useGetMarketSummary, useGetClosingSoonShipments, useGetDeliveryFeed } from "@workspace/api-client-react";
import { CommodityTicker } from "@/components/commodity-ticker";
import { ShipmentCard } from "@/components/shipment-card";
import { Link } from "wouter";
import {
  ArrowRight, TrendingUp, Ship, ArrowUpRight,
  BarChart2, Globe, Package, Zap, ChevronRight, Newspaper,
  Wallet, Users, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, DollarSign
} from "lucide-react";
import { useGetLatestNewsPosts } from "@workspace/api-client-react/src/extra-hooks";
import { formatDistanceToNow, parseISO } from "date-fns";

function StatCard({ label, value, sub, color, icon: Icon, bg }: { label: string; value: string; sub?: string; color: string; bg: string; icon: any }) {
  return (
    <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", padding: "16px", boxShadow: "var(--tb-shadow-sm)", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "var(--tb-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{value}</div>
        {sub && <div style={{ fontSize: "10px", color, fontFamily: "'JetBrains Mono', monospace", marginTop: "1px", fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Sk({ h = 80, r = 12 }: { h?: number; r?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: r }} />;
}

const txTypeLabel: Record<string, { label: string; color: string; icon: any; sign: string }> = {
  deposit:        { label: "Deposit",    color: "#059669", icon: ArrowDownToLine, sign: "+" },
  withdrawal:     { label: "Withdrawal", color: "#dc2626", icon: ArrowUpFromLine, sign: "-" },
  delivery_profit:{ label: "Profit",     color: "#059669", icon: TrendingUp,      sign: "+" },
  guild_commission:{ label: "Guild",     color: "#7c3aed", icon: Users,           sign: "+" },
  investment:     { label: "Invested",   color: "#2563eb", icon: Package,         sign: "-" },
};

const statusColor: Record<string, string> = {
  cleared: "#059669", pending: "#d97706", pending_review: "#d97706", reviewing: "#d97706", rejected: "#dc2626", in_transit: "#0891b2",
};

function RecentActivity({ items }: { items: Array<{ id: number; type: string; amount: number; status: string; coin: string; createdAt: string }> }) {
  if (!items.length) return null;
  return (
    <section style={{ marginBottom: "24px" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Recent Activity</h2>
      <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--tb-shadow-sm)" }}>
        {items.slice(0, 6).map((t, idx) => {
          const cfg = txTypeLabel[t.type] || { label: t.type, color: "#64748b", icon: DollarSign, sign: "" };
          const Icon = cfg.icon;
          const timeAgo = formatDistanceToNow(parseISO(t.createdAt), { addSuffix: true });
          const sColor = statusColor[t.status] || "#94a3b8";
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: idx < Math.min(items.length, 6) - 1 ? "1px solid var(--tb-border-subtle)" : "none" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${cfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={14} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--tb-text-primary)" }}>{cfg.label}</p>
                <p style={{ margin: "1px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}>{cfg.sign}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.coin}</div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: sColor, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Market() {
  const { data: summary, isLoading: isSummaryLoading } = useGetMarketSummary();
  const { data: closingSoon, isLoading: isClosingLoading } = useGetClosingSoonShipments();
  const { data: deliveryFeed, isLoading: isFeedLoading } = useGetDeliveryFeed();

  const stats = [
    { label: "Portfolio Value",     value: `${((summary as any)?.portfolioValue || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: "USDT invested",    color: "#2563eb", bg: "#eff6ff", icon: BarChart2        },
    { label: "Available Balance",   value: `${((summary as any)?.availableBalance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: "USDT balance",    color: "#059669", bg: "#ecfdf5", icon: Wallet            },
    { label: "Total Profit Earned", value: `+${((summary as any)?.totalProfit || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: "USDT realized",  color: "#059669", bg: "#ecfdf5", icon: TrendingUp         },
    { label: "Active Shipments",    value: String((summary as any)?.activeInvestments || 0),                                                                         sub: "in transit",      color: "#0891b2", bg: "#ecfeff", icon: Ship              },
    { label: "Completed",           value: String((summary as any)?.completedShipments || 0),                                                                        sub: "delivered",       color: "#7c3aed", bg: "#f5f3ff", icon: CheckCircle2       },
    { label: "Referral Earnings",   value: `${((summary as any)?.referralEarnings || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: "guild commissions", color: "#d97706", bg: "#fffbeb", icon: Users          },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--tb-bg-page)" }}>
      <CommodityTicker />

      {/* Page header */}
      <div style={{ background: "var(--tb-header)", borderBottom: "1px solid var(--tb-border)", padding: "18px 16px 14px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Market Overview</h1>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Real-time global trade</p>
          </div>
          <Link href="/market/shipments">
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid #bfdbfe" }}>
              Browse <ChevronRight size={14} />
            </div>
          </Link>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "900px", margin: "0 auto" }}>

        {/* Stats grid — 2 cols on mobile, 3 on wider */}
        <div className="tb-grid-stats">
          {isSummaryLoading
            ? [...Array(6)].map((_, i) => <Sk key={i} h={80} />)
            : stats.map((s, i) => <StatCard key={i} {...s} />)
          }
        </div>

        {/* Featured Manifest */}
        {(summary as any)?.featuredShipment && (
          <section style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Featured Opportunity</h2>
              <Link href={`/market/shipments/${(summary as any).featuredShipment.id}`}>
                <span style={{ fontSize: "12px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>Details →</span>
              </Link>
            </div>
            <Link href={`/market/shipments/${(summary as any).featuredShipment.id}`}>
              <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--tb-shadow-md)", cursor: "pointer" }}>
                <div style={{ height: "4px", background: "linear-gradient(90deg, #2563eb, #0891b2)" }} />
                <div style={{ padding: "18px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: "#eff6ff", marginBottom: "10px" }}>
                    <Zap size={10} color="#2563eb" />
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prime Opportunity</span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                    {(summary as any).featuredShipment.title}
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "var(--tb-text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Package size={13} color="var(--tb-text-muted)" /> {(summary as any).featuredShipment.cargoType}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#059669", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      <TrendingUp size={13} /> +{(summary as any).featuredShipment.profitPercent}% return
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "var(--tb-text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Min: {((summary as any).featuredShipment.minInvestment || 0).toLocaleString()} USDT
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", color: "var(--tb-text-code)", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(summary as any).featuredShipment.origin.split(",")[0]}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                      <div style={{ width: "20px", height: "1px", background: "var(--tb-border-muted)" }} />
                      <Ship size={14} color="#2563eb" />
                      <div style={{ width: "20px", height: "1px", background: "var(--tb-border-muted)" }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--tb-text-code)", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                      {(summary as any).featuredShipment.destination.split(",")[0]}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "44px", borderRadius: "12px", background: "#2563eb", color: "white", fontSize: "14px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 12px rgba(37,99,235,0.35)" }}>
                    Fund This Shipment →
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── Latest TradeBox News (moved up) ── */}
        <LatestNews />

        {/* Recent Activity */}
        {(summary as any)?.recentActivity?.length > 0 && (
          <RecentActivity items={(summary as any).recentActivity} />
        )}

        {/* Closing Soon */}
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Closing Soon</h2>
            <Link href="/market/shipments">
              <span style={{ fontSize: "12px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>View All →</span>
            </Link>
          </div>
          {isClosingLoading
            ? <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}><Sk h={180} /><Sk h={180} /></div>
            : closingSoon?.length
              ? <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>{closingSoon.slice(0, 4).map(s => <ShipmentCard key={s.id} shipment={s} />)}</div>
              : <div style={{ background: "var(--tb-bg-card)", border: "1px dashed var(--tb-border)", borderRadius: "16px", padding: "40px 20px", textAlign: "center" }}>
                  <Ship size={32} color="var(--tb-text-muted)" style={{ marginBottom: "10px" }} />
                  <p style={{ margin: 0, color: "var(--tb-text-muted)", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>No shipments closing soon.</p>
                </div>
          }
        </section>

        {/* Live Deliveries */}
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Live Deliveries</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "10px", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>LIVE</span>
            </div>
          </div>
          <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--tb-shadow-sm)" }}>
            {isFeedLoading
              ? <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>{[...Array(4)].map((_, i) => <Sk key={i} h={60} />)}</div>
              : deliveryFeed?.length
                ? <div>
                    {deliveryFeed.map((event, idx) => (
                      <div key={event.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: idx < deliveryFeed.length - 1 ? "1px solid var(--tb-border-subtle)" : "none" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Ship size={16} color="#059669" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "var(--tb-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.shipmentTitle}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{event.traderId}</p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#059669", fontWeight: 700, fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", justifyContent: "flex-end" }}>
                            <ArrowUpRight size={13} />{event.profit.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>USDT profit</div>
                        </div>
                      </div>
                    ))}
                  </div>
                : <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ margin: 0, color: "var(--tb-text-muted)", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>No recent deliveries.</p>
                  </div>
            }
          </div>
        </section>

      </div>
    </div>
  );
}

function LatestNews() {
  const { data: posts, isLoading } = useGetLatestNewsPosts();

  if (isLoading) return (
    <section style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Newspaper size={16} color="#2563eb" />
        <span style={{ fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--tb-text-primary)" }}>Latest News</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: "10px" }}>
        {[1,2,3].map(i => <Sk key={i} h={100} />)}
      </div>
    </section>
  );

  if (!posts?.length) return null;

  const catColors: Record<string, string> = {
    platform_update: "#2563eb", new_shipment: "#0891b2", maintenance: "#d97706",
    feature_release: "#7c3aed", security_alert: "#dc2626", promotion: "#059669",
    partnership: "#0ea5e9", general: "#64748b",
  };

  return (
    <section style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Newspaper size={16} color="#2563eb" />
          <span style={{ fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--tb-text-primary)" }}>Latest TradeBox News</span>
        </div>
        <Link href="/news">
          <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#2563eb", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
            View all <ChevronRight size={12} />
          </span>
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: "10px" }}>
        {posts.map(post => {
          const timeAgo = post.publishedAt ? formatDistanceToNow(parseISO(post.publishedAt), { addSuffix: true }) : "";
          const color = catColors[post.category] ?? "#64748b";
          return (
            <Link key={post.id} href="/news">
              <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "14px", overflow: "hidden", cursor: "pointer", boxShadow: "var(--tb-shadow-sm)", transition: "transform 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "var(--tb-shadow-sm)"; }}
              >
                <div style={{ height: "3px", background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
                <div style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: "uppercase", color, letterSpacing: "0.06em" }}>{post.category.replace("_", " ")}</span>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 700, color: "var(--tb-text-primary)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.title}</p>
                  <p style={{ margin: "5px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
