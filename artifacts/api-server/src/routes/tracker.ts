import { Router } from "express";
import { db, investmentsTable, shipmentsTable, portActivityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * Status-aware progress calculation — matches the UI state engine.
 * Never shows date-based progress for pre-departure shipments.
 */
function computeProgress(
  status: string,
  departure: number,
  arrival: number,
  now: number,
): number {
  if (status === "delivered") return 100;
  if (status === "open" || status === "funded") {
    return status === "funded" ? 15 : 5;
  }
  if (now < departure) return 5;

  const total = arrival - departure;
  const elapsed = now - departure;
  if (total <= 0) return 30;
  const ratio = Math.max(0, Math.min(1, elapsed / total));

  if (ratio >= 0.90) return 90;
  if (ratio >= 0.72) return Math.round(75 + ((ratio - 0.72) / (0.90 - 0.72)) * 14);
  if (ratio >= 0.10) return Math.round(50 + ((ratio - 0.10) / (0.72 - 0.10)) * 24);
  return Math.round(30 + (ratio / 0.10) * 19);
}

router.get("/my-shipments", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;

  const investments = await db.select().from(investmentsTable).where(
    and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active"))
  );

  const results = [];
  const now = Date.now();

  for (const inv of investments) {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, inv.shipmentId)).limit(1);
    if (!shipment) continue;

    const departure = shipment.departureDate.getTime();
    const arrival = shipment.arrivalDate.getTime();

    const progressPercent = computeProgress(shipment.status, departure, arrival, now);
    const etaDays = Math.max(Math.ceil((arrival - now) / (1000 * 60 * 60 * 24)), 0);

    results.push({
      id: inv.id,
      shipmentId: shipment.id,
      vesselName: shipment.vesselName,
      origin: shipment.origin,
      destination: shipment.destination,
      originCoords: shipment.originCoords ?? "0,0",
      destinationCoords: shipment.destinationCoords ?? "0,0",
      progressPercent,
      etaDays,
      myAmount: Number(inv.amount),
      cargoType: shipment.cargoType,
      dbStatus: shipment.status,
      departureDate: shipment.departureDate.toISOString(),
      arrivalDate: shipment.arrivalDate.toISOString(),
      stageOverride: shipment.stageOverride ?? null,
      pausedAt: shipment.pausedAt ? shipment.pausedAt.toISOString() : null,
    });
  }

  res.json(results);
});

router.get("/port-activity", async (_req, res) => {
  const activity = await db.select().from(portActivityTable)
    .orderBy(portActivityTable.timestamp)
    .then(rows => rows.reverse());

  res.json(activity.map((a) => ({
    id: a.id,
    portName: a.portName,
    country: a.country,
    eventType: a.eventType,
    vesselName: a.vesselName,
    cargoType: a.cargoType ?? null,
    timestamp: a.timestamp.toISOString(),
  })));
});

export default router;
