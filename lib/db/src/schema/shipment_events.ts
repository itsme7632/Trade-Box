import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const shipmentEventsTable = pgTable("shipment_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  adminId: integer("admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShipmentEvent = typeof shipmentEventsTable.$inferSelect;
