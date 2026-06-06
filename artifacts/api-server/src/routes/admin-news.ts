import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { newsPostsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { audit } from "../lib/audit";
import { getIO } from "../lib/socket";
import { notificationsTable, usersTable } from "@workspace/db/schema";

const router = Router();
router.use(requireAuth, requireAdmin);

const PostBody = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  category: z.enum(["platform_update","new_shipment","maintenance","feature_release","security_alert","promotion","partnership","general"]).default("general"),
  author: z.string().max(100).default("TradeBox"),
  isPinned: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft","published","archived"]).default("draft"),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

function serializePost(p: typeof newsPostsTable.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    summary: p.summary ?? null,
    content: p.content ?? null,
    coverImage: p.coverImage ?? null,
    category: p.category,
    author: p.author,
    isPinned: p.isPinned,
    isFeatured: p.isFeatured,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    viewCount: p.viewCount,
    createdBy: p.createdBy ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function notifyUsersOfPost(post: typeof newsPostsTable.$inferSelect) {
  try {
    const categoryLabel: Record<string, string> = {
      platform_update: "platform update",
      new_shipment: "new shipment opportunity",
      maintenance: "maintenance notice",
      feature_release: "feature release",
      security_alert: "security alert",
      promotion: "promotion",
      partnership: "partnership announcement",
      general: "news update",
    };
    const label = categoryLabel[post.category] ?? "news update";
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "user"));
    if (!users.length) return;
    const rows = users.map(u => ({
      userId: u.id,
      type: "news_post" as const,
      title: `TradeBox posted a new ${label}`,
      message: post.summary ?? post.title,
      link: `/news/${post.id}`,
      isRead: false,
    }));
    await db.insert(notificationsTable).values(rows as any);
    const io = getIO();
    if (io) {
      for (const u of users) {
        io.to(`user:${u.id}`).emit("notification:new", {
          type: "news_post",
          title: `TradeBox posted a new ${label}`,
          message: post.summary ?? post.title,
          link: `/news/${post.id}`,
        });
      }
    }
  } catch (err) {
    console.error("[admin-news] notify error", err);
  }
}

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(newsPostsTable)
    .orderBy(desc(newsPostsTable.createdAt));
  res.json(rows.map(serializePost));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(newsPostsTable).where(eq(newsPostsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializePost(row));
});

router.post("/", async (req, res) => {
  const adminId = (req as any).user.userId;
  const parsed = PostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const wasPublished = d.status === "published";
  const [row] = await db.insert(newsPostsTable).values({
    title: d.title,
    summary: d.summary ?? null,
    content: d.content ?? null,
    coverImage: d.coverImage ?? null,
    category: d.category,
    author: d.author,
    isPinned: d.isPinned,
    isFeatured: d.isFeatured,
    status: d.status,
    publishedAt: wasPublished ? (d.publishedAt ? new Date(d.publishedAt) : new Date()) : (d.publishedAt ? new Date(d.publishedAt) : null),
    scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
    createdBy: adminId,
  }).returning();
  audit({ event: "news_post_created", userId: adminId, detail: { id: row.id, title: row.title, status: row.status } });
  if (wasPublished) {
    await notifyUsersOfPost(row);
  }
  res.status(201).json(serializePost(row));
});

router.patch("/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(newsPostsTable).where(eq(newsPostsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = PostBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.title !== undefined) updates.title = d.title;
  if (d.summary !== undefined) updates.summary = d.summary;
  if (d.content !== undefined) updates.content = d.content;
  if (d.coverImage !== undefined) updates.coverImage = d.coverImage;
  if (d.category !== undefined) updates.category = d.category;
  if (d.author !== undefined) updates.author = d.author;
  if (d.isPinned !== undefined) updates.isPinned = d.isPinned;
  if (d.isFeatured !== undefined) updates.isFeatured = d.isFeatured;
  if (d.scheduledAt !== undefined) updates.scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
  const wasJustPublished = d.status === "published" && existing.status !== "published";
  if (d.status !== undefined) {
    updates.status = d.status;
    if (wasJustPublished) updates.publishedAt = new Date();
  }
  if (d.publishedAt !== undefined) updates.publishedAt = d.publishedAt ? new Date(d.publishedAt) : null;
  const [row] = await db.update(newsPostsTable).set(updates).where(eq(newsPostsTable.id, id)).returning();
  audit({ event: "news_post_updated", userId: adminId, detail: { id, changes: Object.keys(updates) } });
  if (wasJustPublished) {
    await notifyUsersOfPost(row);
  }
  res.json(serializePost(row));
});

router.post("/:id/duplicate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [src] = await db.select().from(newsPostsTable).where(eq(newsPostsTable.id, id));
  if (!src) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db.insert(newsPostsTable).values({
    title: `${src.title} (Copy)`,
    summary: src.summary,
    content: src.content,
    coverImage: src.coverImage,
    category: src.category,
    author: src.author,
    isPinned: false,
    isFeatured: false,
    status: "draft",
    publishedAt: null,
    scheduledAt: null,
    createdBy: adminId,
  }).returning();
  audit({ event: "news_post_duplicated", userId: adminId, detail: { sourceId: id, newId: row.id } });
  res.status(201).json(serializePost(row));
});

router.delete("/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(newsPostsTable).set({ status: "archived" }).where(eq(newsPostsTable.id, id));
  audit({ event: "news_post_archived", userId: adminId, detail: { id } });
  res.json({ success: true });
});

export default router;
