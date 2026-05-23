import { Router } from "express";
import { db, shipmentsTable, investmentsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { FundShipmentBody } from "@workspace/api-zod";

const router = Router();

function formatShipment(s: typeof shipmentsTable.$inferSelect, myInvestment?: number | null, investorCount?: number) {
  return {
    id: s.id,
    title: s.title,
    cargoType: s.cargoType,
    origin: s.origin,
    destination: s.destination,
    originCoords: s.originCoords ?? null,
    destinationCoords: s.destinationCoords ?? null,
    profitPercent: Number(s.profitPercent),
    riskGrade: s.riskGrade,
    fundingGoal: Number(s.fundingGoal),
    fundingRaised: Number(s.fundingRaised),
    minInvestment: Number(s.minInvestment),
    departureDate: s.departureDate.toISOString(),
    arrivalDate: s.arrivalDate.toISOString(),
    transitDays: s.transitDays,
    status: s.status,
    freightForwarder: s.freightForwarder,
    vesselName: s.vesselName,
    hsCode: s.hsCode ?? null,
    weightTons: s.weightTons ? Number(s.weightTons) : null,
    volumeCbm: s.volumeCbm ? Number(s.volumeCbm) : null,
    description: s.description ?? null,
    investorCount: investorCount ?? 0,
    myInvestment: myInvestment ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const { category, riskGrade, status } = req.query as Record<string, string>;

  let query = db.select().from(shipmentsTable);
  const conditions = [];

  if (category && category !== "all") conditions.push(eq(shipmentsTable.cargoType, category as typeof shipmentsTable.$inferSelect["cargoType"]));
  if (riskGrade) conditions.push(eq(shipmentsTable.riskGrade, riskGrade as typeof shipmentsTable.$inferSelect["riskGrade"]));
  if (status) conditions.push(eq(shipmentsTable.status, status as typeof shipmentsTable.$inferSelect["status"]));

  const shipments = conditions.length > 0
    ? await db.select().from(shipmentsTable).where(and(...conditions))
    : await db.select().from(shipmentsTable);

  res.json(shipments.map((s) => formatShipment(s)));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }

  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.shipmentId, id));
  const myInvestment = investments.find((i) => i.userId === userId);
  const myAmount = myInvestment ? Number(myInvestment.amount) : null;

  res.json(formatShipment(shipment, myAmount, investments.length));
});

router.post("/:id/fund", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;

  const parsed = FundShipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { amount } = parsed.data;

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  if (shipment.status !== "open") {
    res.status(400).json({ error: "Shipment not open for funding" });
    return;
  }
  if (amount < Number(shipment.minInvestment)) {
    res.status(400).json({ error: `Minimum investment is $${shipment.minInvestment}` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (Number(user.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const expectedProfit = (amount * Number(shipment.profitPercent)) / 100;

  const [investment] = await db.insert(investmentsTable).values({
    userId,
    shipmentId: id,
    amount: String(amount),
    profitPercent: shipment.profitPercent,
    expectedProfit: String(expectedProfit),
    status: "active",
  }).returning();

  // Deduct from balance
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} - ${amount}`,
  }).where(eq(usersTable.id, userId));

  // Update shipment funding
  const newRaised = Number(shipment.fundingRaised) + amount;
  const newStatus = newRaised >= Number(shipment.fundingGoal) ? "funded" : "open";
  await db.update(shipmentsTable).set({
    fundingRaised: String(newRaised),
    status: newStatus,
  }).where(eq(shipmentsTable.id, id));

  // Record transaction
  await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: String(-amount),
    status: "cleared",
    description: `Funded shipment: ${shipment.title}`,
    shipmentId: id,
  });

  res.json({
    id: investment.id,
    shipmentId: investment.shipmentId,
    amount: Number(investment.amount),
    profitPercent: Number(investment.profitPercent),
    expectedProfit: Number(investment.expectedProfit),
    actualProfit: null,
    status: investment.status,
    createdAt: investment.createdAt.toISOString(),
    deliveredAt: null,
  });
});

export default router;
