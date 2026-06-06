import { logger } from "./logger";

export type AuditEvent =
  | "login_success"
  | "login_failure"
  | "logout"
  | "register_success"
  | "register_failure"
  | "password_change_success"
  | "password_change_failure"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_login_complete"
  | "2fa_login_failure"
  | "withdrawal_created"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "deposit_approved"
  | "deposit_rejected"
  | "kyc_approved"
  | "kyc_rejected"
  | "admin_credit_profit"
  | "user_suspended"
  | "user_unsuspended"
  | "user_banned"
  | "admin_reset_password"
  | "admin_force_logout"
  | "user_promoted"
  | "user_demoted"
  | "admin_add_balance"
  | "admin_deduct_balance"
  | "admin_add_commission"
  | "settings_updated"
  | "plan_featured_toggled"
  | "plan_activated"
  | "plan_deactivated"
  | "plan_edited"
  | "plan_duplicated"
  | "plan_archived"
  | "plan_unarchived"
  | "announcement_created"
  | "announcement_updated"
  | "announcement_deleted"
  | "branding_uploaded"
  | "shipment_stage_override"
  | "shipment_stage_override_cleared"
  | "shipment_dates_override"
  | "shipment_custom_event"
  | "shipment_paused"
  | "shipment_resumed"
  | "shipment_force_delivered"
  | "guild_commission_paid"
  | "cron_auto_delivery"
  | "news_post_created"
  | "news_post_updated"
  | "news_post_duplicated"
  | "news_post_archived";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: AuditEvent;
  adminId?: number;
  adminTraderId?: string;
  targetUser?: string;
  ip?: string;
  detail?: Record<string, unknown>;
}

interface AuditContext {
  event: AuditEvent;
  userId?: number;
  traderId?: string;
  ip?: string;
  userAgent?: string;
  detail?: Record<string, unknown>;
}

const MAX_LOG_SIZE = 500;
const auditStore: AuditLogEntry[] = [];

export function audit(ctx: AuditContext): void {
  logger.info({ audit: true, ...ctx }, `AUDIT: ${ctx.event}`);
  const entry: AuditLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    event: ctx.event,
    adminId: ctx.userId,
    targetUser: ctx.detail?.targetUser as string | undefined,
    ip: ctx.ip,
    detail: ctx.detail,
  };
  auditStore.push(entry);
  if (auditStore.length > MAX_LOG_SIZE) auditStore.shift();
}

export function getAuditLog(): AuditLogEntry[] {
  return [...auditStore].reverse();
}

export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? "unknown";
}
