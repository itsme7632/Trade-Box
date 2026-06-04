import { Router } from "express";
import { db, usersTable, supportSettingsTable, supportTicketsTable, ticketRepliesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { supportTicketLimiter } from "../lib/rate-limiters";
import { z } from "zod";

const SupportSettingsPatchBody = z.object({
  telegramSupport: z.string().optional(),
  whatsappSupport: z.string().optional(),
  supportEmail: z.string().email().optional(),
  telegramGroup: z.string().optional(),
  whatsappCommunity: z.string().optional(),
  announcementChannel: z.string().optional(),
});

const CreateTicketBody = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

const UpdateTicketStatusBody = z.object({
  status: z.enum(["open", "in_progress", "closed"]),
});

const ReplyBody = z.object({
  message: z.string().min(1, "Message is required"),
});

const router = Router();

router.get("/settings", async (_req, res) => {
  const [settings] = await db.select().from(supportSettingsTable).limit(1);
  res.json(settings ?? {
    telegramSupport: null, whatsappSupport: null, supportEmail: null,
    telegramGroup: null, whatsappCommunity: null, announcementChannel: null,
  });
});

router.patch("/settings", requireAuth, requireAdmin, async (req, res) => {
  const parsed = SupportSettingsPatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { telegramSupport, whatsappSupport, supportEmail, telegramGroup, whatsappCommunity, announcementChannel } = parsed.data;

  const existing = await db.select().from(supportSettingsTable).limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(supportSettingsTable).values({
      telegramSupport, whatsappSupport, supportEmail, telegramGroup, whatsappCommunity, announcementChannel,
    }).returning();
    res.json(row);
  } else {
    const updates: any = {};
    if (telegramSupport !== undefined) updates.telegramSupport = telegramSupport;
    if (whatsappSupport !== undefined) updates.whatsappSupport = whatsappSupport;
    if (supportEmail !== undefined) updates.supportEmail = supportEmail;
    if (telegramGroup !== undefined) updates.telegramGroup = telegramGroup;
    if (whatsappCommunity !== undefined) updates.whatsappCommunity = whatsappCommunity;
    if (announcementChannel !== undefined) updates.announcementChannel = announcementChannel;
    const [row] = await db.update(supportSettingsTable).set(updates).where(eq(supportSettingsTable.id, existing[0].id)).returning();
    res.json(row);
  }
});

router.get("/tickets", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const role = (req as any).user.role;

  const tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));
  const result = [];

  for (const t of tickets) {
    if (role !== "admin" && t.userId !== userId) continue;
    const [user] = await db.select({ email: usersTable.email, traderId: usersTable.traderId }).from(usersTable).where(eq(usersTable.id, t.userId)).limit(1);
    const replies = await db.select().from(ticketRepliesTable).where(eq(ticketRepliesTable.ticketId, t.id)).orderBy(ticketRepliesTable.createdAt);
    result.push({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      user: user ? { email: user.email, traderId: user.traderId } : null,
      replies: replies.map(r => ({
        id: r.id,
        message: r.message,
        isAdmin: r.isAdmin === 1,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }

  res.json(result);
});

router.post("/tickets", requireAuth, supportTicketLimiter, async (req, res) => {
  const userId = (req as any).user.userId;
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { subject, message } = parsed.data;

  const [ticket] = await db.insert(supportTicketsTable).values({ userId, subject, message, status: "open" }).returning();
  res.status(201).json({ id: ticket.id, subject: ticket.subject, message: ticket.message, status: ticket.status, createdAt: ticket.createdAt.toISOString(), replies: [] });
});

router.get("/tickets/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const role = (req as any).user.role;
  const ticketId = Number(req.params.id);

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, ticketId)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (role !== "admin" && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const replies = await db.select().from(ticketRepliesTable).where(eq(ticketRepliesTable.ticketId, ticketId)).orderBy(ticketRepliesTable.createdAt);
  res.json({
    id: ticket.id, subject: ticket.subject, message: ticket.message, status: ticket.status,
    createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(),
    replies: replies.map(r => ({ id: r.id, message: r.message, isAdmin: r.isAdmin === 1, createdAt: r.createdAt.toISOString() })),
  });
});

router.post("/tickets/:id/replies", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const role = (req as any).user.role;
  const ticketId = Number(req.params.id);
  const replyParsed = ReplyBody.safeParse(req.body);
  if (!replyParsed.success) { res.status(400).json({ error: replyParsed.error.flatten() }); return; }
  const { message } = replyParsed.data;

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, ticketId)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (role !== "admin" && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [reply] = await db.insert(ticketRepliesTable).values({
    ticketId, userId, message, isAdmin: role === "admin" ? 1 : 0,
  }).returning();

  if (role === "admin" && ticket.status === "open") {
    await db.update(supportTicketsTable).set({ status: "in_progress" }).where(eq(supportTicketsTable.id, ticketId));
  }

  res.status(201).json({ id: reply.id, message: reply.message, isAdmin: reply.isAdmin === 1, createdAt: reply.createdAt.toISOString() });
});

router.patch("/tickets/:id", requireAuth, requireAdmin, async (req, res) => {
  const ticketId = Number(req.params.id);
  const parsed = UpdateTicketStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { status } = parsed.data;

  const [ticket] = await db.update(supportTicketsTable).set({ status }).where(eq(supportTicketsTable.id, ticketId)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json({ id: ticket.id, status: ticket.status });
});

export default router;
