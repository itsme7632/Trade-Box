import { useState } from "react";
import { useListInvestments, type ListInvestmentsStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Ship, Clock, CheckCircle2, TrendingUp, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Cargo() {
  const [statusFilter, setStatusFilter] = useState<ListInvestmentsStatus>("all");
  const [search, setSearch] = useState("");

  const { data: investments, isLoading } = useListInvestments({ status: statusFilter });

  const filtered = investments?.filter(inv => 
    search ? inv.shipment?.title.toLowerCase().includes(search.toLowerCase()) || inv.shipment?.cargoType.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923] p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#EEF2F8] pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">My Cargo</h1>
            <p className="text-[#6A82A0] font-mono text-sm mt-1 uppercase">Active and completed investments</p>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as ListInvestmentsStatus)}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="bg-white border border-[#EEF2F8] p-1">
              <TabsTrigger value="all" className="font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">All Cargo</TabsTrigger>
              <TabsTrigger value="active" className="font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">In Transit</TabsTrigger>
              <TabsTrigger value="delivered" className="font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">Delivered</TabsTrigger>
            </TabsList>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A82A0]" />
              <Input 
                placeholder="Search cargo..." 
                className="pl-9 bg-white border-[#EEF2F8] focus:border-[#0066FF] text-[#0F1923] font-mono h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full bg-white rounded-xl" />)
            ) : filtered && filtered.length > 0 ? (
              filtered.map(inv => (
                <div key={inv.id} className="bg-white rounded-xl border border-[#EEF2F8] p-0 overflow-hidden hover:border-[#0066FF]/50 transition-colors shadow-sm">
                  <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                    
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1
                          ${inv.status === 'delivered' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 
                            inv.status === 'active' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 
                            'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                          {inv.status === 'delivered' ? <CheckCircle2 className="h-3 w-3" /> : 
                           inv.status === 'active' ? <Clock className="h-3 w-3" /> : null}
                          {inv.status}
                        </span>
                        <span className="text-[#6A82A0] font-mono text-xs uppercase">{inv.shipment?.cargoType}</span>
                      </div>
                      <Link href={`/market/shipments/${inv.shipmentId}`} className="text-xl font-heading font-bold text-[#0F1923] hover:text-[#0066FF] transition-colors line-clamp-1 block mb-2">
                        {inv.shipment?.title}
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-[#6A82A0] font-mono">
                        <span className="flex items-center gap-1"><Ship className="h-3.5 w-3.5" /> {inv.shipment?.vesselName}</span>
                        <span>{inv.shipment?.origin} → {inv.shipment?.destination}</span>
                      </div>
                    </div>

                    <div className="flex-1 w-full lg:w-auto grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#F8FAFD] p-4 rounded-lg border border-[#EEF2F8]">
                      <div>
                        <p className="text-[10px] text-[#6A82A0] font-mono uppercase tracking-wider mb-1">Committed</p>
                        <p className="font-bold font-mono text-[#0F1923]">{inv.amount.toLocaleString()} USDT</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#6A82A0] font-mono uppercase tracking-wider mb-1">Return</p>
                        <p className="font-bold font-mono text-[#0066FF]">+{inv.profitPercent}%</p>
                      </div>
                      <div className="col-span-2 md:col-span-2 border-t md:border-t-0 md:border-l border-[#EEF2F8] pt-3 md:pt-0 md:pl-4">
                        <p className="text-[10px] text-[#6A82A0] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> {inv.status === 'delivered' ? 'Realized Profit' : 'Expected Profit'}
                        </p>
                        <p className={`font-bold font-mono text-xl ${inv.status === 'delivered' ? 'text-[#22C55E]' : 'text-[#0F1923]'}`}>
                          {(inv.actualProfit || inv.expectedProfit || 0).toLocaleString()} USDT
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {inv.status === 'active' && inv.shipment && (
                    <div className="bg-[#0066FF]/5 px-6 py-3 border-t border-[#0066FF]/20 flex justify-between items-center">
                      <p className="text-xs text-[#0066FF] font-mono">Estimated Arrival: {format(parseISO(inv.shipment.arrivalDate), 'MMM dd, yyyy')}</p>
                      <Link href="/tracker" className="text-xs font-bold text-[#0F1923] hover:text-[#0066FF] font-mono uppercase underline-offset-4 hover:underline">
                        Track Vessel
                      </Link>
                    </div>
                  )}
                  {inv.status === 'delivered' && (
                    <div className="bg-[#22C55E]/5 px-6 py-3 border-t border-[#22C55E]/20 flex justify-between items-center">
                      <p className="text-xs text-[#22C55E] font-mono">Delivered on {inv.deliveredAt ? format(parseISO(inv.deliveredAt), 'MMM dd, yyyy') : 'Unknown'}</p>
                      <span className="text-xs font-bold text-[#0F1923] font-mono uppercase">Profit Credited to Wallet</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-[#EEF2F8] border-dashed shadow-sm">
                <Ship className="h-12 w-12 text-[#6A82A0] mb-4 opacity-50" />
                <h3 className="text-xl font-heading font-bold text-[#0F1923] mb-2">No Cargo Found</h3>
                <p className="text-[#6A82A0] font-mono text-center max-w-md">
                  You don't have any investments matching this status.
                </p>
                <Link href="/market/shipments">
                  <Button className="mt-6 bg-[#0066FF] hover:bg-[#0052CC] text-white font-heading">
                    Browse Market
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
