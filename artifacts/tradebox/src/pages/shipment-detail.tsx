import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetShipment, useFundShipment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Map, Anchor, Package, TrendingUp, Calendar, Info, Clock, AlertTriangle, ShieldCheck, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShipmentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: shipment, isLoading } = useGetShipment(id, { query: { enabled: !!id } });
  const fundMutation = useFundShipment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fundSchema = z.object({
    amount: z.coerce.number().min(shipment?.minInvestment || 1, `Minimum investment is $${shipment?.minInvestment}`),
  });

  const form = useForm<z.infer<typeof fundSchema>>({
    resolver: zodResolver(fundSchema),
    defaultValues: { amount: shipment?.minInvestment || 100 },
  });

  if (isLoading || !shipment) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48 bg-[#1E293B]" />
        <Skeleton className="h-96 w-full bg-[#1E293B] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="col-span-2 h-64 bg-[#1E293B] rounded-xl" />
          <Skeleton className="h-64 bg-[#1E293B] rounded-xl" />
        </div>
      </div>
    );
  }

  const isFunded = shipment.status !== 'open';
  const progressPercent = Math.min(100, (shipment.fundingRaised / shipment.fundingGoal) * 100);

  const onFund = (data: z.infer<typeof fundSchema>) => {
    fundMutation.mutate(
      { id, data: { amount: data.amount } },
      {
        onSuccess: () => {
          toast({ title: "Funding Successful", description: `You have invested $${data.amount.toLocaleString()} in ${shipment.title}` });
          queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
          form.reset();
        },
        onError: (err: any) => {
          toast({ title: "Funding Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1923] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        <Link href="/market/shipments" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-mono text-sm transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Market
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#1E293B] text-gray-300 px-3 py-1 rounded text-xs font-mono uppercase tracking-wider border border-[#334155]">
                {shipment.cargoType}
              </span>
              <span className={`px-3 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider border
                ${shipment.riskGrade === 'A' ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" : 
                  shipment.riskGrade === 'B' ? "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20" : 
                  shipment.riskGrade === 'C' ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" : 
                  "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"}`}>
                Risk {shipment.riskGrade}
              </span>
              <span className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider border
                ${shipment.status === 'open' ? "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20" : 
                  "bg-[#1E293B] text-gray-300 border-[#334155]"}`}>
                {shipment.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">{shipment.title}</h1>
            <p className="text-gray-400 mt-2 font-mono flex items-center gap-2">
              <Anchor className="h-4 w-4" /> Vessel: <span className="text-white">{shipment.vesselName}</span>
            </p>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-[#334155] text-right shrink-0">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-1">Target Return</p>
            <p className="text-3xl font-bold text-[#0066FF] font-mono">+{shipment.profitPercent}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Route Map Vis */}
            <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-6 relative overflow-hidden">
              <Map className="absolute -right-10 -bottom-10 h-64 w-64 text-[#334155] opacity-20 pointer-events-none" />
              <h3 className="text-lg font-heading font-bold mb-6 flex items-center gap-2">
                <Map className="h-5 w-5 text-[#0066FF]" /> Voyage Route
              </h3>
              
              <div className="flex items-center justify-between relative z-10 px-4">
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-[#0066FF] mb-2 shadow-[0_0_10px_#0066FF]" />
                  <p className="font-bold text-lg">{shipment.origin}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{format(parseISO(shipment.departureDate), 'MMM dd, yyyy')}</p>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                  <p className="text-sm font-mono text-gray-400 mb-2">{shipment.transitDays} Days Transit</p>
                  <div className="w-full h-[2px] bg-[#334155] relative">
                    <div className="absolute top-0 left-0 h-full bg-[#0066FF] w-1/3 animate-pulse" />
                    <Ship className="absolute -top-3 left-1/3 h-6 w-6 text-white bg-[#1E293B] p-1 rounded-full border border-[#334155]" />
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full border-2 border-[#22C55E] mb-2" />
                  <p className="font-bold text-lg">{shipment.destination}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{format(parseISO(shipment.arrivalDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Cargo Manifest */}
            <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden">
              <div className="p-4 bg-[#0F1923] border-b border-[#334155]">
                <h3 className="text-lg font-heading font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#0066FF]" /> Cargo Manifest
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 font-mono uppercase mb-1">Freight Forwarder</p>
                  <p className="font-medium text-white">{shipment.freightForwarder}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono uppercase mb-1">HS Code</p>
                  <p className="font-mono text-white bg-[#0F1923] px-2 py-1 rounded inline-block border border-[#334155]">
                    {shipment.hsCode || "PENDING"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono uppercase mb-1">Total Weight</p>
                  <p className="font-medium text-white">{shipment.weightTons ? `${shipment.weightTons.toLocaleString()} MT` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-mono uppercase mb-1">Volume</p>
                  <p className="font-medium text-white">{shipment.volumeCbm ? `${shipment.volumeCbm.toLocaleString()} CBM` : "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-400 font-mono uppercase mb-2">Description</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{shipment.description || "Standard cargo description pending manifest finalization."}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Column */}
          <div className="space-y-6">
            
            {/* Funding Form */}
            <div className="bg-[#1E293B] rounded-xl border border-[#0066FF]/30 p-6 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-[#0066FF]/5 to-transparent pointer-events-none rounded-xl" />
              
              <h3 className="text-xl font-heading font-bold mb-4 relative z-10">Fund Shipment</h3>
              
              <div className="mb-6 relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-sm font-mono text-gray-400 uppercase tracking-wider">Raised</p>
                  <p className="text-lg font-bold font-mono text-white">
                    ${shipment.fundingRaised.toLocaleString()}
                    <span className="text-sm text-gray-500 font-normal"> / ${shipment.fundingGoal.toLocaleString()}</span>
                  </p>
                </div>
                <Progress value={progressPercent} className="h-3 bg-[#0F1923]" indicatorClassName="bg-[#0066FF]" />
                <p className="text-right text-xs font-mono text-[#0066FF] mt-1 font-bold">{Math.round(progressPercent)}% Filled</p>
              </div>

              {isFunded ? (
                <div className="bg-[#0F1923] p-4 rounded-lg border border-[#334155] text-center relative z-10">
                  <Info className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-white">Funding Closed</p>
                  <p className="text-sm text-gray-400 mt-1">This shipment is no longer accepting funds.</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onFund)} className="space-y-4 relative z-10">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300 font-mono text-xs uppercase">Investment Amount (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                              <Input 
                                type="number" 
                                className="pl-8 bg-[#0F1923] border-[#334155] text-xl font-bold font-mono h-12 focus:border-[#0066FF]" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 font-mono text-right mt-1">Min: ${shipment.minInvestment.toLocaleString()}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-[#0F1923] p-3 rounded border border-[#334155] flex justify-between items-center my-4">
                      <span className="text-sm text-gray-400">Est. Return:</span>
                      <span className="text-lg font-bold text-[#22C55E] font-mono">
                        ${(form.watch("amount") * (1 + shipment.profitPercent / 100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] text-white font-heading text-lg tracking-wide"
                      disabled={fundMutation.isPending}
                    >
                      {fundMutation.isPending ? "Processing..." : "Commit Funds"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>

            {/* Risk Disclaimer */}
            <div className="bg-[#0F1923] rounded-xl border border-[#334155] p-5">
              <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-gray-400" /> Investment Security
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                All shipments are insured for transit risk. However, global trade carries inherent delays. 
                ETA dates are estimates based on standard maritime routing.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
