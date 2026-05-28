import { useGetCommodityPrices } from "@workspace/api-client-react";
import { useCommodityPrices } from "@/hooks/use-socket";
import { TrendingUp, TrendingDown } from "lucide-react";

export function CommodityTicker() {
  const { data: apiPrices } = useGetCommodityPrices();
  const socketPrices = useCommodityPrices();
  const prices = socketPrices.length > 0 ? socketPrices : apiPrices;

  if (!prices || prices.length === 0) return null;

  return (
    <div style={{
      width: "100%",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      position: "relative",
      background: "#ffffff",
      borderBottom: "1px solid #e8edf2",
      height: "36px",
    }}>
      {/* Fade edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "32px",
        background: "linear-gradient(to right, #ffffff, transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "32px",
        background: "linear-gradient(to left, #ffffff, transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />

      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker 40s linear infinite" }}>
        {[...prices, ...prices].map((p, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 16px", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#475569" }}>
              {p.symbol}
            </span>
            <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#0f172a" }}>
              ${p.price.toFixed(2)}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "2px",
              fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              color: p.change24h >= 0 ? "#059669" : "#dc2626",
            }}>
              {p.change24h >= 0
                ? <TrendingUp size={10} />
                : <TrendingDown size={10} />}
              {Math.abs(p.change24h)}%
            </span>
            <span style={{ color: "#e2e8f0", marginLeft: "4px" }}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
