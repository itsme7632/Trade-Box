import { useState } from "react";
import {
  useAdminGetStats, useAdminListDeposits, useAdminApproveDeposit, useAdminRejectDeposit,
  useAdminListWithdrawals, useAdminProcessWithdrawal, useAdminListKyc, useAdminApproveKyc,
  useAdminRejectKyc, useAdminListUsers, useAdminListShipments, useAdminCreateShipment,
  useAdminDeliverShipment, useAdminUpdateShipment
} from "@workspace/api-client-react";
import {
  useGetSupportSettings, useUpdateSupportSettings,
  useGetTickets, useReplyTicket, useUpdateTicketStatus,
  useAdminAnalytics,
  type SupportTicket,
} from "@workspace/api-client-react/src/extra-hooks";
import { AdminUsersV2 } from "./admin-users";
import { AdminSettings } from "./admin-settings";
import { AdminShipmentOverrides } from "./admin-shipment-overrides";
import { AdminPlans } from "./admin-plans";
import { AdminAnnouncements } from "./admin-announcements";
import { AdminAuditLog } from "./admin-audit-log";
import { AdminNews } from "./admin-news";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldAlert, Users, Anchor, Ship, Wallet, FileCheck, Check, X, Search, Plus, MessageSquare,
  Settings, Clock, RefreshCw, CheckCircle, ChevronDown, ChevronUp, BarChart3, Megaphone,
  SlidersHorizontal, Menu, ClipboardList, Newspaper
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TABS = [
  { value: "overview", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { value: "deposits", label: "Deposits", icon: null, badgeKey: "pendingDeposits" as const },
  { value: "withdrawals", label: "Withdrawals", icon: null, badgeKey: "pendingWithdrawals" as const },
  { value: "kyc", label: "KYC", icon: null, badgeKey: "pendingKyc" as const },
  { value: "shipments", label: "Shipments", icon: null },
  { value: "users-v2", label: "Users", icon: <Users className="h-4 w-4" /> },
  { value: "plans", label: "Plans", icon: <Anchor className="h-4 w-4" /> },
  { value: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
  { value: "news", label: "News Center", icon: <Newspaper className="h-4 w-4" /> },
  { value: "tickets", label: "Tickets", icon: null },
  { value: "support-settings", label: "Support Config", icon: null },
  { value: "overrides", label: "Ship Control", icon: <Ship className="h-4 w-4" /> },
  { value: "audit-logs", label: "Audit Logs", icon: <ClipboardList className="h-4 w-4" /> },
  { value: "platform-settings", label: "Settings", icon: <SlidersHorizontal className="h-4 w-4" /> },
];

export default function AdminDashboard() {
  const { data: stats } = useAdminGetStats();
  const { data: tickets } = useGetTickets();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openTicketCount = tickets?.filter(t => t.status === "open").length ?? 0;

  const getBadge = (tab: typeof TABS[0]) => {
    if (!stats || !tab.badgeKey) return 0;
    return stats[tab.badgeKey] ?? 0;
  };

  const activeLabel = TABS.find(t => t.value === activeTab)?.label ?? "Dashboard";

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0F1923]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#EEF2F8]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
                <div>
                  <p className="font-bold text-[#0F1923] text-sm">Admin Terminal</p>
                  <p className="text-[10px] text-[#6A82A0] font-mono uppercase">Restricted</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F8FAFD]">
                <X className="h-5 w-5 text-[#6A82A0]" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {TABS.map(tab => {
                const badge = getBadge(tab) || (tab.value === "tickets" ? openTicketCount : 0);
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono uppercase tracking-wide mb-0.5 transition-colors ${
                      isActive
                        ? "bg-[#EF4444] text-white"
                        : "text-[#6A82A0] hover:bg-[#F8FAFD] hover:text-[#0F1923]"
                    }`}
                    onClick={() => handleTabChange(tab.value)}
                  >
                    {tab.icon && <span className={isActive ? "text-white" : "text-[#6A82A0]"}>{tab.icon}</span>}
                    <span className="flex-1 text-left">{tab.label}</span>
                    {badge > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#EEF2F8] pb-4 md:pb-6">
          <button
            className="lg:hidden p-2 rounded-lg bg-white border border-[#EEF2F8] shadow-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-[#6A82A0]" />
          </button>
          <ShieldAlert className="hidden lg:block h-8 w-8 text-[#EF4444]" />
          <div className="min-w-0">
            <h1 className="text-xl lg:text-3xl font-heading font-bold tracking-tight truncate">Admin Terminal</h1>
            <p className="text-[#6A82A0] font-mono text-xs uppercase">
              <span className="lg:hidden">{activeLabel}</span>
              <span className="hidden lg:inline">Restricted Access</span>
            </p>
          </div>
        </div>

        {/* Summary Cards — Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Users"
            value={String(stats?.totalUsers || 0)}
            color="#0066FF"
          />
          <SummaryCard
            label="Deposits / Withdrawals"
            value={`${(stats?.totalDeposited ?? 0).toLocaleString()} / ${(stats?.totalWithdrawn ?? 0).toLocaleString()} USDT`}
            color="#22C55E"
            small
          />
          <SummaryCard
            label="Pending Actions"
            value={`${stats?.pendingDeposits ?? 0} Dep · ${stats?.pendingWithdrawals ?? 0} Wd · ${stats?.pendingKyc ?? 0} KYC`}
            color="#F59E0B"
            small
          />
          <SummaryCard
            label="Active Cargo"
            value={String(stats?.activeShipments || 0)}
            color="#7C3AED"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tab Bar */}
          <div className="hidden lg:block overflow-x-auto">
            <TabsList className="bg-white border border-[#EEF2F8] w-max min-w-full justify-start p-1 h-auto shadow-sm flex-nowrap">
              {TABS.map(tab => {
                const badge = getBadge(tab) || (tab.value === "tickets" ? openTicketCount : 0);
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="py-2.5 px-3 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0] whitespace-nowrap gap-1.5"
                  >
                    {tab.icon}
                    {tab.label}
                    {badge > 0 && (
                      <span className="ml-0.5 bg-current/20 text-[10px] px-1 rounded font-bold opacity-80">
                        {badge}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="overview"><AdminAnalyticsTab /></TabsContent>
          <TabsContent value="deposits"><AdminDeposits /></TabsContent>
          <TabsContent value="withdrawals"><AdminWithdrawals /></TabsContent>
          <TabsContent value="kyc"><AdminKyc /></TabsContent>
          <TabsContent value="shipments"><AdminShipments /></TabsContent>
          <TabsContent value="users-v2"><AdminUsersV2 /></TabsContent>
          <TabsContent value="plans"><AdminPlans /></TabsContent>
          <TabsContent value="announcements"><AdminAnnouncements /></TabsContent>
          <TabsContent value="news"><AdminNews /></TabsContent>
          <TabsContent value="tickets"><AdminTickets /></TabsContent>
          <TabsContent value="support-settings"><AdminSupportSettings /></TabsContent>
          <TabsContent value="overrides"><AdminShipmentOverrides /></TabsContent>
          <TabsContent value="audit-logs"><AdminAuditLog /></TabsContent>
          <TabsContent value="platform-settings"><AdminSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">{label}</p>
      <p className={`font-bold font-mono ${small ? "text-sm leading-relaxed" : "text-2xl"} text-[#0F1923] break-words`}>{value}</p>
    </div>
  );
}

function AdminAnalyticsTab() {
  const { data: a } = useAdminAnalytics();

  if (!a) return (
    <div className="mt-6 bg-white p-8 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm shadow-sm">Loading analytics…</div>
  );

  const cards = [
    { label: "Total Users", value: a.users.total, sub: `+${a.users.registrationsToday} today`, color: "#0066FF" },
    { label: "Active Users", value: a.users.active, sub: `${a.users.suspended} suspended · ${a.users.banned} banned`, color: "#22C55E" },
    { label: "KYC Pending", value: a.kyc.pending, sub: `${a.kyc.approved} approved`, color: "#F59E0B" },
    { label: "Pending Actions", value: a.pending.deposits + a.pending.withdrawals + a.pending.kyc, sub: `${a.pending.deposits} dep · ${a.pending.withdrawals} wd · ${a.pending.kyc} kyc`, color: "#EF4444" },
    { label: "Total Deposited", value: `${a.financials.totalDeposited.toLocaleString()} USDT`, sub: `+${a.financials.depositsToday.toLocaleString()} today`, color: "#22C55E" },
    { label: "Total Withdrawn", value: `${a.financials.totalWithdrawn.toLocaleString()} USDT`, sub: `−${a.financials.withdrawalsToday.toLocaleString()} today`, color: "#EF4444" },
    { label: "Profit Paid Out", value: `${a.financials.totalProfitPaid.toLocaleString()} USDT`, sub: "All-time delivery profits", color: "#0066FF" },
    { label: "Commissions Paid", value: `${a.financials.totalCommissionsPaid.toLocaleString()} USDT`, sub: "All-time guild commissions", color: "#7C3AED" },
    { label: "Active Shipments", value: a.shipments.active, sub: `${a.shipments.open} open for investment`, color: "#0066FF" },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: c.color }}>
          <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">{c.label}</p>
          <p className="font-bold font-mono text-xl text-[#0F1923] break-words">{c.value}</p>
          <p className="text-[10px] text-[#6A82A0] mt-1 font-mono">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Mobile Card + Desktop Table pattern ───────────────────────────────────────

function AdminDeposits() {
  const { data, refetch } = useAdminListDeposits();
  const approve = useAdminApproveDeposit();
  const reject = useAdminRejectDeposit();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approve.mutate({ id }, { onSuccess: () => { toast({ title: "Approved" }); refetch(); } });
  };
  const handleReject = (id: number) => {
    reject.mutate({ id, data: { reason: "Invalid TXID" } }, { onSuccess: () => { toast({ title: "Rejected" }); refetch(); } });
  };

  if (!data?.length) return <EmptyState label="No deposits found" />;

  return (
    <div className="mt-6 space-y-3">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Coin/TXID</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data.map(d => (
              <tr key={d.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4"><p className="font-bold text-[#0F1923]">{d.traderId}</p><p className="text-xs text-[#6A82A0]">{d.email}</p></td>
                <td className="p-4 font-mono font-bold text-[#22C55E]">{d.amount} USDT</td>
                <td className="p-4"><span className="text-xs bg-[#EEF2F8] px-1 rounded">{d.coin}</span><p className="text-xs font-mono text-[#6A82A0] truncate max-w-[120px]">{d.txid}</p></td>
                <td className="p-4 text-xs font-mono uppercase">{d.status}</td>
                <td className="p-4 text-right space-x-2">
                  {d.status === "reviewing" && (
                    <>
                      <Button size="sm" variant="outline" className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E] hover:text-white" onClick={() => handleApprove(d.id)}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444] hover:text-white" onClick={() => handleReject(d.id)}><X className="h-4 w-4" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-bold text-[#0F1923] font-mono text-sm">{d.traderId}</p>
                <p className="text-xs text-[#6A82A0]">{d.email}</p>
              </div>
              <span className={`text-xs font-mono uppercase font-bold px-2 py-1 rounded ${d.status === "reviewing" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : d.status === "cleared" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EEF2F8] text-[#6A82A0]"}`}>{d.status}</span>
            </div>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#6A82A0] font-mono">Amount</span>
                <span className="font-bold font-mono text-[#22C55E]">{d.amount} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6A82A0] font-mono">Coin</span>
                <span className="font-mono text-[#0F1923]">{d.coin}</span>
              </div>
              {d.txid && <p className="text-[10px] text-[#6A82A0] font-mono truncate">TXID: {d.txid}</p>}
            </div>
            {d.status === "reviewing" && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-[#22C55E] hover:bg-[#16a34a] text-white" onClick={() => handleApprove(d.id)}><Check className="h-4 w-4 mr-1" />Approve</Button>
                <Button size="sm" variant="outline" className="flex-1 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444] hover:text-white" onClick={() => handleReject(d.id)}><X className="h-4 w-4 mr-1" />Reject</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminWithdrawals() {
  const { data, refetch } = useAdminListWithdrawals();
  const process = useAdminProcessWithdrawal();
  const { toast } = useToast();
  const [txid, setTxid] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleProcess = (id: number) => {
    process.mutate({ id, data: { txid: txid || "processed" } }, {
      onSuccess: () => { toast({ title: "Processed" }); refetch(); setActiveId(null); setTxid(""); }
    });
  };

  if (!data?.length) return <EmptyState label="No withdrawals found" />;

  return (
    <div className="mt-6 space-y-3">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">User</th><th className="p-4">Amount</th><th className="p-4">Address</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data.map(w => (
              <tr key={w.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4 font-bold text-[#0F1923]">{w.traderId}</td>
                <td className="p-4 font-mono font-bold text-[#EF4444]">{w.amount} USDT</td>
                <td className="p-4 font-mono text-xs text-[#6A82A0] max-w-[160px] truncate">{w.walletAddress}</td>
                <td className="p-4 text-xs font-mono uppercase">{w.status}</td>
                <td className="p-4 text-right">
                  {w.status === "in_transit" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] text-white">Process</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8]">
                        <DialogHeader><DialogTitle>Process Withdrawal</DialogTitle></DialogHeader>
                        <Input placeholder="Blockchain TXID" value={txid} onChange={e => setTxid(e.target.value)} className="bg-[#F8FAFD] border-[#EEF2F8]" />
                        <DialogFooter>
                          <Button onClick={() => handleProcess(w.id)} className="bg-[#0066FF] text-white">Confirm</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map(w => (
          <div key={w.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <p className="font-bold font-mono text-[#0F1923]">{w.traderId}</p>
              <span className={`text-xs font-mono uppercase px-2 py-1 rounded ${w.status === "in_transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#22C55E]/10 text-[#22C55E]"}`}>{w.status}</span>
            </div>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#6A82A0] font-mono">Amount</span>
                <span className="font-bold font-mono text-[#EF4444]">{w.amount} USDT</span>
              </div>
              <p className="text-[10px] text-[#6A82A0] font-mono break-all">Addr: {w.walletAddress}</p>
            </div>
            {w.status === "in_transit" && (
              <>
                {activeId === w.id ? (
                  <div className="space-y-2">
                    <Input placeholder="Blockchain TXID" value={txid} onChange={e => setTxid(e.target.value)} className="bg-[#F8FAFD] border-[#EEF2F8] text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-[#0066FF] text-white" onClick={() => handleProcess(w.id)}>Confirm</Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setActiveId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full bg-[#0066FF] text-white" onClick={() => setActiveId(w.id)}>Process Withdrawal</Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminKyc() {
  const { data, refetch } = useAdminListKyc();
  const approve = useAdminApproveKyc();
  const reject = useAdminRejectKyc();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approve.mutate({ id }, { onSuccess: () => { toast({ title: "Approved" }); refetch(); } });
  };
  const handleReject = (id: number) => {
    reject.mutate({ id, data: { reason: "Blurry images" } }, { onSuccess: () => { toast({ title: "Rejected" }); refetch(); } });
  };

  if (!data?.length) return <EmptyState label="No KYC submissions" />;

  return (
    <div className="mt-6 space-y-3">
      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">User</th><th className="p-4">Documents</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data.map(k => (
              <tr key={k.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4 font-bold text-[#0F1923]">{k.traderId}</td>
                <td className="p-4 space-y-1">
                  <a href={k.idDocumentUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline block">ID Doc</a>
                  <a href={k.selfieUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline block">Selfie</a>
                </td>
                <td className="p-4 text-xs font-mono uppercase">{k.status}</td>
                <td className="p-4 text-right space-x-2">
                  {k.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="bg-[#22C55E]/10 text-[#22C55E]" onClick={() => handleApprove(k.id)}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" className="bg-[#EF4444]/10 text-[#EF4444]" onClick={() => handleReject(k.id)}><X className="h-4 w-4" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map(k => (
          <div key={k.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold font-mono text-[#0F1923]">{k.traderId}</p>
              <span className={`text-xs font-mono uppercase px-2 py-1 rounded ${k.status === "pending" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : k.status === "approved" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>{k.status}</span>
            </div>
            <div className="flex gap-4 mb-3">
              <a href={k.idDocumentUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline">View ID Doc</a>
              <a href={k.selfieUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline">View Selfie</a>
            </div>
            {k.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-[#22C55E] text-white" onClick={() => handleApprove(k.id)}><Check className="h-4 w-4 mr-1" />Approve</Button>
                <Button size="sm" variant="outline" className="flex-1 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444] hover:text-white" onClick={() => handleReject(k.id)}><X className="h-4 w-4 mr-1" />Reject</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminShipments() {
  const { data, refetch } = useAdminListShipments();
  const deliver = useAdminDeliverShipment();
  const create = useAdminCreateShipment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const shipmentSchema = z.object({
    title: z.string(), cargoType: z.string(), origin: z.string(), destination: z.string(),
    profitPercent: z.coerce.number(), riskGrade: z.string(), fundingGoal: z.coerce.number(), minInvestment: z.coerce.number(),
    departureDate: z.string(), arrivalDate: z.string(), freightForwarder: z.string(), vesselName: z.string()
  });

  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      title: "", cargoType: "electronics", origin: "", destination: "", profitPercent: 5, riskGrade: "A",
      fundingGoal: 100000, minInvestment: 100,
      departureDate: format(new Date(), "yyyy-MM-dd"),
      arrivalDate: format(new Date(), "yyyy-MM-dd"),
      freightForwarder: "", vesselName: ""
    }
  });

  const onSubmit = (data: any) => {
    create.mutate({ data }, { onSuccess: () => { toast({ title: "Created" }); refetch(); setOpen(false); form.reset(); } });
  };

  const handleDeliver = (id: number) => {
    deliver.mutate({ id }, { onSuccess: () => { toast({ title: "Marked Delivered" }); refetch(); } });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066FF] text-white"><Plus className="h-4 w-4 mr-2" />New Shipment</Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Cargo Manifest</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => <FormItem className="col-span-full"><FormLabel>Title</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="vesselName" render={({ field }) => <FormItem><FormLabel>Vessel Name</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="origin" render={({ field }) => <FormItem><FormLabel>Origin</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="destination" render={({ field }) => <FormItem><FormLabel>Destination</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="profitPercent" render={({ field }) => <FormItem><FormLabel>Profit %</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="fundingGoal" render={({ field }) => <FormItem><FormLabel>Funding Goal</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field} /></FormControl></FormItem>} />
                <Button type="submit" className="col-span-full bg-[#0066FF] text-white mt-4" disabled={create.isPending}>Create</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">Title/Vessel</th><th className="p-4">Route</th><th className="p-4">Funding</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data?.map(s => (
              <tr key={s.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4"><p className="font-bold text-[#0F1923] truncate max-w-[200px]">{s.title}</p><p className="text-xs text-[#6A82A0] font-mono">{s.vesselName}</p></td>
                <td className="p-4 text-xs font-mono text-[#0F1923]">{s.origin}<br />to {s.destination}</td>
                <td className="p-4 font-mono text-xs text-[#0F1923]">{s.fundingRaised}/{s.fundingGoal} USDT</td>
                <td className="p-4 text-xs font-mono uppercase">{s.status}</td>
                <td className="p-4 text-right">
                  {s.status === "in_transit" && (
                    <Button size="sm" className="bg-[#22C55E] hover:bg-[#16a34a] text-white" onClick={() => handleDeliver(s.id)}>Deliver</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data?.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-[#EEF2F8] p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0">
                <p className="font-bold text-[#0F1923] text-sm truncate">{s.title}</p>
                <p className="text-xs text-[#6A82A0] font-mono">{s.vesselName}</p>
              </div>
              <span className="text-xs font-mono uppercase font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded shrink-0 ml-2">{s.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><span className="text-[#6A82A0]">Route: </span><span className="font-mono">{s.origin} → {s.destination}</span></div>
              <div><span className="text-[#6A82A0]">Funding: </span><span className="font-mono">{s.fundingRaised}/{s.fundingGoal}</span></div>
            </div>
            {s.status === "in_transit" && (
              <Button size="sm" className="w-full bg-[#22C55E] text-white" onClick={() => handleDeliver(s.id)}>Mark Delivered</Button>
            )}
          </div>
        ))}
      </div>
      {!data?.length && <EmptyState label="No shipments found" />}
    </div>
  );
}

const statusCfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
  open: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Open" },
  in_progress: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "In Progress" },
  closed: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Resolved" },
};

function AdminTickets() {
  const { data: tickets, refetch } = useGetTickets();
  const replyTicket = useReplyTicket();
  const updateStatus = useUpdateTicketStatus();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = (tickets || []).filter(t => statusFilter === "all" ? true : t.status === statusFilter);

  const handleReply = (ticketId: number) => {
    const msg = replyText[ticketId]?.trim();
    if (!msg) return;
    replyTicket.mutate({ ticketId, message: msg }, {
      onSuccess: () => { toast({ title: "Reply sent" }); setReplyText(p => ({ ...p, [ticketId]: "" })); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
    });
  };

  const handleStatus = (ticketId: number, status: string) => {
    updateStatus.mutate({ ticketId, status }, {
      onSuccess: () => { toast({ title: "Status updated" }); refetch(); },
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-[#EEF2F8] rounded-lg px-3 py-2 text-sm font-mono text-[#0F1923] focus:outline-none">
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Resolved</option>
        </select>
        <span className="text-xs font-mono text-[#6A82A0] uppercase">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      {filtered.length === 0 ? <EmptyState label="No tickets found" /> : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const cfg = statusCfg[ticket.status] || statusCfg.open;
            const isOpen = expanded === ticket.id;
            return (
              <div key={ticket.id} className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
                <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-[#F8FAFD]" onClick={() => setExpanded(isOpen ? null : ticket.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#0F1923]">#{ticket.id}</span>
                      <span className="font-semibold text-sm text-[#0F1923] truncate">{ticket.subject}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-[#6A82A0] mt-1 font-mono">{ticket.user?.email} · {ticket.user?.traderId} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-[#6A82A0] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#6A82A0] shrink-0" />}
                </div>
                {isOpen && (
                  <div className="border-t border-[#EEF2F8] p-4 space-y-4">
                    <div className="p-3 bg-[#F8FAFD] rounded-lg border border-[#EEF2F8]">
                      <p className="text-xs font-mono font-bold text-[#6A82A0] uppercase mb-1">User's message</p>
                      <p className="text-sm text-[#0F1923] leading-relaxed">{ticket.message}</p>
                    </div>
                    {ticket.replies.length > 0 && (
                      <div className="space-y-2">
                        {ticket.replies.map(reply => (
                          <div key={reply.id} className="p-3 rounded-lg border" style={{ background: reply.isAdmin ? "#eff6ff" : "#f8fafc", borderColor: reply.isAdmin ? "#bfdbfe" : "#e2e8f0" }}>
                            <p className="text-xs font-mono font-bold mb-1" style={{ color: reply.isAdmin ? "#2563eb" : "#64748b" }}>
                              {reply.isAdmin ? "Support Team" : "User"} · {new Date(reply.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-[#0F1923] leading-relaxed">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <textarea value={replyText[ticket.id] || ""} onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                        placeholder="Write a reply…" rows={2}
                        className="flex-1 w-full p-2 text-sm border border-[#EEF2F8] rounded-lg bg-[#F8FAFD] text-[#0F1923] resize-none focus:outline-none focus:border-[#0066FF]" />
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button size="sm" className="bg-[#0066FF] text-white" onClick={() => handleReply(ticket.id)} disabled={replyTicket.isPending}>Reply</Button>
                        <select value={ticket.status} onChange={e => handleStatus(ticket.id, e.target.value)}
                          className="bg-white border border-[#EEF2F8] rounded-lg px-2 py-1.5 text-xs font-mono text-[#0F1923] focus:outline-none">
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const supportSettingsSchema = z.object({
  telegramSupport: z.string().optional(),
  whatsappSupport: z.string().optional(),
  supportEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  telegramGroup: z.string().optional(),
  whatsappCommunity: z.string().optional(),
  announcementChannel: z.string().optional(),
});

function AdminSupportSettings() {
  const { data: settings, isLoading } = useGetSupportSettings();
  const update = useUpdateSupportSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof supportSettingsSchema>>({
    resolver: zodResolver(supportSettingsSchema),
    values: {
      telegramSupport: settings?.telegramSupport || "",
      whatsappSupport: settings?.whatsappSupport || "",
      supportEmail: settings?.supportEmail || "",
      telegramGroup: settings?.telegramGroup || "",
      whatsappCommunity: settings?.whatsappCommunity || "",
      announcementChannel: settings?.announcementChannel || "",
    },
  });

  const onSave = (data: z.infer<typeof supportSettingsSchema>) => {
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(data)) cleaned[k] = v?.trim() || null;
    update.mutate(cleaned as any, {
      onSuccess: () => toast({ title: "Support settings saved" }),
      onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="mt-6 bg-white p-8 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm">Loading…</div>;

  const fields = [
    { name: "telegramSupport" as const, label: "Telegram Support Handle", placeholder: "@TradeBoxSupport" },
    { name: "whatsappSupport" as const, label: "WhatsApp Support Number", placeholder: "+18005557823" },
    { name: "supportEmail" as const, label: "Support Email", placeholder: "support@tradebox.io" },
    { name: "telegramGroup" as const, label: "Telegram Community URL", placeholder: "https://t.me/..." },
    { name: "whatsappCommunity" as const, label: "WhatsApp Community URL", placeholder: "https://wa.me/join/..." },
    { name: "announcementChannel" as const, label: "Announcement Channel URL", placeholder: "https://t.me/..." },
  ];

  return (
    <div className="mt-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#EEF2F8]">
          <Settings className="h-5 w-5 text-[#EF4444]" />
          <h2 className="font-bold text-[#0F1923]">Support Contact Configuration</h2>
        </div>
        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              {fields.map(f => (
                <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase text-[#6A82A0] font-bold">{f.label}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder={f.placeholder} className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] font-mono text-sm" />
                    </FormControl>
                  </FormItem>
                )} />
              ))}
              <Button type="submit" disabled={update.isPending} className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold">
                {update.isPending ? "Saving…" : "Save Support Settings"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-6 bg-white p-12 rounded-xl border border-[#EEF2F8] text-center text-[#6A82A0] font-mono text-sm shadow-sm">
      {label}
    </div>
  );
}
