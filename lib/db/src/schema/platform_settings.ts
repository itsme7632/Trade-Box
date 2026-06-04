import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("TradeBox"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  supportEmail: text("support_email"),
  telegramLink: text("telegram_link"),
  whatsappLink: text("whatsapp_link"),
  registrationEnabled: boolean("registration_enabled").notNull().default(true),
  requireKyc: boolean("require_kyc").notNull().default(false),
  referralsEnabled: boolean("referrals_enabled").notNull().default(true),
  minDeposit: numeric("min_deposit", { precision: 18, scale: 2 }).notNull().default("50"),
  minWithdrawal: numeric("min_withdrawal", { precision: 18, scale: 2 }).notNull().default("50"),
  withdrawalFeePercent: numeric("withdrawal_fee_percent", { precision: 5, scale: 2 }).notNull().default("1"),
  tier1Rate: numeric("tier1_rate", { precision: 5, scale: 2 }).notNull().default("7"),
  tier2Rate: numeric("tier2_rate", { precision: 5, scale: 2 }).notNull().default("2"),
  tier3Rate: numeric("tier3_rate", { precision: 5, scale: 2 }).notNull().default("1"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  sessionTimeoutDays: integer("session_timeout_days").notNull().default(30),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
