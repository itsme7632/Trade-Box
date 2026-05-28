import { useGetCommodityPrices } from "@workspace/api-client-react";
import { useCommodityPrices } from "@/hooks/use-socket";
import { TrendingUp, TrendingDown } from "lucide-react";

export function CommodityTicker() {
  const { data: apiPrices } = useGetCommodityPrices();
  const socketPrices = useCommodityPrices();
  const prices = socketPrices.length > 0 ? socketPrices : apiPrices;

  if (!prices || prices.length === 0) return null;

  return (
    <div className="w-full overflow-hidden flex items-center relative"
      style={{
        background: "rgba(8, 18, 35, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        height: "36px"
      }}>
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(8,18,35,1), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(8,18,35,1), transparent)" }} />

      <div className="flex whitespace-nowrap" style={{ animation: "ticker 40s linear infinite" }}>
        {[...prices, ...prices].map((p, i) => (
          <div key={i} className="inline-flex items-center gap-2 mx-5 shrink-0">
            <span className="text-[11px] font-mono font-medium text-[#475569]">{p.symbol}</span>
            <span className="text-[11px] font-mono font-semibold text-[#94A3B8]">${p.price.toFixed(2)}</span>
            <div className={`flex items-center gap-0.5 text-[10px] font-mono font-medium ${p.change24h >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {p.change24h >= 0
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              {Math.abs(p.change24h)}%
            </div>
            <span className="text-[#1E3A5F] mx-1">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
