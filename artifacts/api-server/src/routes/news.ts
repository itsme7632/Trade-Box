import { Router } from "express";
import { db } from "@workspace/db";
import { newsPostsTable } from "@workspace/db/schema";
import { eq, desc, and, lte, or, isNull, sql } from "drizzle-orm";

const router = Router();

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
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const publishedCondition = () =>
  and(
    eq(newsPostsTable.status, "published"),
    or(isNull(newsPostsTable.scheduledAt), lte(newsPostsTable.scheduledAt, new Date())),
  );

router.get("/", async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const cond = category && category !== "all"
    ? and(publishedCondition(), eq(newsPostsTable.category, category))
    : publishedCondition();
  const rows = await db
    .select()
    .from(newsPostsTable)
    .where(cond)
    .orderBy(desc(newsPostsTable.isPinned), desc(newsPostsTable.publishedAt));
  res.json(rows.map(serializePost));
});

router.get("/featured", async (_req, res) => {
  const rows = await db
    .select()
    .from(newsPostsTable)
    .where(and(publishedCondition(), eq(newsPostsTable.isFeatured, true)))
    .orderBy(desc(newsPostsTable.publishedAt))
    .limit(3);
  res.json(rows.map(serializePost));
});

router.get("/latest", async (_req, res) => {
  const rows = await db
    .select()
    .from(newsPostsTable)
    .where(publishedCondition())
    .orderBy(desc(newsPostsTable.publishedAt))
    .limit(3);
  res.json(rows.map(serializePost));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(newsPostsTable).where(eq(newsPostsTable.id, id));
  if (!row || row.status !== "published") { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializePost(row));
});

router.post("/:id/view", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!isNaN(id)) {
    await db
      .update(newsPostsTable)
      .set({ viewCount: sql`${newsPostsTable.viewCount} + 1` })
      .where(eq(newsPostsTable.id, id));
  }
  res.json({ ok: true });
});

export default router;
