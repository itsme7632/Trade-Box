import { pgTable, text, serial, timestamp, numeric, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["none", "pending", "approved", "rejected"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  traderId: text("trader_id").notNull().unique(),
  guildCode: text("guild_code").notNull().unique(),
  referredBy: text("referred_by"),
  role: userRoleEnum("role").notNull().default("user"),
  status: text("status").notNull().default("active"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("none"),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  totalDeposited: numeric("total_deposited", { precision: 18, scale: 2 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 18, scale: 2 }).notNull().default("0"),
  totalProfits: numeric("total_profits", { precision: 18, scale: 2 }).notNull().default("0"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username").unique(),
  country: text("country"),
  telegramHandle: text("telegram_handle"),
  whatsappNumber: text("whatsapp_number"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorRecoveryCodes: text("two_factor_recovery_codes"),
  walletAddressBtc: text("wallet_address_btc"),
  walletAddressEth: text("wallet_address_eth"),
  walletAddressUsdt: text("wallet_address_usdt"),
  walletAddressBnb: text("wallet_address_bnb"),
  registrationIp: text("registration_ip"),
  lastLoginIp: text("last_login_ip"),
  sessionVersion: integer("session_version").notNull().default(0),
  darkMode: boolean("dark_mode").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
