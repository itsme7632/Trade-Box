import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Star, Power, PowerOff, Plus, TrendingUp, Users } from "lucide-react";
import {
  useAdminGetPlans, useAdminTogglePlanFeatured, useAdminActivatePlan, useAdminDeactivatePlan,
} from "@workspace/api-client-react/src/extra-hooks";
import { useAdminCreateShipment } from "@workspace/api-client-react";

const riskColors: Record<string, string> = {
  A: "text-[#22C55E] bg-[#22C55E]/10",
  B: "text-[#0066FF] bg-[#0066FF]/10",
  C: "text-[#F59E0B] bg-[#F59E0B]/10",
  D: "text-[#EF4444] bg-[#EF4444]/10",
};

const statusColors: Record<string, string> = {
  open: "text-[#22C55E]",
  funded: "text-[#0066FF]",
  in_transit: "text-[#F59E0B]",
  delivered: "text-[#6A82A0]",
};

const shipmentSchema = z.object({
  title: z.string().min(1),
  cargoType: z.string(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  profitPercent: z.coerce.number().min(0.1).max(100),
  riskGrade: z.string(),
  fundingGoal: z.coerce.number().positive(),
  minInvestment: z.coerce.number().positive(),
  departureDate: z.string(),
  arrivalDate: z.string(),
  freightForwarder: z.string().min(1),
  vesselName: z.string().min(1),
  description: z.string().optional(),
});

export function AdminPlans() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: plans, refetch } = useAdminGetPlans();
  const toggleFeatured = useAdminTogglePlanFeatured();
  const activate = useAdminActivatePlan();
  const deactivate = useAdminDeactivatePlan();
  const create = useAdminCreateShipment();

  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      title: "", cargoType: "electronics", origin: "", destination: "",
      profitPercent: 10, riskGrade: "B", fundingGoal: 50000, minInvestment: 100,
      departureDate: format(new Date(), "yyyy-MM-dd"),
      arrivalDate: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
      freightForwarder: "", vesselName: "", description: "",
    },
  });

  const onCreateSubmit = (data: any) => {
    create.mutate({ data }, {
      onSuccess: () => { toast({ title: "Plan created" }); setCreateOpen(false); form.reset(); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" }),
    });
  };

  const filtered = plans?.filter(p => statusFilter === "all" || p.status === statusFilter) ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white border-[#EEF2F8] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs font-mono text-[#6A82A0] uppercase">{filtered.length} plans</span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white"><Plus className="h-4 w-4 mr-2" />New Plan</Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Investment Plan</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => <FormItem className="col-span-2"><FormLabel>Title</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="cargoType" render={({ field }) => (
                  <FormItem><FormLabel>Cargo Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["electronics", "cocoa", "lithium", "coffee", "textiles", "pharmaceuticals", "cotton", "steel"].map(c =>
                          <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="riskGrade" render={({ field }) => (
                  <FormItem><FormLabel>Risk Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["A", "B", "C", "D"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="origin" render={({ field }) => <FormItem><FormLabel>Origin</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="destination" render={({ field }) => <FormItem><FormLabel>Destination</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="profitPercent" render={({ field }) => <FormItem><FormLabel>Profit %</FormLabel><FormControl><Input type="number" step="0.1" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="fundingGoal" render={({ field }) => <FormItem><FormLabel>Funding Goal (USDT)</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="minInvestment" render={({ field }) => <FormItem><FormLabel>Min Investment (USDT)</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="departureDate" render={({ field }) => <FormItem><FormLabel>Departure Date</FormLabel><FormControl><Input type="date" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="arrivalDate" render={({ field }) => <FormItem><FormLabel>Arrival Date</FormLabel><FormControl><Input type="date" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="freightForwarder" render={({ field }) => <FormItem><FormLabel>Freight Forwarder</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="vesselName" render={({ field }) => <FormItem><FormLabel>Vessel Name</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="description" render={({ field }) => <FormItem className="col-span-2"><FormLabel>Description</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <Button type="submit" className="col-span-2 bg-[#0066FF] text-white mt-2" disabled={create.isPending}>Create Plan</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#0F1923] text-sm">{p.title}</span>
                  {p.isFeatured && <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded font-mono">FEATURED</span>}
                  <span className={`text-xs font-mono font-bold uppercase ${statusColors[p.status] ?? "text-[#6A82A0]"}`}>{p.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${riskColors[p.riskGrade] ?? ""}`}>Risk {p.riskGrade}</span>
                </div>
                <p className="text-xs text-[#6A82A0] mt-1 font-mono">{p.origin} → {p.destination} · {p.vesselName}</p>
                <div className="flex gap-4 mt-2 flex-wrap">
                  <Stat icon={<TrendingUp className="h-3 w-3" />} label="Profit" value={`${p.profitPercent}%`} />
                  <Stat icon={<Users className="h-3 w-3" />} label="Investors" value={`${p.investorCount}`} />
                  <Stat label="Raised" value={`${p.fundingRaised.toLocaleString()} / ${p.fundingGoal.toLocaleString()} USDT`} />
                  <Stat label="Transit" value={`${p.transitDays}d`} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                <Button
                  size="sm" variant="outline"
                  className={`gap-1 text-xs ${p.isFeatured ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" : "bg-[#EEF2F8] text-[#6A82A0]"}`}
                  onClick={() => toggleFeatured.mutate({ id: p.id }, { onSuccess: () => { toast({ title: p.isFeatured ? "Unfeatured" : "Featured" }); refetch(); } })}
                >
                  <Star className="h-3 w-3" />{p.isFeatured ? "Unfeature" : "Feature"}
                </Button>
                {p.status !== "delivered" && p.status !== "in_transit" && (
                  <>
                    {p.status !== "open" ? (
                      <Button size="sm" variant="outline" className="gap-1 text-xs bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
                        onClick={() => activate.mutate({ id: p.id }, { onSuccess: () => { toast({ title: "Activated" }); refetch(); } })}>
                        <Power className="h-3 w-3" />Activate
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1 text-xs bg-[#6A82A0]/10 text-[#6A82A0] border-[#6A82A0]/20"
                        onClick={() => deactivate.mutate({ id: p.id }, { onSuccess: () => { toast({ title: "Deactivated" }); refetch(); } })}>
                        <PowerOff className="h-3 w-3" />Deactivate
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm">No plans found</div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-[#6A82A0]">
      {icon && <span className="text-[#6A82A0]">{icon}</span>}
      <span className="font-mono">{label}:</span>
      <span className="font-bold text-[#0F1923] font-mono">{value}</span>
    </div>
  );
}
