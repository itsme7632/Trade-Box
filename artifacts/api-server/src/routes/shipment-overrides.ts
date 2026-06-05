import { Router } from "express";
import { db, shipmentsTable, investmentsTable, usersTable, transactionsTable, notificationsTable, shipmentEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import { audit } from "../lib/audit";
import { getIO } from "../lib/socket";
import { processGuildCommissions } from "../lib/commission";

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function notifyInvestors(
  shipmentId: number,
  title: string,
  message: string,
  type: string,
) {
  const investments = await db.select().from(investmentsTable)
    .where(eq(investmentsTable.shipmentId, shipmentId));
  const userIds = [...new Set(investments.map(i => i.userId))];
  for (const uid of userIds) {
    await db.insert(notificationsTable).values({ userId: uid, title, message, type, shipmentId });
  }
  return userIds;
}

function broadcastStageChange(shipmentId: number, payload: Record<string, unknown>) {
  const io = getIO();
  if (io) {
    io.emit("shipment:stage_changed", { shipmentId, ...payload });
    io.emit("notification:new", { shipmentId });
  }
}

const STAGE_LABELS: Record<string, string> = {
  booked: "Booked", loaded: "Loaded", departed: "Departed",
  at_sea: "At Sea", customs: "Customs", arrived: "Arrived", delivered: "Delivered",
};

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /admin/shipment-overrides/:id/detail
router.get("/:id/detail", async (req, res) => {
  const id = parseInt(req.params.id);
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Not found" }); return; }

  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.shipmentId, id));
  const events = await db.select().from(shipmentEventsTable)
    .where(eq(shipmentEventsTable.shipmentId, id));
  const sortedEvents = events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({
    id: shipment.id,
    title: shipment.title,
    status: shipment.status,
    stageOverride: shipment.stageOverride ?? null,
    pausedAt: shipment.pausedAt ? shipment.pausedAt.toISOString() : null,
    departureDate: shipment.departureDate.toISOString(),
    arrivalDate: shipment.arrivalDate.toISOString(),
    investorCount: investments.length,
    fundingRaised: Number(shipment.fundingRaised),
    fundingGoal: Number(shipment.fundingGoal),
    events: sortedEvents.map(e => ({
      id: e.id,
      eventType: e.eventType,
      title: e.title,
      description: e.description ?? null,
      adminId: e.adminId ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

// POST /admin/shipment-overrides/:id/stage
router.post("/:id/stage", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({ stage: z.string(), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { stage, note } = parsed.data;

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  const prevStage = shipment.stageOverride ?? "auto";
  await db.update(shipmentsTable).set({ stageOverride: stage }).where(eq(shipmentsTable.id, id));

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "stage_override",
    title: `Stage changed to ${STAGE_LABELS[stage] ?? stage}`,
    description: note || null,
    adminId,
  });

  const stageLabel = STAGE_LABELS[stage] ?? stage;
  await notifyInvestors(id,
    "Shipment Stage Update",
    `Your shipment "${shipment.title}" has moved to: ${stageLabel}.${note ? " " + note : ""}`,
    "shipment_update",
  );
  broadcastStageChange(id, { type: "stage_override", stage, prevStage });
  audit({ event: "shipment_stage_override", userId: adminId, detail: { shipmentId: id, stage, prevStage, note } });
  res.json({ success: true, stage });
});

// POST /admin/shipment-overrides/:id/clear-stage
router.post("/:id/clear-stage", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  await db.update(shipmentsTable).set({ stageOverride: null }).where(eq(shipmentsTable.id, id));

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "stage_override_cleared",
    title: "Stage override cleared — auto-calculated",
    adminId,
  });

  broadcastStageChange(id, { type: "stage_cleared" });
  audit({ event: "shipment_stage_override_cleared", userId: adminId, detail: { shipmentId: id } });
  res.json({ success: true });
});

// POST /admin/shipment-overrides/:id/dates
router.post("/:id/dates", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({
    departureDate: z.string().optional(),
    arrivalDate: z.string().optional(),
    note: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { departureDate, arrivalDate, note } = parsed.data;

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  const updates: Partial<typeof shipmentsTable.$inferInsert> = {};
  const depMs = departureDate ? new Date(departureDate).getTime() : shipment.departureDate.getTime();
  const arrMs = arrivalDate ? new Date(arrivalDate).getTime() : shipment.arrivalDate.getTime();

  if (departureDate) updates.departureDate = new Date(departureDate);
  if (arrivalDate) updates.arrivalDate = new Date(arrivalDate);
  updates.transitDays = Math.max(1, Math.ceil((arrMs - depMs) / 86_400_000));

  await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, id));

  const parts: string[] = [];
  if (departureDate) parts.push(`Departure: ${new Date(departureDate).toDateString()}`);
  if (arrivalDate) parts.push(`ETA: ${new Date(arrivalDate).toDateString()}`);
  if (note) parts.push(note);

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "date_override",
    title: "Schedule updated",
    description: parts.join(" | ") || null,
    adminId,
  });

  const etaMsg = arrivalDate ? ` New ETA: ${new Date(arrivalDate).toDateString()}.` : "";
  await notifyInvestors(id,
    "Schedule Updated",
    `Your shipment "${shipment.title}" schedule has been updated.${etaMsg}`,
    "shipment_update",
  );
  broadcastStageChange(id, { type: "dates_updated" });
  audit({ event: "shipment_dates_override", userId: adminId, detail: { shipmentId: id, departureDate, arrivalDate, note } });
  res.json({ success: true });
});

// POST /admin/shipment-overrides/:id/event
router.post("/:id/event", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({
    eventType: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { eventType, title, description } = parsed.data;

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  const [event] = await db.insert(shipmentEventsTable).values({
    shipmentId: id, eventType, title, description: description || null, adminId,
  }).returning();

  const msg = description ? `${title}: ${description}` : title;
  await notifyInvestors(id, title, `Update on "${shipment.title}": ${msg}`, "shipment_event");
  broadcastStageChange(id, { type: "event_added", eventType, title });
  audit({ event: "shipment_custom_event", userId: adminId, detail: { shipmentId: id, eventType, title } });
  res.json({ success: true, event });
});

// POST /admin/shipment-overrides/:id/pause
router.post("/:id/pause", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({ note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  if (shipment.pausedAt) { res.status(400).json({ error: "Shipment already paused" }); return; }

  await db.update(shipmentsTable).set({ pausedAt: new Date() }).where(eq(shipmentsTable.id, id));

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "paused",
    title: "Shipment paused",
    description: parsed.data.note || null,
    adminId,
  });

  await notifyInvestors(id,
    "Shipment Paused",
    `Your shipment "${shipment.title}" has been temporarily paused.${parsed.data.note ? " " + parsed.data.note : ""}`,
    "shipment_paused",
  );
  broadcastStageChange(id, { type: "paused" });
  audit({ event: "shipment_paused", userId: adminId, detail: { shipmentId: id, note: parsed.data.note } });
  res.json({ success: true });
});

// POST /admin/shipment-overrides/:id/resume
router.post("/:id/resume", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({ note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  if (!shipment.pausedAt) { res.status(400).json({ error: "Shipment is not paused" }); return; }

  await db.update(shipmentsTable).set({ pausedAt: null }).where(eq(shipmentsTable.id, id));

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "resumed",
    title: "Shipment resumed",
    description: parsed.data.note || null,
    adminId,
  });

  await notifyInvestors(id,
    "Shipment Resumed",
    `Your shipment "${shipment.title}" has resumed normal operations.`,
    "shipment_resumed",
  );
  broadcastStageChange(id, { type: "resumed" });
  audit({ event: "shipment_resumed", userId: adminId, detail: { shipmentId: id, note: parsed.data.note } });
  res.json({ success: true });
});

// POST /admin/shipment-overrides/:id/force-deliver
router.post("/:id/force-deliver", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = z.object({ note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  if (shipment.status === "delivered") { res.status(400).json({ error: "Already delivered" }); return; }

  await db.update(shipmentsTable)
    .set({ status: "delivered", stageOverride: null, pausedAt: null })
    .where(eq(shipmentsTable.id, id));

  const investments = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.shipmentId, id), eq(investmentsTable.status, "active")));

  for (const inv of investments) {
    const profit = Number(inv.expectedProfit);
    const total = Number(inv.amount) + profit;

    await db.update(investmentsTable).set({
      status: "delivered",
      actualProfit: String(profit),
      deliveredAt: new Date(),
    }).where(eq(investmentsTable.id, inv.id));

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${total}`,
      totalProfits: sql`${usersTable.totalProfits} + ${profit}`,
    }).where(eq(usersTable.id, inv.userId));

    await db.insert(transactionsTable).values({
      userId: inv.userId,
      type: "delivery_profit",
      amount: String(profit),
      status: "cleared",
      description: `Force-delivered profit: ${shipment.title}`,
      shipmentId: id,
    });

    const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
    if (investor) {
      await processGuildCommissions(inv.userId, investor.traderId, profit, id, shipment.title, adminId);
    }
  }

  await db.insert(shipmentEventsTable).values({
    shipmentId: id,
    eventType: "force_delivered",
    title: "Shipment force-delivered",
    description: `Profits credited to ${investments.length} investor(s).${parsed.data.note ? " " + parsed.data.note : ""}`,
    adminId,
  });

  await notifyInvestors(id,
    "Shipment Delivered! 🎉",
    `Your shipment "${shipment.title}" has been delivered. Profits have been credited to your wallet.`,
    "shipment_delivered",
  );

  const io = getIO();
  if (io) io.emit("shipment:delivered", { id, title: shipment.title, investorCount: investments.length });

  audit({ event: "shipment_force_delivered", userId: adminId, detail: { shipmentId: id, investorCount: investments.length } });
  res.json({ success: true, investorCount: investments.length });
});

export default router;
