import { pgTable, serial, timestamp, numeric, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const txTypeEnum = pgEnum("tx_type", ["deposit", "withdrawal", "delivery_profit", "guild_commission"]);
export const txStatusEnum = pgEnum("tx_status", ["cleared", "in_transit", "reviewing", "rejected"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: txTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  status: txStatusEnum("status").notNull().default("reviewing"),
  description: text("description"),
  txid: text("txid"),
  coin: text("coin"),
  walletAddress: text("wallet_address"),
  proofUrl: text("proof_url"),
  relatedUserId: integer("related_user_id"),
  shipmentId: integer("shipment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
