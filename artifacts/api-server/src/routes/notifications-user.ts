import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const rows = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(60);

  res.json(rows.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    shipmentId: n.shipmentId ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const rows = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ count: rows.length });
});

router.post("/read-all", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ success: true });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const id = parseInt(req.params.id as string);
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
