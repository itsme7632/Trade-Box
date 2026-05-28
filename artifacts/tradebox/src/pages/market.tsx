import { useGetMarketSummary, useGetClosingSoonShipments, useGetDeliveryFeed } from "@workspace/api-client-react";
import { CommodityTicker } from "@/components/commodity-ticker";
import { ShipmentCard } from "@/components/shipment-card";
import { Link } from "wouter";
import { ArrowRight, Package, TrendingUp, Ship, ArrowUpRight, BarChart2, Zap, Globe } from "lucide-react";

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent?: string; icon: any
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 card-hover"
      style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: accent ? `${accent}15` : "rgba(59,130,246,0.1)" }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent || "#3B82F6" }} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[#F1F5F9]"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && <div className="text-xs font-mono mt-1" style={{ color: accent || "#475569" }}>{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="rounded-2xl h-28 shimmer" />;
}

export default function Market() {
  const { data: summary, isLoading: isSummaryLoading } = useGetMarketSummary();
  const { data: closingSoon, isLoading: isClosingLoading } = useGetClosingSoonShipments();
  const { data: deliveryFeed, isLoading: isFeedLoading } = useGetDeliveryFeed();

  return (
    <div className="min-h-screen bg-[#050D1B]">
      <CommodityTicker />

      {/* Hero gradient */}
      <div className="relative overflow-hidden px-4 pt-6 pb-4 md:px-8 md:pt-8">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(37,99,235,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(6,182,212,0.06) 0%, transparent 50%)" }} />
        <div className="flex items-center justify-between mb-1 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Market Overview
            </h1>
            <p className="text-[#475569] text-xs font-mono mt-0.5">Real-time global trade data</p>
          </div>
          <Link href="/market/shipments">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono text-[#3B82F6] transition-colors"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              Browse All <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-8">

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isSummaryLoading ? (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Portfolio Value" value={`${(summary?.portfolioValue || 0).toLocaleString()}`} sub="USDT" icon={BarChart2} />
              <StatCard label="Active Cargo" value={`${summary?.activeInvestments || 0}`} sub="shipments" icon={Ship} accent="#06B6D4" />
              <StatCard label="Total Profit" value={`+${(summary?.totalProfit || 0).toLocaleString()}`} sub="USDT earned" icon={TrendingUp} accent="#10B981" />
              <StatCard label="Total Shipped" value={`${summary?.totalShipped || 0}`} sub="completed" icon={Globe} accent="#8B5CF6" />
            </>
          )}
        </div>

        {/* Featured Manifest */}
        {summary?.featuredShipment && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Featured Manifest
              </h2>
              <Link href={`/market/shipments/${summary.featuredShipment.id}`}>
                <span className="text-xs font-mono text-[#3B82F6] flex items-center gap-1 hover:text-[#60A5FA] transition-colors">
                  Details <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(10,22,40,0.95) 60%)",
                border: "1px solid rgba(59,130,246,0.25)"
              }}>
              <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08), transparent 50%)" }} />

              <div className="p-6 md:p-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 text-[10px] font-mono uppercase tracking-widest"
                      style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA" }}>
                      <Zap className="h-2.5 w-2.5" /> Prime Opportunity
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                      {summary.featuredShipment.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Package className="h-3.5 w-3.5 text-[#3B82F6]" /> {summary.featuredShipment.cargoType}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[#10B981]">
                        <TrendingUp className="h-3.5 w-3.5" /> +{summary.featuredShipment.profitPercent}% return
                      </span>
                    </div>
                  </div>

                  <div className="w-full md:w-72 shrink-0 space-y-3">
                    <div className="rounded-xl p-4"
                      style={{ background: "rgba(5,13,27,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[10px] font-mono text-[#334155] uppercase tracking-widest mb-2">Route · {summary.featuredShipment.transitDays} days</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[#94A3B8] truncate">{summary.featuredShipment.origin.split(",")[0]}</span>
                        <div className="flex-1 flex items-center gap-0.5">
                          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #1E3A5F, #3B82F6, #1E3A5F)" }} />
                          <Ship className="h-3 w-3 text-[#3B82F6] shrink-0" />
                        </div>
                        <span className="font-semibold text-[#94A3B8] truncate">{summary.featuredShipment.destination.split(",")[0]}</span>
                      </div>
                    </div>
                    <Link href={`/market/shipments/${summary.featuredShipment.id}`} className="block">
                      <button className="w-full h-11 rounded-xl font-semibold text-white text-sm transition-all duration-200"
                        style={{
                          background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                          boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}>
                        Fund Shipment →
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Closing Soon */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Closing Soon
              </h2>
              <Link href="/market/shipments">
                <span className="text-xs font-mono text-[#3B82F6] flex items-center gap-1 hover:text-[#60A5FA] transition-colors">
                  View All <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            {isClosingLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-56 shimmer rounded-2xl" />
                ))}
              </div>
            ) : closingSoon?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {closingSoon.slice(0, 4).map(s => <ShipmentCard key={s.id} shipment={s} />)}
              </div>
            ) : (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: "rgba(10,22,40,0.5)", border: "1px dashed rgba(255,255,255,0.06)" }}>
                <Ship className="h-10 w-10 text-[#1E3A5F] mx-auto mb-3" />
                <p className="text-[#334155] font-mono text-sm">No shipments closing soon.</p>
              </div>
            )}
          </section>

          {/* Delivery Feed */}
          <section>
            <h2 className="text-base font-bold text-[#E2E8F0] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Live Deliveries
            </h2>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="p-3.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[10px] font-mono text-[#334155] uppercase tracking-widest">Recent Cargo Landed</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#10B981]">Live</span>
                </div>
              </div>
              <div className="divide-y overflow-y-auto max-h-[420px]" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
                {isFeedLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 flex gap-3">
                      <div className="w-9 h-9 rounded-full shimmer shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 shimmer rounded" />
                        <div className="h-2.5 w-1/2 shimmer rounded" />
                      </div>
                    </div>
                  ))
                ) : deliveryFeed?.length ? (
                  deliveryFeed.map(event => (
                    <div key={event.id} className="p-4 flex items-start gap-3 hover:bg-white/1 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <Ship className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#CBD5E1] truncate">{event.shipmentTitle}</p>
                        <p className="text-xs font-mono text-[#334155] mt-0.5">{event.traderId}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 text-[#10B981] text-sm font-bold font-mono justify-end">
                          <ArrowUpRight className="h-3 w-3" />
                          {event.profit.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#334155] font-mono">USDT profit</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-[#334155] font-mono text-sm">No recent deliveries.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
