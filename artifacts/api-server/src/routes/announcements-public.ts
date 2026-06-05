import { Router } from "express";
import { db, announcementsTable } from "@workspace/db";

const router = Router();

// ── In-memory view & dismiss tracking ────────────────────────────────────────
// Keyed by announcementId → Set of userId strings (or "anon:<ip>")
const viewedBy  = new Map<number, Set<string>>();
const dismissedBy = new Map<number, Set<string>>();

export function recordView(announcementId: number, uid: string) {
  if (!viewedBy.has(announcementId)) viewedBy.set(announcementId, new Set());
  viewedBy.get(announcementId)!.add(uid);
}

export function recordDismiss(announcementId: number, uid: string) {
  if (!dismissedBy.has(announcementId)) dismissedBy.set(announcementId, new Set());
  dismissedBy.get(announcementId)!.add(uid);
}

export function getAnnouncementStats(id: number) {
  return {
    views: viewedBy.get(id)?.size ?? 0,
    dismissals: dismissedBy.get(id)?.size ?? 0,
  };
}

// ── Public announcements list ─────────────────────────────────────────────────
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
    scheduledAt: a.scheduledAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  })));
});

// ── Record a view ────────────────────────────────────────────────────────────
router.post("/:id/view", (req, res) => {
  const id = parseInt(req.params.id);
  const uid = (req as any).user?.userId
    ? String((req as any).user.userId)
    : `anon:${req.ip}`;
  recordView(id, uid);
  res.json({ ok: true });
});

// ── Record a dismiss ─────────────────────────────────────────────────────────
router.post("/:id/dismiss", (req, res) => {
  const id = parseInt(req.params.id);
  const uid = (req as any).user?.userId
    ? String((req as any).user.userId)
    : `anon:${req.ip}`;
  recordDismiss(id, uid);
  res.json({ ok: true });
});

export default router;
