import { Router } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const now = new Date();
  const rows = await db.select().from(announcementsTable);
  const active = rows.filter(a => {
    if (!a.isActive) return false;
    if (a.scheduledAt && a.scheduledAt > now) return false;
    if (a.expiresAt && a.expiresAt < now) return false;
    return true;
  });
  res.json(active.map(a => ({
    id: a.id,
    title: a.title,
    message: a.message,
    type: a.type,
    targetAudience: a.targetAudience,
    expiresAt: a.expiresAt?.toISOString() ?? null,
  })));
});

export default router;
