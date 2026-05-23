import { useGetCommodityPrices } from "@workspace/api-client-react";

export function CommodityTicker() {
  const { data: prices } = useGetCommodityPrices({
    query: { refetchInterval: 5000 }
  });

  if (!prices || prices.length === 0) return null;

  return (
    <div className="w-full bg-[#1E293B] border-b border-[#334155] overflow-hidden flex items-center py-2 relative">
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
        {/* Render twice for seamless loop */}
        {[...prices, ...prices].map((p, i) => (
          <div key={i} className="inline-flex items-center space-x-2 mx-6 text-sm font-mono shrink-0">
            <span className="text-gray-400">{p.symbol}</span>
            <span className="text-white">${p.price.toFixed(2)}</span>
            <span className={p.change24h >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}>
              {p.change24h >= 0 ? "+" : ""}{p.change24h}%
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
