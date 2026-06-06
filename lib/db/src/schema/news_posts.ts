import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const newsPostsTable = pgTable("news_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  coverImage: text("cover_image"),
  category: text("category").notNull().default("general"),
  author: text("author").notNull().default("TradeBox"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type NewsPost = typeof newsPostsTable.$inferSelect;
