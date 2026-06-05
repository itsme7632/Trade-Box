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
import { Star, Power, PowerOff, Plus, TrendingUp, Users, Pencil, Copy, Archive, ArchiveRestore } from "lucide-react";
import {
  useAdminGetPlans, useAdminTogglePlanFeatured, useAdminActivatePlan, useAdminDeactivatePlan,
  useAdminEditPlan, useAdminDuplicatePlan, useAdminArchivePlan,
  type AdminPlan,
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

const editSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  vesselName: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  riskGrade: z.string(),
  profitPercent: z.coerce.number().min(0.1).max(100),
  fundingGoal: z.coerce.number().positive(),
  minInvestment: z.coerce.number().positive(),
  departureDate: z.string(),
  arrivalDate: z.string(),
  cargoType: z.string(),
  freightForwarder: z.string().min(1),
  isFeatured: z.boolean(),
});

export function AdminPlans() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null);

  const { data: plans, refetch } = useAdminGetPlans();
  const toggleFeatured = useAdminTogglePlanFeatured();
  const activate = useAdminActivatePlan();
  const deactivate = useAdminDeactivatePlan();
  const create = useAdminCreateShipment();
  const editMut = useAdminEditPlan();
  const duplicateMut = useAdminDuplicatePlan();
  const archiveMut = useAdminArchivePlan();

  const createForm = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      title: "", cargoType: "electronics", origin: "", destination: "",
      profitPercent: 10, riskGrade: "B", fundingGoal: 50000, minInvestment: 100,
      departureDate: format(new Date(), "yyyy-MM-dd"),
      arrivalDate: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
      freightForwarder: "", vesselName: "", description: "",
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (p: AdminPlan) => {
    setEditPlan(p);
    editForm.reset({
      title: p.title,
      description: p.description ?? "",
      vesselName: p.vesselName,
      origin: p.origin,
      destination: p.destination,
      riskGrade: p.riskGrade,
      profitPercent: p.profitPercent,
      fundingGoal: p.fundingGoal,
      minInvestment: p.minInvestment,
      departureDate: p.departureDate ? p.departureDate.slice(0, 10) : format(new Date(), "yyyy-MM-dd"),
      arrivalDate: p.arrivalDate ? p.arrivalDate.slice(0, 10) : format(new Date(), "yyyy-MM-dd"),
      cargoType: p.cargoType,
      freightForwarder: p.freightForwarder,
      isFeatured: p.isFeatured,
    });
  };

  const onCreateSubmit = (data: any) => {
    create.mutate({ data }, {
      onSuccess: () => { toast({ title: "Plan created" }); setCreateOpen(false); createForm.reset(); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" }),
    });
  };

  const onEditSubmit = (data: z.infer<typeof editSchema>) => {
    if (!editPlan) return;
    editMut.mutate({ id: editPlan.id, ...data }, {
      onSuccess: () => { toast({ title: "Plan updated" }); setEditPlan(null); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" }),
    });
  };

  const handleDuplicate = (id: number) => {
    duplicateMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Plan duplicated" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
    });
  };

  const handleArchive = (p: AdminPlan) => {
    archiveMut.mutate({ id: p.id }, {
      onSuccess: () => { toast({ title: p.isArchived ? "Plan unarchived" : "Plan archived" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
    });
  };

  const filtered = (plans ?? []).filter(p => {
    if (!showArchived && p.isArchived) return false;
    if (showArchived && !p.isArchived) return false;
    return statusFilter === "all" || p.status === statusFilter;
  });

  const archivedCount = (plans ?? []).filter(p => p.isArchived).length;

  const cargoTypes = ["electronics", "cocoa", "lithium", "coffee", "textiles", "pharmaceuticals", "cotton", "steel"];
  const riskGrades = ["A", "B", "C", "D"];

  const PlanFormFields = ({ formInstance }: { formInstance: any }) => (
    <>
      <FormField control={formInstance.control} name="title" render={({ field }) => <FormItem className="col-span-full"><FormLabel>Title</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="cargoType" render={({ field }) => (
        <FormItem><FormLabel>Cargo Type</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>{cargoTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </FormItem>
      )} />
      <FormField control={formInstance.control} name="riskGrade" render={({ field }) => (
        <FormItem><FormLabel>Risk Grade</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>{riskGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </FormItem>
      )} />
      <FormField control={formInstance.control} name="origin" render={({ field }) => <FormItem><FormLabel>Origin</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="destination" render={({ field }) => <FormItem><FormLabel>Destination</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="profitPercent" render={({ field }) => <FormItem><FormLabel>Profit %</FormLabel><FormControl><Input type="number" step="0.1" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="fundingGoal" render={({ field }) => <FormItem><FormLabel>Funding Goal (USDT)</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="minInvestment" render={({ field }) => <FormItem><FormLabel>Min Investment (USDT)</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="departureDate" render={({ field }) => <FormItem><FormLabel>Departure Date</FormLabel><FormControl><Input type="date" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="arrivalDate" render={({ field }) => <FormItem><FormLabel>Arrival Date</FormLabel><FormControl><Input type="date" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="freightForwarder" render={({ field }) => <FormItem><FormLabel>Freight Forwarder</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="vesselName" render={({ field }) => <FormItem><FormLabel>Vessel Name</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
      <FormField control={formInstance.control} name="description" render={({ field }) => <FormItem className="col-span-full"><FormLabel>Description</FormLabel><FormControl><textarea {...field} rows={3} className="w-full p-2 text-sm border border-[#EEF2F8] rounded-lg bg-[#F8FAFD] resize-none focus:outline-none focus:border-[#0066FF]" /></FormControl></FormItem>} />
    </>
  );

  return (
    <div className="mt-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
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
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${showArchived ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" : "bg-white text-[#6A82A0] border-[#EEF2F8]"}`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? "Hide Archived" : `Archived (${archivedCount})`}
          </button>
          <span className="text-xs font-mono text-[#6A82A0] uppercase">{filtered.length} plans</span>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white"><Plus className="h-4 w-4 mr-2" />New Plan</Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Investment Plan</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanFormFields formInstance={createForm} />
                <Button type="submit" className="col-span-full bg-[#0066FF] text-white mt-2" disabled={create.isPending}>Create Plan</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      {editPlan && (
        <Dialog open onOpenChange={() => setEditPlan(null)}>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Plan: {editPlan.title}</DialogTitle></DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanFormFields formInstance={editForm} />
                <FormField control={editForm.control} name="isFeatured" render={({ field }) => (
                  <FormItem className="col-span-full flex items-center gap-3">
                    <button type="button" onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.value ? "bg-[#F59E0B]" : "bg-[#CBD5E1]"}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <FormLabel className="cursor-pointer">Featured Plan</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter className="col-span-full">
                  <Button type="button" variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
                  <Button type="submit" className="bg-[#0066FF] text-white" disabled={editMut.isPending}>Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm ${p.isArchived ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#0F1923] text-sm">{p.title}</span>
                  {p.isFeatured && <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded font-mono">FEATURED</span>}
                  {p.isArchived && <span className="text-xs bg-[#6A82A0]/10 text-[#6A82A0] px-2 py-0.5 rounded font-mono">ARCHIVED</span>}
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
              <div className="flex flex-wrap gap-2 shrink-0">
                {/* Edit */}
                <Button size="sm" variant="outline" className="gap-1 text-xs bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20 hover:bg-[#0066FF] hover:text-white" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3" />Edit
                </Button>
                {/* Duplicate */}
                <Button size="sm" variant="outline" className="gap-1 text-xs bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20 hover:bg-[#7C3AED] hover:text-white"
                  onClick={() => handleDuplicate(p.id)} disabled={duplicateMut.isPending}>
                  <Copy className="h-3 w-3" />Duplicate
                </Button>
                {/* Feature Toggle */}
                <Button size="sm" variant="outline"
                  className={`gap-1 text-xs ${p.isFeatured ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" : "bg-[#EEF2F8] text-[#6A82A0]"}`}
                  onClick={() => toggleFeatured.mutate({ id: p.id }, { onSuccess: () => { toast({ title: p.isFeatured ? "Unfeatured" : "Featured" }); refetch(); } })}>
                  <Star className="h-3 w-3" />{p.isFeatured ? "Unfeature" : "Feature"}
                </Button>
                {/* Activate / Deactivate */}
                {!p.isArchived && p.status !== "delivered" && p.status !== "in_transit" && (
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
                {/* Archive */}
                <Button size="sm" variant="outline"
                  className={`gap-1 text-xs ${p.isArchived ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"}`}
                  onClick={() => handleArchive(p)} disabled={archiveMut.isPending}>
                  {p.isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                  {p.isArchived ? "Restore" : "Archive"}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm">
            {showArchived ? "No archived plans" : "No plans found"}
          </div>
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
