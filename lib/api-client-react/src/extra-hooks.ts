import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ── 2FA ────────────────────────────────────────────────────────────────────────

export interface TwoFaSetupResponse {
  secret: string;
  otpauth: string;
  qrCode: string;
}

export function useTwoFaSetup() {
  return useMutation({
    mutationFn: () =>
      customFetch<TwoFaSetupResponse>("/api/auth/2fa/setup", { method: "POST" }),
  });
}

export function useTwoFaVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ secret, token }: { secret: string; token: string }) =>
      customFetch<{ success: boolean; recoveryCodes: string[] }>("/api/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ secret, token }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/profile"] }),
  });
}

export function useTwoFaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ token }: { token: string }) =>
      customFetch<{ success: boolean }>("/api/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/profile"] }),
  });
}

export function useTwoFaComplete() {
  return useMutation({
    mutationFn: ({ tempToken, token }: { tempToken: string; token: string }) =>
      customFetch<{ token: string; user: any }>("/api/auth/2fa/complete", {
        method: "POST",
        body: JSON.stringify({ tempToken, token }),
      }),
  });
}

// ── Password ────────────────────────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      customFetch<{ success: boolean }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  });
}

// ── Support Settings ───────────────────────────────────────────────────────────

export interface SupportSettings {
  telegramSupport: string | null;
  whatsappSupport: string | null;
  supportEmail: string | null;
  telegramGroup: string | null;
  whatsappCommunity: string | null;
  announcementChannel: string | null;
}

export function useGetSupportSettings() {
  return useQuery({
    queryKey: ["/api/support/settings"],
    queryFn: () => customFetch<SupportSettings>("/api/support/settings"),
  });
}

export function useUpdateSupportSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SupportSettings>) =>
      customFetch<SupportSettings>("/api/support/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support/settings"] }),
  });
}

// ── Support Tickets ────────────────────────────────────────────────────────────

export interface TicketReply {
  id: number;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  createdAt: string;
  updatedAt: string;
  user?: { email: string; traderId: string } | null;
  replies: TicketReply[];
}

export function useGetTickets() {
  return useQuery({
    queryKey: ["/api/support/tickets"],
    queryFn: () => customFetch<SupportTicket[]>("/api/support/tickets"),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, message }: { subject: string; message: string }) =>
      customFetch<SupportTicket>("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support/tickets"] }),
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: number; message: string }) =>
      customFetch<TicketReply>(`/api/support/tickets/${ticketId}/replies`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support/tickets"] }),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      customFetch<{ id: number; status: string }>(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support/tickets"] }),
  });
}

// ── Admin Control Center Hooks ─────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  traderId: string;
  role: string;
  status: string;
  kycStatus: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfits: number;
  totalInvested: number;
  totalCommissions: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  country: string | null;
  guildCode: string;
  referredBy: string | null;
  registrationIp: string | null;
  lastLoginIp: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  referralChain?: { traderId: string; guildCode: string }[];
  investments?: any[];
}

export interface PlatformSettings {
  id: number;
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  telegramLink: string | null;
  whatsappLink: string | null;
  registrationEnabled: boolean;
  requireKyc: boolean;
  referralsEnabled: boolean;
  minDeposit: number;
  minWithdrawal: number;
  withdrawalFeePercent: number;
  tier1Rate: number;
  tier2Rate: number;
  tier3Rate: number;
  maintenanceMode: boolean;
  sessionTimeoutDays: number;
  maxLoginAttempts: number;
  updatedAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  isActive: boolean;
  scheduledAt: string | null;
  expiresAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  views?: number;
  dismissals?: number;
  openRate?: number;
}

export interface AdminPlan {
  id: number;
  title: string;
  cargoType: string;
  origin: string;
  destination: string;
  profitPercent: number;
  riskGrade: string;
  fundingGoal: number;
  fundingRaised: number;
  minInvestment: number;
  departureDate: string;
  arrivalDate: string;
  transitDays: number;
  status: string;
  freightForwarder: string;
  vesselName: string;
  description: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  investorCount: number;
  investorVolume: number;
  createdAt: string;
}

export interface AdminAnalytics {
  users: { total: number; active: number; suspended: number; banned: number; registrationsToday: number };
  kyc: { pending: number; approved: number };
  financials: {
    totalDeposited: number; totalWithdrawn: number; totalProfitPaid: number;
    totalCommissionsPaid: number; depositsToday: number; withdrawalsToday: number;
  };
  pending: { deposits: number; withdrawals: number; kyc: number };
  shipments: { active: number; open: number };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  adminId?: number;
  adminTraderId?: string;
  targetUser?: string;
  ip?: string;
  detail?: Record<string, unknown>;
}

export function useAdminListUsersV2(params?: { search?: string; kycStatus?: string; status?: string; role?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.kycStatus) query.set("kycStatus", params.kycStatus);
  if (params?.status) query.set("status", params.status);
  if (params?.role) query.set("role", params.role);
  return useQuery({
    queryKey: ["/api/admin/users", params],
    queryFn: () => customFetch<AdminUser[]>(`/api/admin/users?${query.toString()}`),
  });
}

export function useAdminGetUserDetail(id: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", id],
    queryFn: () => customFetch<AdminUser>(`/api/admin/users/${id}`),
    enabled: id !== null,
  });
}

function makeUserAction(path: string) {
  return (id: number, body?: Record<string, unknown>) =>
    customFetch<{ success: boolean; [k: string]: unknown }>(`/api/admin/users/${id}/${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
}

export function useAdminSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => makeUserAction("suspend")(id, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => makeUserAction("unsuspend")(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => makeUserAction("ban")(id, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      makeUserAction("reset-password")(id, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminForceLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => makeUserAction("force-logout")(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminPromoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => makeUserAction("promote")(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminDemoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => makeUserAction("demote")(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminAddBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, note }: { id: number; amount: number; note?: string }) =>
      makeUserAction("add-balance")(id, { amount, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminDeductBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, note }: { id: number; amount: number; note?: string }) =>
      makeUserAction("deduct-balance")(id, { amount, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminAddCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, note }: { id: number; amount: number; note?: string }) =>
      makeUserAction("add-commission")(id, { amount, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useAdminGetSettings() {
  return useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => customFetch<PlatformSettings>("/api/admin/settings"),
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PlatformSettings>) =>
      customFetch<PlatformSettings>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
  });
}

export function useAdminGetPlans() {
  return useQuery({
    queryKey: ["/api/admin/plans"],
    queryFn: () => customFetch<AdminPlan[]>("/api/admin/plans"),
  });
}

export function useAdminTogglePlanFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ success: boolean; isFeatured: boolean }>(`/api/admin/plans/${id}/toggle-featured`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminActivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ success: boolean }>(`/api/admin/plans/${id}/activate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminDeactivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ success: boolean }>(`/api/admin/plans/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminEditPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<AdminPlan>) =>
      customFetch<AdminPlan>(`/api/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminDuplicatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<AdminPlan>(`/api/admin/plans/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminArchivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ success: boolean }>(`/api/admin/plans/${id}/archive`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plans"] }),
  });
}

export function useAdminGetAnnouncements() {
  return useQuery({
    queryKey: ["/api/admin/announcements"],
    queryFn: () => customFetch<Announcement[]>("/api/admin/announcements"),
  });
}

export function useAdminCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Announcement, "id" | "createdBy" | "createdAt" | "updatedAt">) =>
      customFetch<Announcement>("/api/admin/announcements", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });
}

export function useAdminUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<Announcement>) =>
      customFetch<Announcement>(`/api/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });
}

export function useAdminDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<{ success: boolean }>(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: () => customFetch<AdminAnalytics>("/api/admin/analytics"),
    refetchInterval: 30000,
  });
}

export function useAdminGetAuditLogs(params?: { search?: string; action?: string; startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.action) query.set("action", params.action);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  return useQuery({
    queryKey: ["/api/admin/audit-logs", params],
    queryFn: () => customFetch<AuditLogEntry[]>(`/api/admin/audit-logs?${query.toString()}`),
    refetchInterval: 15000,
  });
}

export function useAdminUploadBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileData, fileName, type }: { fileData: string; fileName: string; type: "logo" | "favicon" }) =>
      customFetch<{ url: string; settingKey: string }>("/api/admin/upload/branding", {
        method: "POST",
        body: JSON.stringify({ fileData, fileName, type }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
  });
}

export function usePublicAnnouncements() {
  return useQuery({
    queryKey: ["/api/announcements"],
    queryFn: () => customFetch<{ id: number; title: string; message: string; type: string; targetAudience: string; scheduledAt: string | null; expiresAt: string | null; createdAt: string }[]>("/api/announcements"),
    refetchInterval: 60000,
  });
}
