import { useState } from "react";
import { useListInvestments, type ListInvestmentsStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Ship, Clock, CheckCircle2, TrendingUp, Search, ArrowRight, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";

const statusConfig = {
  delivered: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", icon: CheckCircle2, label: "Delivered" },
  active: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", icon: Clock, label: "In Transit" },
  cancelled: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", icon: Ship, label: "Cancelled" },
};

const filters: { id: ListInvestmentsStatus; label: string }[] = [
  { id: "all", label: "All Cargo" },
  { id: "active", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
];

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
    <div className="min-h-screen bg-[#050D1B]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            My Cargo
          </h1>
          <p className="text-[#475569] text-xs font-mono uppercase tracking-widest">Active &amp; completed investments</p>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-200"
                style={statusFilter === f.id ? {
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  color: "white",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.35)"
                } : { color: "#475569" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#334155]" />
            <Input
              placeholder="Search cargo..."
              className="tb-input h-9 pl-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Portfolio summary */}
        {!isLoading && filtered && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Committed",
                value: `${filtered.reduce((a, i) => a + i.amount, 0).toLocaleString()} USDT`,
                color: "#3B82F6"
              },
              {
                label: "Expected Profit",
                value: `+${filtered.reduce((a, i) => a + (i.expectedProfit || 0), 0).toLocaleString()} USDT`,
                color: "#F59E0B"
              },
              {
                label: "Realized Profit",
                value: `+${filtered.reduce((a, i) => a + (i.actualProfit || 0), 0).toLocaleString()} USDT`,
                color: "#10B981"
              },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cargo list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(inv => {
              const cfg = statusConfig[inv.status as keyof typeof statusConfig] || statusConfig.active;
              const StatusIcon = cfg.icon;
              const isActive = inv.status === "active";
              const isDelivered = inv.status === "delivered";

              return (
                <div key={inv.id} className="rounded-2xl overflow-hidden card-hover"
                  style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Top accent bar */}
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${cfg.color}60, transparent)` }} />

                  <div className="p-5">
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Left info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </div>
                          {inv.shipment?.cargoType && (
                            <span className="text-[10px] font-mono text-[#334155] uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              {inv.shipment.cargoType}
                            </span>
                          )}
                        </div>
                        <Link href={`/market/shipments/${inv.shipmentId}`}>
                          <h3 className="text-base font-bold text-[#E2E8F0] hover:text-[#60A5FA] transition-colors line-clamp-1 mb-2"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {inv.shipment?.title}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569] font-mono">
                          {inv.shipment?.vesselName && (
                            <span className="flex items-center gap-1">
                              <Ship className="h-3 w-3 text-[#3B82F6]" /> {inv.shipment.vesselName}
                            </span>
                          )}
                          {inv.shipment?.origin && inv.shipment?.destination && (
                            <span className="flex items-center gap-1">
                              {inv.shipment.origin.split(",")[0]}
                              <ArrowRight className="h-2.5 w-2.5" />
                              {inv.shipment.destination.split(",")[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right stats */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:min-w-[320px]"
                        style={{
                          background: "rgba(5,13,27,0.5)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "14px",
                          padding: "14px"
                        }}>
                        <div>
                          <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-1">Committed</div>
                          <div className="text-sm font-bold text-[#E2E8F0] font-mono">{inv.amount.toLocaleString()}<span className="text-[10px] text-[#475569] ml-0.5">USDT</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-1">Return Rate</div>
                          <div className="text-sm font-bold text-[#3B82F6] font-mono">+{inv.profitPercent}%</div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5 text-[#10B981]" />
                            {isDelivered ? "Realized" : "Expected"}
                          </div>
                          <div className="text-sm font-bold font-mono" style={{ color: isDelivered ? "#10B981" : "#F59E0B" }}>
                            +{(inv.actualProfit || inv.expectedProfit || 0).toLocaleString()}
                            <span className="text-[10px] opacity-60 ml-0.5">USDT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer bar */}
                  {(isActive || isDelivered) && (
                    <div className="px-5 py-2.5 flex justify-between items-center"
                      style={{
                        background: isDelivered ? "rgba(16,185,129,0.05)" : "rgba(59,130,246,0.05)",
                        borderTop: `1px solid ${isDelivered ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)"}`
                      }}>
                      {isActive && inv.shipment && (
                        <>
                          <span className="text-xs font-mono" style={{ color: "#3B82F6" }}>
                            ETA: {format(parseISO(inv.shipment.arrivalDate), "MMM dd, yyyy")}
                          </span>
                          <Link href="/tracker">
                            <span className="text-xs font-mono font-bold text-[#E2E8F0] hover:text-[#60A5FA] flex items-center gap-1 transition-colors">
                              Track Live <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        </>
                      )}
                      {isDelivered && (
                        <>
                          <span className="text-xs font-mono text-[#10B981]">
                            Delivered {inv.deliveredAt ? format(parseISO(inv.deliveredAt), "MMM dd, yyyy") : ""}
                          </span>
                          <span className="text-xs font-mono text-[#334155]">Profit credited ✓</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl p-14 flex flex-col items-center text-center"
            style={{ background: "rgba(10,22,40,0.5)", border: "1px dashed rgba(255,255,255,0.06)" }}>
            <Package className="h-12 w-12 text-[#1E3A5F] mb-4" />
            <h3 className="text-lg font-bold text-[#475569] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No Cargo Found
            </h3>
            <p className="text-[#334155] font-mono text-sm mb-6">
              {search ? "No investments match your search." : "You haven't invested in any shipments yet."}
            </p>
            <Link href="/market/shipments">
              <button className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}>
                Browse Market
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
