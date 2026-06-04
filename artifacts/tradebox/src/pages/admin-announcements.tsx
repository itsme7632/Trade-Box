import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Megaphone, Bell } from "lucide-react";
import {
  useAdminGetAnnouncements, useAdminCreateAnnouncement, useAdminUpdateAnnouncement,
  useAdminDeleteAnnouncement, type Announcement,
} from "@workspace/api-client-react/src/extra-hooks";

const announcementSchema = z.object({
  title: z.string().min(1, "Title required"),
  message: z.string().min(1, "Message required"),
  type: z.enum(["popup", "banner"]),
  targetAudience: z.enum(["all", "kyc_approved", "kyc_pending", "no_kyc"]),
  isActive: z.boolean(),
  scheduledAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof announcementSchema>;

const typeIcon: Record<string, React.ReactNode> = {
  popup: <Bell className="h-3 w-3" />,
  banner: <Megaphone className="h-3 w-3" />,
};

const audienceLabel: Record<string, string> = {
  all: "All Users",
  kyc_approved: "KYC Approved",
  kyc_pending: "KYC Pending",
  no_kyc: "No KYC",
};

export function AdminAnnouncements() {
  const { toast } = useToast();
  const { data: announcements, refetch } = useAdminGetAnnouncements();
  const createMut = useAdminCreateAnnouncement();
  const updateMut = useAdminUpdateAnnouncement();
  const deleteMut = useAdminDeleteAnnouncement();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "", message: "", type: "banner", targetAudience: "all", isActive: true,
      scheduledAt: "", expiresAt: "",
    },
  });

  const openCreate = () => {
    form.reset({ title: "", message: "", type: "banner", targetAudience: "all", isActive: true, scheduledAt: "", expiresAt: "" });
    setEditTarget(null);
    setDialogMode("create");
  };

  const openEdit = (a: Announcement) => {
    form.reset({
      title: a.title,
      message: a.message,
      type: a.type as any,
      targetAudience: a.targetAudience as any,
      isActive: a.isActive,
      scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : "",
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : "",
    });
    setEditTarget(a);
    setDialogMode("edit");
  };

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
    };

    const onSuccess = () => {
      toast({ title: dialogMode === "create" ? "Announcement created" : "Announcement updated" });
      setDialogMode(null);
      refetch();
    };
    const onError = (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" });

    if (dialogMode === "create") {
      createMut.mutate(payload as any, { onSuccess, onError });
    } else if (editTarget) {
      updateMut.mutate({ id: editTarget.id, ...payload } as any, { onSuccess, onError });
    }
  };

  const handleToggleActive = (a: Announcement) => {
    updateMut.mutate({ id: a.id, isActive: !a.isActive } as any, {
      onSuccess: () => { toast({ title: a.isActive ? "Deactivated" : "Activated" }); refetch(); },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { toast({ title: "Deleted" }); setDeleteTarget(null); refetch(); },
    });
  };

  const now = new Date();

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-[#6A82A0] uppercase">{announcements?.length ?? 0} announcements</span>
        <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />New Announcement
        </Button>
      </div>

      <div className="space-y-3">
        {announcements?.map(a => {
          const isExpired = a.expiresAt ? new Date(a.expiresAt) < now : false;
          const isScheduled = a.scheduledAt ? new Date(a.scheduledAt) > now : false;

          return (
            <div key={a.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!a.isActive || isExpired ? "border-[#EEF2F8] opacity-60" : "border-[#EEF2F8]"}`}>
              <div className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 p-1.5 rounded ${a.type === "popup" ? "bg-[#0066FF]/10 text-[#0066FF]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                  {typeIcon[a.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#0F1923]">{a.title}</span>
                    <span className="text-xs font-mono text-[#6A82A0] uppercase">{a.type}</span>
                    <span className="text-xs bg-[#EEF2F8] text-[#6A82A0] px-2 py-0.5 rounded font-mono">{audienceLabel[a.targetAudience] ?? a.targetAudience}</span>
                    {isExpired && <span className="text-xs text-[#EF4444] font-mono">EXPIRED</span>}
                    {isScheduled && <span className="text-xs text-[#F59E0B] font-mono">SCHEDULED</span>}
                    {a.isActive && !isExpired && !isScheduled && <span className="text-xs text-[#22C55E] font-mono">LIVE</span>}
                  </div>
                  <p className="text-xs text-[#6A82A0] mt-1 line-clamp-2">{a.message}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-[#6A82A0] font-mono flex-wrap">
                    {a.scheduledAt && <span>Scheduled: {new Date(a.scheduledAt).toLocaleString()}</span>}
                    {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleString()}</span>}
                    <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="text-[#6A82A0] border-[#EEF2F8] hover:bg-[#F8FAFD]"
                    onClick={() => handleToggleActive(a)}>
                    {a.isActive ? <ToggleRight className="h-4 w-4 text-[#22C55E]" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="text-[#0066FF] border-[#EEF2F8]" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[#EF4444] border-[#EEF2F8]" onClick={() => setDeleteTarget(a)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!announcements?.length && (
          <div className="bg-white p-12 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm shadow-sm">
            No announcements. Create one above.
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {dialogMode && (
        <Dialog open onOpenChange={() => setDialogMode(null)}>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogMode === "create" ? "New Announcement" : "Edit Announcement"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem><FormLabel>Message</FormLabel><FormControl>
                    <textarea {...field} rows={4} className="w-full p-2 text-sm border border-[#EEF2F8] rounded-lg bg-[#F8FAFD] text-[#0F1923] resize-none focus:outline-none focus:border-[#0066FF]" />
                  </FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="banner">Banner</SelectItem>
                          <SelectItem value="popup">Popup</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="targetAudience" render={({ field }) => (
                    <FormItem><FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="kyc_approved">KYC Approved</SelectItem>
                          <SelectItem value="kyc_pending">KYC Pending</SelectItem>
                          <SelectItem value="no_kyc">No KYC</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                    <FormItem><FormLabel>Scheduled At (optional)</FormLabel><FormControl><Input type="datetime-local" className="bg-[#F8FAFD] border-[#EEF2F8] text-sm" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="expiresAt" render={({ field }) => (
                    <FormItem><FormLabel>Expires At (optional)</FormLabel><FormControl><Input type="datetime-local" className="bg-[#F8FAFD] border-[#EEF2F8] text-sm" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <button type="button" onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.value ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <FormLabel className="cursor-pointer">Active (show to users)</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
                  <Button type="submit" className="bg-[#0066FF] text-white" disabled={createMut.isPending || updateMut.isPending}>
                    {dialogMode === "create" ? "Create" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8]">
            <DialogHeader><DialogTitle className="text-[#EF4444]">Delete Announcement</DialogTitle></DialogHeader>
            <p className="text-sm text-[#6A82A0]">Delete "<strong className="text-[#0F1923]">{deleteTarget.title}</strong>"? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="bg-[#EF4444] text-white" onClick={handleDelete} disabled={deleteMut.isPending}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
