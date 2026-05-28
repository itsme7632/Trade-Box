import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetShipment, useFundShipment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Package, TrendingUp, Calendar, ShieldCheck, Ship, Anchor, Weight, Globe, Building, Hash, Zap, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const riskConfig: Record<string, { color: string; bg: string; label: string }> = {
  A: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Low Risk" },
  B: { color: "#3B82F6", bg: "rgba(59,130,246,0.1)", label: "Moderate" },
  C: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "Medium" },
  D: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", label: "High Risk" },
};

export default function ShipmentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shipment, isLoading } = useGetShipment(id, { query: { enabled: !!id } as any });
  const fundMutation = useFundShipment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fundSchema = z.object({
    amount: z.coerce.number().min(shipment?.minInvestment || 1),
  });

  const form = useForm<z.infer<typeof fundSchema>>({
    resolver: zodResolver(fundSchema),
    defaultValues: { amount: shipment?.minInvestment || 100 },
  });

  if (isLoading || !shipment) {
    return (
      <div className="min-h-screen bg-[#050D1B] p-4 md:p-8 space-y-4">
        <div className="h-8 w-36 shimmer rounded-lg" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 shimmer rounded-2xl" />
            <div className="h-56 shimmer rounded-2xl" />
          </div>
          <div className="h-80 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  const risk = riskConfig[shipment.riskGrade] || riskConfig.C;
  const fundPct = Math.min(100, (shipment.fundingRaised / shipment.fundingGoal) * 100);
  const isFunded = shipment.status !== "open";
  const watchAmount = form.watch("amount") || 0;
  const estReturn = watchAmount * (1 + shipment.profitPercent / 100);

  const onFund = (data: z.infer<typeof fundSchema>) => {
    fundMutation.mutate({ id, data: { amount: data.amount } }, {
      onSuccess: () => {
        toast({ title: "Funded!", description: `Invested ${data.amount.toLocaleString()} USDT in ${shipment.title}` });
        queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
        form.reset();
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-[#050D1B]">
      {/* Back nav */}
      <div className="px-4 pt-5 pb-3 md:px-8">
        <Link href="/market/shipments">
          <button className="flex items-center gap-2 text-sm font-mono text-[#475569] hover:text-[#94A3B8] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Market
          </button>
        </Link>
      </div>

      {/* Hero */}
      <div className="px-4 md:px-8 mb-6">
        <div className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(10,22,40,0.98) 50%)",
            border: "1px solid rgba(59,130,246,0.2)"
          }}>
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" }} />

          <div className="p-6 md:p-8 relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider"
                style={{ background: "rgba(255,255,255,0.05)", color: "#64748B", border: "1px solid rgba(255,255,255,0.08)" }}>
                {shipment.cargoType}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider"
                style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.color}30` }}>
                Risk {shipment.riskGrade} · {risk.label}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider"
                style={{
                  background: shipment.status === "open" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
                  color: shipment.status === "open" ? "#3B82F6" : "#10B981",
                  border: `1px solid ${shipment.status === "open" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)"}`
                }}>
                {shipment.status.replace("_", " ")}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              {shipment.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-[#475569]">
              <span className="flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 text-[#3B82F6]" /> {shipment.vesselName}
              </span>
              <span className="flex items-center gap-1.5 text-[#10B981] font-bold">
                <TrendingUp className="h-3.5 w-3.5" /> +{shipment.profitPercent}% target return
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Route visualization */}
            <div className="rounded-2xl p-6"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-6">
                <Globe className="h-4 w-4 text-[#3B82F6]" />
                <span className="text-sm font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Voyage Route</span>
              </div>

              <div className="flex items-center gap-4 relative">
                {/* Origin */}
                <div className="flex flex-col items-center gap-2 min-w-[80px] md:min-w-[120px]">
                  <div className="w-3 h-3 rounded-full"
                    style={{ background: "#3B82F6", boxShadow: "0 0 12px rgba(59,130,246,0.6)" }} />
                  <div className="text-center">
                    <p className="font-bold text-sm text-[#E2E8F0] leading-tight">{shipment.origin}</p>
                    <p className="text-[10px] font-mono text-[#334155] mt-0.5">
                      {format(parseISO(shipment.departureDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Path */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{shipment.transitDays} days transit</div>
                  <div className="w-full relative flex items-center">
                    <div className="w-full h-px" style={{ background: "linear-gradient(90deg, #1E3A5F, rgba(59,130,246,0.3), #1E3A5F)" }} />
                    <div className="absolute left-1/3 w-7 h-7 rounded-full flex items-center justify-center -translate-y-1/2 top-1/2 -translate-x-1/2"
                      style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                      <Ship className="h-3.5 w-3.5 text-[#3B82F6]" />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#334155]">
                    <span className="text-[#3B82F6]">ETA</span> {format(parseISO(shipment.arrivalDate), "MMM dd, yyyy")}
                  </div>
                </div>

                {/* Destination */}
                <div className="flex flex-col items-center gap-2 min-w-[80px] md:min-w-[120px]">
                  <div className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: "#10B981", boxShadow: "0 0 10px rgba(16,185,129,0.4)" }} />
                  <div className="text-center">
                    <p className="font-bold text-sm text-[#E2E8F0] leading-tight">{shipment.destination}</p>
                    <p className="text-[10px] font-mono text-[#334155] mt-0.5">
                      {format(parseISO(shipment.arrivalDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo Manifest */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 p-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Package className="h-4 w-4 text-[#3B82F6]" />
                <span className="text-sm font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cargo Manifest</span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { icon: Building, label: "Freight Forwarder", value: shipment.freightForwarder },
                  { icon: Hash, label: "HS Commodity Code", value: shipment.hsCode || "Pending" },
                  { icon: Weight, label: "Total Weight", value: shipment.weightTons ? `${Number(shipment.weightTons).toLocaleString()} MT` : "N/A" },
                  { icon: Package, label: "Volume", value: shipment.volumeCbm ? `${Number(shipment.volumeCbm).toLocaleString()} CBM` : "N/A" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(5,13,27,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(59,130,246,0.1)" }}>
                      <item.icon className="h-4 w-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-0.5">{item.label}</div>
                      <div className="text-sm text-[#E2E8F0] font-medium">{item.value}</div>
                    </div>
                  </div>
                ))}

                {shipment.description && (
                  <div className="md:col-span-2 p-4 rounded-xl"
                    style={{ background: "rgba(5,13,27,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="text-[10px] font-mono text-[#334155] uppercase tracking-wider mb-2">Description</div>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">{shipment.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Funding */}
          <div className="space-y-4">
            {/* Funding card */}
            <div className="rounded-2xl overflow-hidden sticky top-20"
              style={{
                background: "rgba(10,22,40,0.95)",
                border: "1px solid rgba(59,130,246,0.2)",
                backdropFilter: "blur(20px)"
              }}>
              <div className="h-0.5" style={{ background: "linear-gradient(90deg, #2563EB, #06B6D4)" }} />
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Fund Shipment</span>
                  <span className="text-2xl font-bold text-[#3B82F6]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    +{shipment.profitPercent}%
                  </span>
                </div>

                {/* Funding progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#475569]">Raised</span>
                    <span className="text-[#E2E8F0] font-bold">
                      {shipment.fundingRaised.toLocaleString()} <span className="text-[#475569]">/ {shipment.fundingGoal.toLocaleString()} USDT</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${fundPct}%`,
                        background: "linear-gradient(90deg, #2563EB, #06B6D4)",
                        boxShadow: "0 0 8px rgba(37,99,235,0.6)"
                      }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#334155]">{Math.round(fundPct)}% funded</span>
                    <span className="text-[#3B82F6]">{(shipment.fundingGoal - shipment.fundingRaised).toLocaleString()} USDT remaining</span>
                  </div>
                </div>

                {isFunded ? (
                  <div className="rounded-xl p-4 flex flex-col items-center text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Info className="h-5 w-5 text-[#475569] mb-2" />
                    <p className="text-sm font-semibold text-[#94A3B8]">Funding Closed</p>
                    <p className="text-xs text-[#475569] font-mono mt-1">No longer accepting investments.</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onFund)} className="space-y-4">
                      <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Investment Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" className="tb-input h-12 text-lg font-bold font-mono pr-16" {...field} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#475569] font-bold">USDT</span>
                            </div>
                          </FormControl>
                          <p className="text-[10px] text-[#334155] font-mono">Min: {shipment.minInvestment.toLocaleString()} USDT</p>
                          <FormMessage className="text-[#EF4444] text-xs" />
                        </FormItem>
                      )} />

                      {/* Return calc */}
                      {watchAmount > 0 && (
                        <div className="rounded-xl p-3 space-y-1.5"
                          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#475569]">Principal</span>
                            <span className="text-[#E2E8F0]">{watchAmount.toLocaleString()} USDT</span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#475569]">Profit (+{shipment.profitPercent}%)</span>
                            <span className="text-[#10B981]">+{(watchAmount * shipment.profitPercent / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                          </div>
                          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex justify-between text-sm font-bold font-mono">
                            <span className="text-[#94A3B8]">Total Return</span>
                            <span className="text-[#10B981]">{estReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                          </div>
                        </div>
                      )}

                      <button type="submit" disabled={fundMutation.isPending}
                        className="w-full h-12 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                          boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}>
                        {fundMutation.isPending ? "Processing..." : "Commit Funds →"}
                      </button>
                    </form>
                  </Form>
                )}

                {/* Security note */}
                <div className="flex items-start gap-2 pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A5F] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#334155] font-mono leading-relaxed">
                    All shipments are insured for transit risk. ETA dates are maritime estimates.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Departure", value: format(parseISO(shipment.departureDate), "MMM dd"), icon: Calendar },
                { label: "Arrival", value: format(parseISO(shipment.arrivalDate), "MMM dd"), icon: Calendar },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1 text-[#334155]">
                    <s.icon className="h-3 w-3" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
