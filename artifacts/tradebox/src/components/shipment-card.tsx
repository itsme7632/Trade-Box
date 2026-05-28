import { Shipment } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, TrendingUp, Clock, Zap } from "lucide-react";

const riskConfig: Record<string, { color: string; bg: string; label: string }> = {
  A: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Low Risk" },
  B: { color: "#3B82F6", bg: "rgba(59,130,246,0.1)", label: "Moderate" },
  C: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "Medium Risk" },
  D: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", label: "High Risk" },
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
      <div className="card-hover rounded-2xl h-full flex flex-col cursor-pointer overflow-hidden"
        style={{
          background: "rgba(10,22,40,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)"
        }}>

        {/* Top gradient bar */}
        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, ${risk.color}44, ${risk.color}22, transparent)` }} />

        <div className="p-5 flex flex-col flex-1 gap-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.color}30` }}>
                  Grade {shipment.riskGrade}
                </span>
                {isClosingSoon && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <Zap className="h-2.5 w-2.5" /> Closing
                  </span>
                )}
              </div>
              <h3 className="font-bold text-[#E2E8F0] text-sm leading-snug line-clamp-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {shipment.title}
              </h3>
            </div>
            <div className="text-2xl shrink-0 ml-1">{emoji}</div>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 min-w-0">
              <div className="text-[#334155] font-mono mb-0.5 text-[10px] uppercase tracking-wider">From</div>
              <div className="text-[#94A3B8] font-medium truncate">{shipment.origin.split(",")[0]}</div>
            </div>
            <div className="flex flex-col items-center gap-0.5 shrink-0 px-1">
              <ArrowRight className="h-3.5 w-3.5 text-[#1E3A5F]" />
              <span className="text-[9px] font-mono text-[#334155]">{shipment.transitDays}d</span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[#334155] font-mono mb-0.5 text-[10px] uppercase tracking-wider">To</div>
              <div className="text-[#94A3B8] font-medium truncate">{shipment.destination.split(",")[0]}</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 flex flex-col gap-0.5"
              style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)" }}>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#334155] uppercase tracking-wider">
                <TrendingUp className="h-2.5 w-2.5" /> Return
              </div>
              <div className="text-[#60A5FA] font-bold font-mono text-base">+{shipment.profitPercent}%</div>
            </div>
            <div className="rounded-xl p-3 flex flex-col gap-0.5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#334155] uppercase tracking-wider">
                <Clock className="h-2.5 w-2.5" /> Min Entry
              </div>
              <div className="text-[#E2E8F0] font-bold font-mono text-sm">{shipment.minInvestment.toLocaleString()} <span className="text-[10px] text-[#475569]">USDT</span></div>
            </div>
          </div>

          {/* Funding progress */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="font-mono text-[#334155]">
                {shipment.fundingRaised.toLocaleString()} / {shipment.fundingGoal.toLocaleString()} USDT
              </span>
              <span className="font-mono font-bold" style={{ color: isClosingSoon ? "#F59E0B" : "#3B82F6" }}>
                {Math.round(fundPct)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fundPct}%`,
                  background: isClosingSoon
                    ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                    : "linear-gradient(90deg, #2563EB, #06B6D4)",
                  boxShadow: isClosingSoon ? "0 0 8px rgba(245,158,11,0.5)" : "0 0 8px rgba(37,99,235,0.5)"
                }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
