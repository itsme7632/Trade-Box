import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portEventTypeEnum = pgEnum("port_event_type", ["arrival", "departure"]);

export const portActivityTable = pgTable("port_activity", {
  id: serial("id").primaryKey(),
  portName: text("port_name").notNull(),
  country: text("country").notNull(),
  eventType: portEventTypeEnum("event_type").notNull(),
  vesselName: text("vessel_name").notNull(),
  cargoType: text("cargo_type"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPortActivitySchema = createInsertSchema(portActivityTable).omit({ id: true });
export type InsertPortActivity = z.infer<typeof insertPortActivitySchema>;
export type PortActivity = typeof portActivityTable.$inferSelect;
