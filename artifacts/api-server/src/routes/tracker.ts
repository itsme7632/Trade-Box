import { Router } from "express";
import { db, investmentsTable, shipmentsTable, portActivityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/my-shipments", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;

  const investments = await db.select().from(investmentsTable).where(
    and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active"))
  );

  const results = [];
  for (const inv of investments) {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, inv.shipmentId)).limit(1);
    if (!shipment) continue;

    const now = Date.now();
    const departure = shipment.departureDate.getTime();
    const arrival = shipment.arrivalDate.getTime();
    const total = arrival - departure;
    const elapsed = now - departure;
    const progressPercent = Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 99);
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
    });
  }

  res.json(results);
});

router.get("/port-activity", async (_req, res) => {
  const activity = await db.select().from(portActivityTable)
    .orderBy(portActivityTable.timestamp);

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
