import { Router } from "express";
import { db, investmentsTable, shipmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function formatInvestment(inv: typeof investmentsTable.$inferSelect, shipment?: typeof shipmentsTable.$inferSelect) {
  return {
    id: inv.id,
    shipmentId: inv.shipmentId,
    shipment: shipment ? {
      id: shipment.id,
      title: shipment.title,
      cargoType: shipment.cargoType,
      origin: shipment.origin,
      destination: shipment.destination,
      originCoords: shipment.originCoords ?? null,
      destinationCoords: shipment.destinationCoords ?? null,
      profitPercent: Number(shipment.profitPercent),
      riskGrade: shipment.riskGrade,
      fundingGoal: Number(shipment.fundingGoal),
      fundingRaised: Number(shipment.fundingRaised),
      minInvestment: Number(shipment.minInvestment),
      departureDate: shipment.departureDate.toISOString(),
      arrivalDate: shipment.arrivalDate.toISOString(),
      transitDays: shipment.transitDays,
      status: shipment.status,
      freightForwarder: shipment.freightForwarder,
      vesselName: shipment.vesselName,
      createdAt: shipment.createdAt.toISOString(),
    } : undefined,
    amount: Number(inv.amount),
    profitPercent: Number(inv.profitPercent),
    expectedProfit: Number(inv.expectedProfit),
    actualProfit: inv.actualProfit ? Number(inv.actualProfit) : null,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    deliveredAt: inv.deliveredAt ? inv.deliveredAt.toISOString() : null,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const { status } = req.query as Record<string, string>;

  const conditions: ReturnType<typeof eq>[] = [eq(investmentsTable.userId, userId)];
  if (status && status !== "all") {
    conditions.push(eq(investmentsTable.status, status as typeof investmentsTable.$inferSelect["status"]));
  }

  const investments = await db.select().from(investmentsTable).where(and(...conditions));

  const shipmentIds = [...new Set(investments.map((i) => i.shipmentId))];
  const shipments = shipmentIds.length > 0
    ? await db.select().from(shipmentsTable).where(
        eq(shipmentsTable.id, shipmentIds[0])
      )
    : [];

  // For simplicity, fetch all shipments for the user's investments
  const shipmentMap = new Map<number, typeof shipmentsTable.$inferSelect>();
  for (const id of shipmentIds) {
    const [s] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
    if (s) shipmentMap.set(id, s);
  }

  res.json(investments.map((inv) => formatInvestment(inv, shipmentMap.get(inv.shipmentId))));
});

router.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const id = parseInt(req.params.id);

  const [inv] = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId)))
    .limit(1);
  if (!inv) {
    res.status(404).json({ error: "Investment not found" });
    return;
  }
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, inv.shipmentId)).limit(1);
  res.json(formatInvestment(inv, shipment));
});

export default router;
