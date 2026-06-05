import { useState } from "react";
import { useAdminGetAuditLogs, type AuditLogEntry } from "@workspace/api-client-react/src/extra-hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, RefreshCw, ClipboardList } from "lucide-react";

const ACTION_OPTIONS = [
  "all",
  "login_success", "login_failure", "logout",
  "register_success", "register_failure",
  "deposit_approved", "deposit_rejected",
  "withdrawal_approved", "withdrawal_rejected",
  "kyc_approved", "kyc_rejected",
  "user_suspended", "user_unsuspended", "user_banned",
  "admin_reset_password", "admin_force_logout",
  "user_promoted", "user_demoted",
  "admin_add_balance", "admin_deduct_balance", "admin_add_commission",
  "settings_updated", "branding_uploaded",
  "plan_featured_toggled", "plan_activated", "plan_deactivated",
  "plan_edited", "plan_duplicated", "plan_archived", "plan_unarchived",
  "announcement_created", "announcement_updated", "announcement_deleted",
];

const EVENT_COLORS: Record<string, string> = {
  login_success: "text-[#22C55E] bg-[#22C55E]/10",
  login_failure: "text-[#EF4444] bg-[#EF4444]/10",
  register_success: "text-[#0066FF] bg-[#0066FF]/10",
  deposit_approved: "text-[#22C55E] bg-[#22C55E]/10",
  deposit_rejected: "text-[#EF4444] bg-[#EF4444]/10",
  withdrawal_approved: "text-[#22C55E] bg-[#22C55E]/10",
  withdrawal_rejected: "text-[#EF4444] bg-[#EF4444]/10",
  kyc_approved: "text-[#22C55E] bg-[#22C55E]/10",
  kyc_rejected: "text-[#EF4444] bg-[#EF4444]/10",
  user_suspended: "text-[#F59E0B] bg-[#F59E0B]/10",
  user_banned: "text-[#EF4444] bg-[#EF4444]/10",
  user_promoted: "text-[#0066FF] bg-[#0066FF]/10",
  settings_updated: "text-[#7C3AED] bg-[#7C3AED]/10",
  branding_uploaded: "text-[#7C3AED] bg-[#7C3AED]/10",
  admin_add_balance: "text-[#22C55E] bg-[#22C55E]/10",
  admin_deduct_balance: "text-[#EF4444] bg-[#EF4444]/10",
  plan_archived: "text-[#F59E0B] bg-[#F59E0B]/10",
  announcement_created: "text-[#0066FF] bg-[#0066FF]/10",
};

function getEventColor(event: string): string {
  return EVENT_COLORS[event] ?? "text-[#6A82A0] bg-[#EEF2F8]";
}

function exportCsv(logs: AuditLogEntry[]) {
  const headers = ["Timestamp", "Event", "Admin", "Target User", "IP", "Detail"];
  const rows = logs.map(l => [
    new Date(l.timestamp).toISOString(),
    l.event,
    l.adminTraderId ?? l.adminId ?? "",
    l.targetUser ?? "",
    l.ip ?? "",
    l.detail ? JSON.stringify(l.detail) : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: logs, refetch, isFetching } = useAdminGetAuditLogs({
    search: search || undefined,
    action: action !== "all" ? action : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#6A82A0]" />
          <h2 className="font-bold text-[#0F1923]">Audit Log</h2>
          <span className="text-xs font-mono text-[#6A82A0] uppercase">({logs?.length ?? 0} events)</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-[#EEF2F8] text-[#6A82A0] gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {logs && logs.length > 0 && (
            <Button size="sm" variant="outline" className="border-[#EEF2F8] text-[#0066FF] gap-1.5" onClick={() => exportCsv(logs)}>
              <Download className="h-3.5 w-3.5" />Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A82A0]" />
          <Input
            placeholder="Search events, users, IPs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#EEF2F8] text-[#0F1923] text-sm"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48 bg-white border-[#EEF2F8] text-sm"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {ACTION_OPTIONS.map(a => (
              <SelectItem key={a} value={a}>
                {a === "all" ? "All Actions" : a.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 bg-white border-[#EEF2F8] text-sm" placeholder="Start date" />
          <span className="text-[#6A82A0] text-sm">to</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 bg-white border-[#EEF2F8] text-sm" placeholder="End date" />
        </div>
        {(search || action !== "all" || startDate || endDate) && (
          <Button size="sm" variant="outline" className="border-[#EEF2F8] text-[#6A82A0]" onClick={() => { setSearch(""); setAction("all"); setStartDate(""); setEndDate(""); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Logs */}
      {!logs?.length ? (
        <div className="bg-white p-12 rounded-xl border border-[#EEF2F8] text-center shadow-sm">
          <ClipboardList className="h-8 w-8 text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-[#6A82A0] font-mono text-sm">No audit events found</p>
          <p className="text-[10px] text-[#94a3b8] mt-1">Events are stored in memory and reset on server restart</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F8]">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-[#F8FAFD]">
                    <td className="p-3 font-mono text-xs text-[#6A82A0] whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getEventColor(l.event)}`}>
                        {l.event.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-[#0F1923]">{l.adminTraderId ?? (l.adminId ? `#${l.adminId}` : "—")}</td>
                    <td className="p-3 font-mono text-xs text-[#0F1923]">{l.targetUser ?? "—"}</td>
                    <td className="p-3 font-mono text-xs text-[#6A82A0]">{l.ip ?? "—"}</td>
                    <td className="p-3 font-mono text-[10px] text-[#6A82A0] max-w-[200px] truncate">
                      {l.detail ? JSON.stringify(l.detail) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {logs.map(l => (
              <div key={l.id} className="bg-white rounded-xl border border-[#EEF2F8] p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getEventColor(l.event)}`}>
                    {l.event.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono text-[#6A82A0]">{new Date(l.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div><span className="text-[#6A82A0]">Admin: </span><span className="text-[#0F1923]">{l.adminTraderId ?? "—"}</span></div>
                  <div><span className="text-[#6A82A0]">Target: </span><span className="text-[#0F1923]">{l.targetUser ?? "—"}</span></div>
                  <div><span className="text-[#6A82A0]">IP: </span><span className="text-[#0F1923]">{l.ip ?? "—"}</span></div>
                  <div className="text-[#6A82A0]">{new Date(l.timestamp).toLocaleDateString()}</div>
                </div>
                {l.detail && (
                  <p className="text-[10px] font-mono text-[#94a3b8] mt-1 truncate">{JSON.stringify(l.detail)}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
