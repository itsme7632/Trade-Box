import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, ChevronDown, ChevronUp, Shield, ShieldOff, Ban, KeyRound,
  LogOut, Crown, UserMinus, PlusCircle, MinusCircle, Coins, Filter
} from "lucide-react";
import {
  useAdminListUsersV2, useAdminSuspendUser, useAdminUnsuspendUser, useAdminBanUser,
  useAdminResetPassword, useAdminForceLogout, useAdminPromoteUser, useAdminDemoteUser,
  useAdminAddBalance, useAdminDeductBalance, useAdminAddCommission, useAdminGetUserDetail,
  type AdminUser,
} from "@workspace/api-client-react/src/extra-hooks";

type ActionType = "suspend" | "unsuspend" | "ban" | "reset-password" | "force-logout" |
  "promote" | "demote" | "add-balance" | "deduct-balance" | "add-commission";

const statusColors: Record<string, string> = {
  active: "text-[#22C55E]",
  suspended: "text-[#F59E0B]",
  banned: "text-[#EF4444]",
};

const kycColors: Record<string, string> = {
  approved: "text-[#22C55E]",
  pending: "text-[#F59E0B]",
  rejected: "text-[#EF4444]",
  none: "text-[#6A82A0]",
};

export function AdminUsersV2() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionDialog, setActionDialog] = useState<{ user: AdminUser; type: ActionType } | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [actionNote, setActionNote] = useState("");

  const { data: users, refetch } = useAdminListUsersV2({
    search: search || undefined,
    kycStatus: kycFilter !== "all" ? kycFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });

  const { data: detailUser } = useAdminGetUserDetail(expandedId);

  const suspend = useAdminSuspendUser();
  const unsuspend = useAdminUnsuspendUser();
  const ban = useAdminBanUser();
  const resetPw = useAdminResetPassword();
  const forceLogout = useAdminForceLogout();
  const promote = useAdminPromoteUser();
  const demote = useAdminDemoteUser();
  const addBal = useAdminAddBalance();
  const deductBal = useAdminDeductBalance();
  const addComm = useAdminAddCommission();

  const handleAction = () => {
    if (!actionDialog) return;
    const { user, type } = actionDialog;
    const onDone = () => {
      toast({ title: "Done" });
      setActionDialog(null);
      setActionValue("");
      setActionNote("");
      refetch();
    };
    const onErr = (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" });

    if (type === "suspend") suspend.mutate({ id: user.id, reason: actionNote }, { onSuccess: onDone, onError: onErr });
    else if (type === "unsuspend") unsuspend.mutate({ id: user.id }, { onSuccess: onDone, onError: onErr });
    else if (type === "ban") ban.mutate({ id: user.id, reason: actionNote }, { onSuccess: onDone, onError: onErr });
    else if (type === "reset-password") resetPw.mutate({ id: user.id, newPassword: actionValue }, { onSuccess: onDone, onError: onErr });
    else if (type === "force-logout") forceLogout.mutate({ id: user.id }, { onSuccess: onDone, onError: onErr });
    else if (type === "promote") promote.mutate({ id: user.id }, { onSuccess: onDone, onError: onErr });
    else if (type === "demote") demote.mutate({ id: user.id }, { onSuccess: onDone, onError: onErr });
    else if (type === "add-balance") addBal.mutate({ id: user.id, amount: Number(actionValue), note: actionNote }, { onSuccess: onDone, onError: onErr });
    else if (type === "deduct-balance") deductBal.mutate({ id: user.id, amount: Number(actionValue), note: actionNote }, { onSuccess: onDone, onError: onErr });
    else if (type === "add-commission") addComm.mutate({ id: user.id, amount: Number(actionValue), note: actionNote }, { onSuccess: onDone, onError: onErr });
  };

  const openDialog = (user: AdminUser, type: ActionType) => {
    setActionDialog({ user, type });
    setActionValue("");
    setActionNote("");
  };

  const needsAmount = actionDialog && ["add-balance", "deduct-balance", "add-commission"].includes(actionDialog.type);
  const needsPassword = actionDialog?.type === "reset-password";
  const needsReason = actionDialog && ["suspend", "ban"].includes(actionDialog.type);
  const isDestructive = actionDialog && ["ban", "suspend", "demote", "force-logout"].includes(actionDialog.type);

  const actionLabels: Record<ActionType, string> = {
    suspend: "Suspend Account", unsuspend: "Unsuspend Account", ban: "Ban Account",
    "reset-password": "Reset Password", "force-logout": "Force Logout All Sessions",
    promote: "Promote to Admin", demote: "Remove Admin Role",
    "add-balance": "Add Balance", "deduct-balance": "Deduct Balance", "add-commission": "Add Commission",
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A82A0]" />
          <Input placeholder="Search traders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white border-[#EEF2F8] text-[#0F1923]" />
        </div>
        <Filter className="h-4 w-4 text-[#6A82A0] shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white border-[#EEF2F8] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-36 bg-white border-[#EEF2F8] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="none">No KYC</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 bg-white border-[#EEF2F8] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs font-mono text-[#6A82A0] uppercase">{users?.length ?? 0} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-3">Trader</th>
              <th className="p-3">Status</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Invested</th>
              <th className="p-3">Deposits</th>
              <th className="p-3">Withdrawn</th>
              <th className="p-3">Country</th>
              <th className="p-3">KYC</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {users?.map(u => (
              <>
                <tr key={u.id} className="hover:bg-[#F8FAFD] cursor-pointer" onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>
                  <td className="p-3">
                    <p className="font-bold font-mono text-[#0F1923] text-xs">{u.traderId}</p>
                    <p className="text-xs text-[#6A82A0] truncate max-w-[160px]">{u.email}</p>
                    {u.username && <p className="text-xs text-[#6A82A0]">@{u.username}</p>}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-mono font-bold uppercase ${statusColors[u.status] ?? "text-[#6A82A0]"}`}>{u.status}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-[#0066FF] text-xs">{u.balance.toLocaleString()} USDT</td>
                  <td className="p-3 font-mono text-xs text-[#0F1923]">{u.totalInvested.toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs text-[#22C55E]">{u.totalDeposited.toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs text-[#EF4444]">{u.totalWithdrawn.toLocaleString()}</td>
                  <td className="p-3 text-xs text-[#0F1923]">{u.country ?? "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs font-mono uppercase ${kycColors[u.kycStatus] ?? ""}`}>{u.kycStatus}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-mono uppercase font-bold ${u.role === "admin" ? "text-[#EF4444]" : "text-[#6A82A0]"}`}>{u.role}</span>
                  </td>
                  <td className="p-3 text-right">
                    {expandedId === u.id ? <ChevronUp className="h-4 w-4 ml-auto text-[#6A82A0]" /> : <ChevronDown className="h-4 w-4 ml-auto text-[#6A82A0]" />}
                  </td>
                </tr>
                {expandedId === u.id && (
                  <tr key={`${u.id}-detail`}>
                    <td colSpan={10} className="p-0 bg-[#F8FAFD] border-t border-[#EEF2F8]">
                      <div className="p-4 space-y-4">
                        {/* Info grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <InfoCell label="Registration IP" value={u.registrationIp ?? "—"} />
                          <InfoCell label="Last Login IP" value={u.lastLoginIp ?? "—"} />
                          <InfoCell label="Profit Earned" value={`${u.totalProfits.toLocaleString()} USDT`} />
                          <InfoCell label="Guild Commissions" value={`${u.totalCommissions.toLocaleString()} USDT`} />
                          <InfoCell label="Guild Code" value={u.guildCode} />
                          <InfoCell label="Referred By" value={u.referredBy ?? "—"} />
                          <InfoCell label="2FA" value={u.twoFactorEnabled ? "Enabled" : "Disabled"} />
                          <InfoCell label="Registered" value={new Date(u.createdAt).toLocaleDateString()} />
                        </div>

                        {/* Referral chain from detail */}
                        {detailUser?.referralChain && detailUser.referralChain.length > 0 && (
                          <div>
                            <p className="text-xs font-mono text-[#6A82A0] uppercase mb-1">Referral Chain (upward)</p>
                            <div className="flex gap-2 flex-wrap">
                              {detailUser.referralChain.map((r, i) => (
                                <span key={r.guildCode} className="text-xs bg-[#EEF2F8] text-[#0F1923] px-2 py-1 rounded font-mono">
                                  T{i + 1}: {r.traderId}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#EEF2F8]">
                          {u.status === "active" && (
                            <ActionBtn icon={<Shield className="h-3 w-3" />} label="Suspend" color="amber" onClick={() => openDialog(u, "suspend")} />
                          )}
                          {u.status === "suspended" && (
                            <ActionBtn icon={<ShieldOff className="h-3 w-3" />} label="Unsuspend" color="green" onClick={() => openDialog(u, "unsuspend")} />
                          )}
                          {u.status !== "banned" && (
                            <ActionBtn icon={<Ban className="h-3 w-3" />} label="Ban" color="red" onClick={() => openDialog(u, "ban")} />
                          )}
                          <ActionBtn icon={<KeyRound className="h-3 w-3" />} label="Reset PW" color="blue" onClick={() => openDialog(u, "reset-password")} />
                          <ActionBtn icon={<LogOut className="h-3 w-3" />} label="Force Logout" color="amber" onClick={() => openDialog(u, "force-logout")} />
                          {u.role === "user" ? (
                            <ActionBtn icon={<Crown className="h-3 w-3" />} label="Promote" color="blue" onClick={() => openDialog(u, "promote")} />
                          ) : (
                            <ActionBtn icon={<UserMinus className="h-3 w-3" />} label="Demote" color="red" onClick={() => openDialog(u, "demote")} />
                          )}
                          <ActionBtn icon={<PlusCircle className="h-3 w-3" />} label="Add Balance" color="green" onClick={() => openDialog(u, "add-balance")} />
                          <ActionBtn icon={<MinusCircle className="h-3 w-3" />} label="Deduct Balance" color="red" onClick={() => openDialog(u, "deduct-balance")} />
                          <ActionBtn icon={<Coins className="h-3 w-3" />} label="Add Commission" color="blue" onClick={() => openDialog(u, "add-commission")} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {!users?.length && (
          <div className="p-12 text-center text-[#6A82A0] font-mono text-sm">No users found</div>
        )}
      </div>

      {/* Action Dialog */}
      {actionDialog && (
        <Dialog open onOpenChange={() => setActionDialog(null)}>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8]">
            <DialogHeader>
              <DialogTitle className={isDestructive ? "text-[#EF4444]" : "text-[#0F1923]"}>
                {actionLabels[actionDialog.type]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-[#6A82A0]">
                Target: <span className="font-mono font-bold text-[#0F1923]">{actionDialog.user.traderId}</span> ({actionDialog.user.email})
              </p>
              {needsPassword && (
                <Input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={actionValue}
                  onChange={e => setActionValue(e.target.value)}
                  className="bg-[#F8FAFD] border-[#EEF2F8]"
                />
              )}
              {needsAmount && (
                <Input
                  type="number"
                  placeholder="Amount (USDT)"
                  value={actionValue}
                  onChange={e => setActionValue(e.target.value)}
                  className="bg-[#F8FAFD] border-[#EEF2F8]"
                />
              )}
              {(needsReason || needsAmount) && (
                <Input
                  placeholder={needsReason ? "Reason (required)" : "Note (optional)"}
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  className="bg-[#F8FAFD] border-[#EEF2F8]"
                />
              )}
              {!needsPassword && !needsAmount && !needsReason && (
                <p className="text-sm text-[#6A82A0]">Are you sure you want to proceed?</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                className={isDestructive ? "bg-[#EF4444] hover:bg-[#dc2626] text-white" : "bg-[#0066FF] hover:bg-[#0052CC] text-white"}
                onClick={handleAction}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-0.5">{label}</p>
      <p className="text-xs font-mono text-[#0F1923] break-all">{value}</p>
    </div>
  );
}

const colorMap: Record<string, string> = {
  green: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E] hover:text-white",
  red: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444] hover:text-white",
  amber: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 hover:bg-[#F59E0B] hover:text-white",
  blue: "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20 hover:bg-[#0066FF] hover:text-white",
};

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className={`gap-1 text-xs ${colorMap[color]}`} onClick={e => { e.stopPropagation(); onClick(); }}>
      {icon}{label}
    </Button>
  );
}
