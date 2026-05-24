import { Shipment } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, Anchor, TrendingUp, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const isClosingSoon = shipment.status === 'open' && shipment.fundingRaised / shipment.fundingGoal > 0.8;

  const riskColors: Record<string, string> = {
    A: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
    B: "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20",
    C: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    D: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  };

  const statusColors: Record<string, string> = {
    open: "bg-[#0066FF]/10 text-[#0066FF]",
    funded: "bg-white text-[#0F1923] border border-[#EEF2F8]",
    in_transit: "bg-[#F59E0B]/10 text-[#F59E0B]",
    delivered: "bg-[#22C55E]/10 text-[#22C55E]",
  };

  return (
    <Link href={`/market/shipments/${shipment.id}`} className="block">
      <div className="bg-white rounded-xl border border-[#EEF2F8] p-5 hover:border-[#0066FF] transition-all cursor-pointer h-full flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#0066FF]/10 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[#6A82A0] uppercase tracking-wider">{shipment.cargoType}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider border ${riskColors[shipment.riskGrade]}`}>
                Risk {shipment.riskGrade}
              </span>
            </div>
            <h3 className="font-heading font-bold text-lg text-[#0F1923] group-hover:text-[#0066FF] transition-colors line-clamp-1">{shipment.title}</h3>
          </div>
          <div className={`text-xs px-2.5 py-1 rounded font-mono uppercase tracking-wider ${statusColors[shipment.status]}`}>
            {shipment.status.replace('_', ' ')}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <p className="text-xs text-[#6A82A0] font-mono mb-1 uppercase tracking-wider">Origin</p>
            <p className="text-sm font-semibold text-[#0F1923] truncate" title={shipment.origin}>{shipment.origin}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-[#6A82A0] px-2 shrink-0">
            <ArrowRight className="h-4 w-4 mb-1" />
            <span className="text-[10px] font-mono">{shipment.transitDays}d</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs text-[#6A82A0] font-mono mb-1 uppercase tracking-wider">Dest</p>
            <p className="text-sm font-semibold text-[#0F1923] truncate" title={shipment.destination}>{shipment.destination}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#F8FAFD] p-3 rounded-lg border border-[#EEF2F8]">
            <div className="flex items-center gap-1.5 mb-1 text-[#6A82A0]">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-mono uppercase tracking-wider">Target Return</span>
            </div>
            <p className="text-lg font-bold text-[#0066FF] font-mono">+{shipment.profitPercent}%</p>
          </div>
          <div className="bg-[#F8FAFD] p-3 rounded-lg border border-[#EEF2F8]">
            <div className="flex items-center gap-1.5 mb-1 text-[#6A82A0]">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="text-xs font-mono uppercase tracking-wider">Min Entry</span>
            </div>
            <p className="text-lg font-bold text-[#0F1923] font-mono">{shipment.minInvestment.toLocaleString()} USDT</p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[#EEF2F8]">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-[#6A82A0] font-mono uppercase tracking-wider mb-1">Funding Progress</p>
              <p className="text-sm font-bold text-[#0F1923] font-mono">
                {shipment.fundingRaised.toLocaleString()} <span className="text-[#6A82A0] font-normal">/ {shipment.fundingGoal.toLocaleString()} USDT</span>
              </p>
            </div>
            <p className="text-sm font-bold text-[#0066FF] font-mono">
              {Math.round((shipment.fundingRaised / shipment.fundingGoal) * 100)}%
            </p>
          </div>
          <Progress 
            value={(shipment.fundingRaised / shipment.fundingGoal) * 100} 
            className="h-2 bg-[#F8FAFD]"
            indicatorClassName={isClosingSoon ? "bg-[#F59E0B]" : "bg-[#0066FF]"}
          />
        </div>
      </div>
    </Link>
  );
}
