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
  | "admin_credit_profit";

interface AuditContext {
  event: AuditEvent;
  userId?: number;
  traderId?: string;
  ip?: string;
  userAgent?: string;
  detail?: Record<string, unknown>;
}

export function audit(ctx: AuditContext): void {
  logger.info({ audit: true, ...ctx }, `AUDIT: ${ctx.event}`);
}

export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? "unknown";
}
