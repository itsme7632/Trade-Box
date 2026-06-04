import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("banner"),
  targetAudience: text("target_audience").notNull().default("all"),
  isActive: boolean("is_active").notNull().default(true),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Announcement = typeof announcementsTable.$inferSelect;
