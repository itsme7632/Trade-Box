import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetShipment, useFundShipment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Package, TrendingUp, Calendar, ShieldCheck, Ship, Weight, Globe, Building, Hash, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const riskCfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Low Risk" },
  B: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Moderate" },
  C: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Medium" },
  D: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "High Risk" },
};

function S({ h = 60 }: { h?: number }) { return <div className="shimmer" style={{ height: h, borderRadius: 12 }} />; }

export default function ShipmentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: shipment, isLoading } = useGetShipment(id, { query: { enabled: !!id } as any });
  const fundMutation = useFundShipment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fundSchema = z.object({ amount: z.coerce.number().min(shipment?.minInvestment || 1) });
  const form = useForm<z.infer<typeof fundSchema>>({
    resolver: zodResolver(fundSchema),
    defaultValues: { amount: shipment?.minInvestment || 100 },
  });

  if (isLoading || !shipment) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: "16px", maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ height: "24px", width: "100px", marginBottom: "16px" }}><S h={24} /></div>
        <S h={120} />
        <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
          <S h={160} /><S h={200} /><S h={260} />
        </div>
      </div>
    );
  }

  const risk = riskCfg[shipment.riskGrade] || riskCfg.C;
  const fundPct = Math.min(100, (shipment.fundingRaised / shipment.fundingGoal) * 100);
  const isClosed = shipment.status !== "open";
  const watchAmount = form.watch("amount") || 0;
  const estProfit = watchAmount * (shipment.profitPercent / 100);
  const estReturn = watchAmount + estProfit;

  const onFund = (data: z.infer<typeof fundSchema>) => {
    fundMutation.mutate({ id, data: { amount: data.amount } }, {
      onSuccess: () => {
        toast({ title: "Funded!", description: `Invested ${data.amount.toLocaleString()} USDT` });
        queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
        form.reset();
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Back nav */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "12px 16px" }}>
        <Link href="/market/shipments">
          <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563eb", padding: 0 }}>
            <ArrowLeft size={14} /> Back to Market
          </button>
        </Link>
      </div>

      <div style={{ padding: "16px", maxWidth: "760px", margin: "0 auto" }}>

        {/* Hero card */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "14px" }}>
          <div style={{ height: "4px", background: `linear-gradient(90deg, ${risk.color}, ${risk.color}66)` }} />
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: risk.color, background: risk.bg, border: `1px solid ${risk.border}`, fontFamily: "'JetBrains Mono', monospace" }}>
                Risk {shipment.riskGrade} · {risk.label}
              </span>
              <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>
                {shipment.cargoType}
              </span>
              <span style={{
                padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                color: shipment.status === "open" ? "#2563eb" : "#059669",
                background: shipment.status === "open" ? "#eff6ff" : "#ecfdf5",
              }}>
                {shipment.status.replace("_", " ")}
              </span>
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              {shipment.title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                <Ship size={13} color="#94a3b8" /> {shipment.vesselName}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#059669", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                <TrendingUp size={13} /> +{shipment.profitPercent}% target return
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }} className="detail-grid">

          {/* Route */}
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "16px" }}>
              <Globe size={15} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Voyage Route</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "center", minWidth: "80px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", margin: "0 auto 6px", boxShadow: "0 0 8px rgba(37,99,235,0.4)" }} />
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{shipment.origin}</p>
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(parseISO(shipment.departureDate), "MMM dd")}</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{shipment.transitDays}d transit</span>
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                  <Ship size={14} color="#2563eb" />
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                </div>
                <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>ETA {format(parseISO(shipment.arrivalDate), "MMM dd, yyyy")}</span>
              </div>
              <div style={{ textAlign: "center", minWidth: "80px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #059669", margin: "0 auto 6px", boxShadow: "0 0 6px rgba(5,150,105,0.3)" }} />
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{shipment.destination}</p>
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(parseISO(shipment.arrivalDate), "MMM dd")}</p>
              </div>
            </div>
          </div>

          {/* Manifest */}
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <Package size={14} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Cargo Manifest</h3>
            </div>
            <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { icon: Building, label: "Freight Forwarder", value: shipment.freightForwarder },
                { icon: Hash, label: "HS Code", value: shipment.hsCode || "Pending" },
                { icon: Weight, label: "Weight", value: shipment.weightTons ? `${Number(shipment.weightTons).toLocaleString()} MT` : "N/A" },
                { icon: Package, label: "Volume", value: shipment.volumeCbm ? `${Number(shipment.volumeCbm).toLocaleString()} CBM` : "N/A" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                    <item.icon size={12} color="#94a3b8" />
                    <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{item.value}</p>
                </div>
              ))}
              {shipment.description && (
                <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                  <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "5px" }}>Description</div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{shipment.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fund card */}
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #2563eb, #0891b2)" }} />
            <div style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Fund Shipment</h3>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "#2563eb", fontFamily: "'Space Grotesk', sans-serif" }}>+{shipment.profitPercent}%</span>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                  <span style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                    {shipment.fundingRaised.toLocaleString()} / {shipment.fundingGoal.toLocaleString()} USDT
                  </span>
                  <span style={{ fontWeight: 700, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(fundPct)}%</span>
                </div>
                <div style={{ height: "8px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                  <div style={{ width: `${fundPct}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #2563eb, #0891b2)", transition: "width 0.5s ease" }} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                  {(shipment.fundingGoal - shipment.fundingRaised).toLocaleString()} USDT remaining
                </p>
              </div>

              {isClosed ? (
                <div style={{ padding: "16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2", textAlign: "center" }}>
                  <Info size={18} color="#94a3b8" style={{ marginBottom: "6px" }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Funding Closed</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onFund)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Investment Amount</FormLabel>
                        <FormControl>
                          <div style={{ position: "relative" }}>
                            <Input type="number" className="tb-input" style={{ height: "48px", fontSize: "18px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", paddingRight: "60px" }} {...field} />
                            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", fontWeight: 700, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>USDT</span>
                          </div>
                        </FormControl>
                        <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Min: {shipment.minInvestment.toLocaleString()} USDT</p>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />

                    {watchAmount > 0 && (
                      <div style={{ padding: "12px", borderRadius: "12px", background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          { label: "Principal", value: `${watchAmount.toLocaleString()} USDT` },
                          { label: `Profit (+${shipment.profitPercent}%)`, value: `+${estProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`, green: true },
                        ].map((r, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{r.label}</span>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: (r as any).green ? "#059669" : "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</span>
                          </div>
                        ))}
                        <div style={{ height: "1px", background: "#bbf7d0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>Total Return</span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>{estReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={fundMutation.isPending} style={{
                      height: "48px", borderRadius: "14px", background: "#2563eb", color: "white",
                      border: "none", fontSize: "15px", fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                      opacity: fundMutation.isPending ? 0.7 : 1,
                    }}>
                      {fundMutation.isPending ? "Processing..." : "Commit Funds →"}
                    </button>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <ShieldCheck size={13} color="#94a3b8" style={{ flexShrink: 0, marginTop: "1px" }} />
                      <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                        All shipments are insured for transit risk. ETA dates are maritime estimates.
                      </p>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .detail-grid { grid-template-columns: 1fr 1fr !important; }
          .detail-grid > :first-child { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}
