import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cargoTypeEnum = pgEnum("cargo_type", ["electronics", "cocoa", "lithium", "coffee", "textiles", "pharmaceuticals", "cotton", "steel"]);
export const riskGradeEnum = pgEnum("risk_grade", ["A", "B", "C", "D"]);
export const shipmentStatusEnum = pgEnum("shipment_status", ["open", "funded", "in_transit", "delivered"]);

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  cargoType: cargoTypeEnum("cargo_type").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  originCoords: text("origin_coords"),
  destinationCoords: text("destination_coords"),
  profitPercent: numeric("profit_percent", { precision: 5, scale: 2 }).notNull(),
  riskGrade: riskGradeEnum("risk_grade").notNull(),
  fundingGoal: numeric("funding_goal", { precision: 18, scale: 2 }).notNull(),
  fundingRaised: numeric("funding_raised", { precision: 18, scale: 2 }).notNull().default("0"),
  minInvestment: numeric("min_investment", { precision: 18, scale: 2 }).notNull(),
  departureDate: timestamp("departure_date", { withTimezone: true }).notNull(),
  arrivalDate: timestamp("arrival_date", { withTimezone: true }).notNull(),
  transitDays: integer("transit_days").notNull(),
  status: shipmentStatusEnum("status").notNull().default("open"),
  freightForwarder: text("freight_forwarder").notNull(),
  vesselName: text("vessel_name").notNull(),
  hsCode: text("hs_code"),
  weightTons: numeric("weight_tons", { precision: 10, scale: 2 }),
  volumeCbm: numeric("volume_cbm", { precision: 10, scale: 2 }),
  description: text("description"),
  isFeatured: integer("is_featured").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
