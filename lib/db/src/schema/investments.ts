import { pgTable, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { shipmentsTable } from "./shipments";

export const investmentStatusEnum = pgEnum("investment_status", ["active", "delivered", "cancelled"]);

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  profitPercent: numeric("profit_percent", { precision: 5, scale: 2 }).notNull(),
  expectedProfit: numeric("expected_profit", { precision: 18, scale: 2 }).notNull(),
  actualProfit: numeric("actual_profit", { precision: 18, scale: 2 }),
  status: investmentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({ id: true, createdAt: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;
