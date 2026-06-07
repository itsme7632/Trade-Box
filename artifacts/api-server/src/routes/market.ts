import { Router } from "express";
import { db, shipmentsTable, investmentsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getLivePrices } from "../lib/commodities";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const activeInvs = invs.filter(i => i.status === "active");
  const deliveredInvs = invs.filter(i => i.status === "delivered");
  const totalProfit = deliveredInvs.reduce((acc, i) => acc + Number(i.actualProfit ?? 0), 0);
  const portfolioValue = activeInvs.reduce((acc, i) => acc + Number(i.amount), 0);

  // Guild (referral) commissions
  const allTxns = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "guild_commission")))
    .orderBy(desc(transactionsTable.createdAt));
  const referralEarnings = allTxns
    .filter(t => t.status === "cleared")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Recent activity (last 8 transactions)
  const recentTxns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(8);

  // Featured shipment (is_featured=1 first, else highest funded open)
  const openShipments = await db.select().from(shipmentsTable).where(eq(shipmentsTable.status, "open"));
  const featured = openShipments.find(s => s.isFeatured === 1) ??
    openShipments.sort((a, b) => Number(b.fundingRaised) - Number(a.fundingRaised))[0];

  const baseResponse = {
    portfolioValue,
    availableBalance: Number(user?.balance ?? 0),
    activeInvestments: activeInvs.length,
    completedShipments: deliveredInvs.length,
    totalProfit,
    referralEarnings,
    recentActivity: recentTxns.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      coin: t.coin ?? "USDT",
      createdAt: t.createdAt.toISOString(),
    })),
  };

  if (!featured) {
    res.json({ ...baseResponse, featuredShipment: null });
    return;
  }

  res.json({
    ...baseResponse,
    featuredShipment: {
      id: featured.id,
      title: featured.title,
      cargoType: featured.cargoType,
      origin: featured.origin,
      destination: featured.destination,
      originCoords: featured.originCoords ?? null,
      destinationCoords: featured.destinationCoords ?? null,
      profitPercent: Number(featured.profitPercent),
      riskGrade: featured.riskGrade,
      fundingGoal: Number(featured.fundingGoal),
      fundingRaised: Number(featured.fundingRaised),
      minInvestment: Number(featured.minInvestment),
      transitDays: featured.transitDays,
      departureDate: featured.departureDate.toISOString(),
      arrivalDate: featured.arrivalDate.toISOString(),
      status: featured.status,
      freightForwarder: featured.freightForwarder,
      vesselName: featured.vesselName,
      createdAt: featured.createdAt.toISOString(),
    },
  });
});

router.get("/commodity-prices", (_req, res) => {
  res.json(getLivePrices());
});

router.get("/delivery-feed", async (_req, res) => {
  const delivered = await db.select().from(investmentsTable).where(eq(investmentsTable.status, "delivered"));
  const feed = [];
  for (const inv of delivered.slice(0, 20)) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, inv.shipmentId)).limit(1);
    if (user && shipment) {
      feed.push({
        id: inv.id,
        traderId: user.traderId,
        shipmentTitle: shipment.title,
        amount: Number(inv.amount),
        profit: Number(inv.actualProfit ?? 0),
        deliveredAt: inv.deliveredAt ? inv.deliveredAt.toISOString() : new Date().toISOString(),
      });
    }
  }
  res.json(feed);
});

router.get("/closing-soon", async (_req, res) => {
  const openShipments = await db.select().from(shipmentsTable).where(eq(shipmentsTable.status, "open"));
  const closingSoon = openShipments
    .filter(s => (Number(s.fundingRaised) / Number(s.fundingGoal)) >= 0.5)
    .sort((a, b) => (Number(b.fundingRaised) / Number(b.fundingGoal)) - (Number(a.fundingRaised) / Number(a.fundingGoal)));

  res.json(closingSoon.map(s => ({
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
    createdAt: s.createdAt.toISOString(),
  })));
});

export default router;
