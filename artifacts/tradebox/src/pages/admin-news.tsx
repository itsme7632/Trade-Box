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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Pencil, Archive, Copy, Newspaper, Pin, Star, Eye,
  Globe, FileText, AlertTriangle, Zap, Shield, Tag, Anchor, Radio,
  Clock, CheckCircle2
} from "lucide-react";
import {
  useAdminGetNewsPosts, useAdminCreateNewsPost, useAdminUpdateNewsPost,
  useAdminDuplicateNewsPost, useAdminArchiveNewsPost,
  type AdminNewsPost,
} from "@workspace/api-client-react/src/extra-hooks";
import { format, parseISO } from "date-fns";

const CATEGORIES = [
  { value: "platform_update",  label: "Platform Update",    icon: Globe,         color: "#2563eb" },
  { value: "new_shipment",     label: "New Shipment",        icon: Anchor,        color: "#0891b2" },
  { value: "maintenance",      label: "Maintenance Notice",  icon: AlertTriangle, color: "#d97706" },
  { value: "feature_release",  label: "Feature Release",     icon: Zap,           color: "#7c3aed" },
  { value: "security_alert",   label: "Security Alert",      icon: Shield,        color: "#dc2626" },
  { value: "promotion",        label: "Promotion",           icon: Tag,           color: "#059669" },
  { value: "partnership",      label: "Partnership",         icon: Radio,         color: "#0ea5e9" },
  { value: "general",          label: "General News",        icon: Newspaper,     color: "#64748b" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  published: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  draft:     { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  archived:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const PostSchema = z.object({
  title:       z.string().min(1, "Title required"),
  summary:     z.string().max(500).optional(),
  content:     z.string().optional(),
  coverImage:  z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category:    z.string().default("general"),
  author:      z.string().default("TradeBox"),
  isPinned:    z.boolean().default(false),
  isFeatured:  z.boolean().default(false),
  status:      z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
});

type PostFormValues = z.infer<typeof PostSchema>;

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function AdminNews() {
  const { data: posts, isLoading, refetch } = useAdminGetNewsPosts();
  const create = useAdminCreateNewsPost();
  const update = useAdminUpdateNewsPost();
  const duplicate = useAdminDuplicateNewsPost();
  const archive = useAdminArchiveNewsPost();
  const { toast } = useToast();

  const [editPost, setEditPost] = useState<AdminNewsPost | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostSchema),
    defaultValues: {
      title: "", summary: "", content: "", coverImage: "",
      category: "general", author: "TradeBox",
      isPinned: false, isFeatured: false, status: "draft",
    },
  });

  const openCreate = () => {
    setEditPost(null);
    form.reset({ title: "", summary: "", content: "", coverImage: "", category: "general", author: "TradeBox", isPinned: false, isFeatured: false, status: "draft" });
    setCreateOpen(true);
  };

  const openEdit = (p: AdminNewsPost) => {
    setEditPost(p);
    form.reset({
      title: p.title,
      summary: p.summary ?? "",
      content: p.content ?? "",
      coverImage: p.coverImage ?? "",
      category: p.category,
      author: p.author,
      isPinned: p.isPinned,
      isFeatured: p.isFeatured,
      status: p.status as "draft" | "published" | "archived",
      publishedAt: p.publishedAt ? p.publishedAt.slice(0, 16) : "",
      scheduledAt: p.scheduledAt ? p.scheduledAt.slice(0, 16) : "",
    });
    setCreateOpen(true);
  };

  const onSubmit = async (vals: PostFormValues) => {
    const payload: any = {
      ...vals,
      coverImage: vals.coverImage || null,
      summary: vals.summary || null,
      content: vals.content || null,
      publishedAt: vals.publishedAt ? new Date(vals.publishedAt).toISOString() : null,
      scheduledAt: vals.scheduledAt ? new Date(vals.scheduledAt).toISOString() : null,
    };
    try {
      if (editPost) {
        await update.mutateAsync({ id: editPost.id, ...payload });
        toast({ title: "Post updated", description: payload.status === "published" ? "Published & users notified." : "Saved." });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Post created", description: payload.status === "published" ? "Published & users notified." : "Saved as draft." });
      }
      setCreateOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicate.mutateAsync(id);
      toast({ title: "Duplicated", description: "Saved as draft copy." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" });
    }
  };

  const handleArchive = async (id: number, title: string) => {
    if (!confirm(`Archive "${title}"?`)) return;
    try {
      await archive.mutateAsync(id);
      toast({ title: "Archived" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" });
    }
  };

  const publishNow = async (p: AdminNewsPost) => {
    try {
      await update.mutateAsync({ id: p.id, status: "published" as const });
      toast({ title: "Published!", description: "Users have been notified." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" });
    }
  };

  const filtered = (posts ?? []).filter(p => statusFilter === "all" ? true : p.status === statusFilter);
  const counts = {
    all: posts?.length ?? 0,
    published: posts?.filter(p => p.status === "published").length ?? 0,
    draft: posts?.filter(p => p.status === "draft").length ?? 0,
    archived: posts?.filter(p => p.status === "archived").length ?? 0,
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[#0F1923] font-mono uppercase tracking-wide flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-[#0066FF]" />
            News Center
          </h2>
          <p className="text-xs text-[#6A82A0] font-mono mt-0.5">Manage platform news, announcements & updates</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-mono text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Post
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "published", "draft", "archived"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase border transition-all ${
              statusFilter === s
                ? "bg-[#0066FF] text-white border-[#0066FF]"
                : "bg-white text-[#6A82A0] border-[#EEF2F8] hover:border-[#0066FF] hover:text-[#0066FF]"
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[#F4F7FB] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EEF2F8] p-12 text-center">
          <Newspaper className="h-10 w-10 mx-auto text-[#CBD5E1] mb-3" />
          <p className="text-sm font-mono text-[#6A82A0]">No posts yet. Create your first news post.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const cat = getCategoryInfo(p.category);
            const CatIcon = cat.icon;
            const statusStyle = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 hover:border-[#0066FF]/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}12` }}>
                    <CatIcon className="h-4 w-4" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
                        style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.border }}>
                        {p.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                        style={{ color: cat.color, background: `${cat.color}10`, borderColor: `${cat.color}30` }}>
                        {cat.label}
                      </span>
                      {p.isPinned && <span className="text-xs font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1"><Pin className="h-2.5 w-2.5" />Pinned</span>}
                      {p.isFeatured && <span className="text-xs font-mono text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="h-2.5 w-2.5" />Featured</span>}
                    </div>
                    <h3 className="font-semibold text-[#0F1923] text-sm leading-snug truncate">{p.title}</h3>
                    {p.summary && <p className="text-xs text-[#6A82A0] mt-0.5 line-clamp-1">{p.summary}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#94a3b8] font-mono">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.viewCount} views</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {p.publishedAt ? format(parseISO(p.publishedAt), "MMM d, yyyy") : format(parseISO(p.createdAt), "MMM d, yyyy")}
                      </span>
                      <span>by {p.author}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {p.status === "draft" && (
                      <button
                        onClick={() => publishNow(p)}
                        disabled={update.isPending}
                        className="px-2 py-1 rounded-lg text-xs font-mono font-bold text-white bg-[#059669] hover:bg-[#047857] flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" />Publish
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      className="px-2 py-1 rounded-lg text-xs font-mono text-[#0066FF] bg-blue-50 hover:bg-blue-100 flex items-center gap-1 border border-blue-100 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(p.id)}
                      className="px-2 py-1 rounded-lg text-xs font-mono text-[#6A82A0] bg-[#F8FAFD] hover:bg-[#EEF2F8] flex items-center gap-1 border border-[#EEF2F8] transition-colors"
                    >
                      <Copy className="h-3 w-3" />Copy
                    </button>
                    {p.status !== "archived" && (
                      <button
                        onClick={() => handleArchive(p.id, p.title)}
                        className="px-2 py-1 rounded-lg text-xs font-mono text-red-500 bg-red-50 hover:bg-red-100 flex items-center gap-1 border border-red-100 transition-colors"
                      >
                        <Archive className="h-3 w-3" />Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-[#0F1923] flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[#0066FF]" />
              {editPost ? "Edit Post" : "Create News Post"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Title *</FormLabel>
                  <FormControl><Input {...field} placeholder="Post title..." className="bg-[#F8FAFD] border-[#EEF2F8]" /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-[#F8FAFD] border-[#EEF2F8]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="author" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Author</FormLabel>
                  <FormControl><Input {...field} placeholder="TradeBox" className="bg-[#F8FAFD] border-[#EEF2F8]" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Summary (max 500 chars)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} placeholder="Short summary shown in news feed..." className="bg-[#F8FAFD] border-[#EEF2F8] resize-none" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Full Content</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} rows={8} placeholder="Full article content..." className="bg-[#F8FAFD] border-[#EEF2F8] resize-none font-mono text-sm" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="coverImage" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Cover Image URL</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://..." className="bg-[#F8FAFD] border-[#EEF2F8]" /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="publishedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Publish Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} className="bg-[#F8FAFD] border-[#EEF2F8]" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase">Scheduled Publish</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} className="bg-[#F8FAFD] border-[#EEF2F8]" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-6">
                <FormField control={form.control} name="isPinned" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase m-0">Pin Post</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isFeatured" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="font-mono text-xs text-[#6A82A0] uppercase m-0">Feature Post</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="font-mono text-xs">Cancel</Button>
                <Button type="submit" disabled={isPending} className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-mono text-xs">
                  {isPending ? "Saving…" : editPost ? "Save Changes" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
