import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cryptoWalletsTable = pgTable("crypto_wallets", {
  id: serial("id").primaryKey(),
  coin: text("coin").notNull().unique(),
  address: text("address").notNull(),
  network: text("network").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCryptoWalletSchema = createInsertSchema(cryptoWalletsTable).omit({ id: true });
export type InsertCryptoWallet = z.infer<typeof insertCryptoWalletSchema>;
export type CryptoWallet = typeof cryptoWalletsTable.$inferSelect;
