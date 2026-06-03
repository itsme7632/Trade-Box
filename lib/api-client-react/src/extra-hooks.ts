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
