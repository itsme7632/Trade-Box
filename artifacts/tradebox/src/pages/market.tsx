import { useGetMarketSummary, useGetClosingSoonShipments, useGetDeliveryFeed } from "@workspace/api-client-react";
import { CommodityTicker } from "@/components/commodity-ticker";
import { ShipmentCard } from "@/components/shipment-card";
import { Link } from "wouter";
import { ArrowRight, Package, TrendingUp, Ship, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Market() {
  const { data: summary, isLoading: isSummaryLoading } = useGetMarketSummary();
  const { data: closingSoon, isLoading: isClosingLoading } = useGetClosingSoonShipments();
  const { data: deliveryFeed, isLoading: isFeedLoading } = useGetDeliveryFeed();

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923]">
      <CommodityTicker />

      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Portfolio Overview */}
        <section>
          <h2 className="text-xl font-heading font-bold mb-4 tracking-tight">Portfolio Summary</h2>
          {isSummaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-white rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#EEF2F8] shadow-sm">
                <p className="text-[#6A82A0] font-mono text-xs uppercase mb-2">Total Value</p>
                <p className="text-2xl font-bold font-mono">{summary?.portfolioValue?.toLocaleString() || 0} USDT</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#EEF2F8] shadow-sm">
                <p className="text-[#6A82A0] font-mono text-xs uppercase mb-2">Active Cargo</p>
                <p className="text-2xl font-bold font-mono">{summary?.activeInvestments || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#EEF2F8] border-l-4 border-l-[#22C55E] shadow-sm">
                <p className="text-[#6A82A0] font-mono text-xs uppercase mb-2">Total Profit</p>
                <p className="text-2xl font-bold font-mono text-[#22C55E]">+{summary?.totalProfit?.toLocaleString() || 0} USDT</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#EEF2F8] shadow-sm">
                <p className="text-[#6A82A0] font-mono text-xs uppercase mb-2">Total Shipped</p>
                <p className="text-2xl font-bold font-mono">{summary?.totalShipped || 0}</p>
              </div>
            </div>
          )}
        </section>

        {/* Featured Shipment */}
        {summary?.featuredShipment && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-heading font-bold tracking-tight">Featured Manifest</h2>
              <Link href={`/market/shipments/${summary.featuredShipment.id}`} className="text-sm text-[#0066FF] hover:text-[#0052CC] font-mono flex items-center gap-1 transition-colors">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative bg-white rounded-2xl border border-[#0066FF]/30 overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0066FF]/5 to-transparent pointer-events-none" />
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                <div className="flex-1 space-y-4">
                  <div className="inline-block bg-[#0066FF] text-white text-xs font-bold font-mono px-3 py-1 rounded uppercase tracking-wider">
                    Prime Opportunity
                  </div>
                  <h3 className="text-3xl font-heading font-bold text-[#0F1923]">{summary.featuredShipment.title}</h3>
                  <div className="flex items-center gap-4 text-[#3A4E66] font-mono text-sm">
                    <span className="flex items-center gap-2"><Package className="h-4 w-4" /> {summary.featuredShipment.cargoType}</span>
                    <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> +{summary.featuredShipment.profitPercent}% Return</span>
                  </div>
                </div>
                <div className="w-full md:w-auto flex flex-col gap-4 min-w-[250px]">
                  <div className="bg-[#F8FAFD] p-4 rounded-xl border border-[#EEF2F8]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#6A82A0] font-mono text-xs uppercase">Route</span>
                      <span className="text-[#0F1923] font-mono text-sm">{summary.featuredShipment.transitDays} Days</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm truncate max-w-[100px]" title={summary.featuredShipment.origin}>{summary.featuredShipment.origin}</span>
                      <div className="flex-1 border-t border-dashed border-[#6A82A0] relative">
                        <ArrowRight className="h-3 w-3 absolute -right-1 -top-1.5 text-[#6A82A0]" />
                      </div>
                      <span className="font-bold text-sm truncate max-w-[100px]" title={summary.featuredShipment.destination}>{summary.featuredShipment.destination}</span>
                    </div>
                  </div>
                  <Link href={`/market/shipments/${summary.featuredShipment.id}`} className="bg-[#0066FF] hover:bg-[#0052CC] text-white text-center py-3 rounded-lg font-heading font-bold transition-colors">
                    Fund Shipment
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Closing Soon */}
          <section className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-heading font-bold tracking-tight">Closing Soon</h2>
              <Link href="/market/shipments" className="text-sm text-[#0066FF] hover:text-[#0052CC] font-mono flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            {isClosingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 bg-white rounded-xl" />)}
              </div>
            ) : closingSoon?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {closingSoon.slice(0, 4).map(shipment => (
                  <ShipmentCard key={shipment.id} shipment={shipment} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#EEF2F8] rounded-xl p-8 text-center shadow-sm">
                <p className="text-[#6A82A0] font-mono">No shipments closing soon.</p>
              </div>
            )}
          </section>

          {/* Delivery Feed */}
          <section>
            <h2 className="text-xl font-heading font-bold mb-4 tracking-tight">Live Deliveries</h2>
            <div className="bg-white border border-[#EEF2F8] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#EEF2F8] bg-[#F8FAFD]">
                <p className="text-xs font-mono text-[#6A82A0] uppercase tracking-wider">Recent Cargo Landed</p>
              </div>
              <div className="divide-y divide-[#EEF2F8] max-h-[500px] overflow-y-auto">
                {isFeedLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-[#DDE4EF]" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-[#DDE4EF]" />
                        <Skeleton className="h-3 w-1/2 bg-[#DDE4EF]" />
                      </div>
                    </div>
                  ))
                ) : deliveryFeed?.length ? (
                  deliveryFeed.map(event => (
                    <div key={event.id} className="p-4 hover:bg-[#F8FAFD] transition-colors flex items-start gap-4">
                      <div className="bg-[#22C55E]/10 text-[#22C55E] p-2 rounded-lg shrink-0 mt-1">
                        <Ship className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F1923] truncate" title={event.shipmentTitle}>{event.shipmentTitle}</p>
                        <p className="text-xs text-[#6A82A0] font-mono mt-1 truncate">{event.traderId}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#22C55E] font-mono flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {event.profit.toLocaleString()} USDT
                        </p>
                        <p className="text-xs text-[#6A82A0] font-mono mt-1">Profit</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#6A82A0] font-mono text-sm">
                    No recent deliveries
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
