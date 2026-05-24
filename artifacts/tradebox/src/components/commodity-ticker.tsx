import { useGetCommodityPrices } from "@workspace/api-client-react";
import { useCommodityPrices } from "@/hooks/use-socket";

export function CommodityTicker() {
  const { data: apiPrices } = useGetCommodityPrices();
  const socketPrices = useCommodityPrices();

  const prices = socketPrices.length > 0 ? socketPrices : apiPrices;

  if (!prices || prices.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-[#EEF2F8] overflow-hidden flex items-center py-2 relative">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "ticker 30s linear infinite" }}
      >
        {[...prices, ...prices].map((p, i) => (
          <div
            key={i}
            className="inline-flex items-center space-x-2 mx-6 text-sm font-mono shrink-0"
          >
            <span className="text-[#6A82A0]">{p.symbol}</span>
            <span className="text-[#0F1923] font-semibold">${p.price.toFixed(2)}</span>
            <span className={p.change24h >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}>
              {p.change24h >= 0 ? "▲" : "▼"} {Math.abs(p.change24h)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
