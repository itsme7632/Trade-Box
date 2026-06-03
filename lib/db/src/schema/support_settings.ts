import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const supportSettingsTable = pgTable("support_settings", {
  id: serial("id").primaryKey(),
  telegramSupport: text("telegram_support"),
  whatsappSupport: text("whatsapp_support"),
  supportEmail: text("support_email"),
  telegramGroup: text("telegram_group"),
  whatsappCommunity: text("whatsapp_community"),
  announcementChannel: text("announcement_channel"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SupportSettings = typeof supportSettingsTable.$inferSelect;
