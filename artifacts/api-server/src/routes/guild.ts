import { Router } from "express";
import { db, usersTable, investmentsTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function getRank(totalVolume: number): { rank: string; nextRankAt: number | null } {
  if (totalVolume >= 100000) return { rank: "Magnate", nextRankAt: null };
  if (totalVolume >= 25000) return { rank: "Broker", nextRankAt: 100000 };
  if (totalVolume >= 5000) return { rank: "Trader", nextRankAt: 25000 };
  return { rank: "Merchant", nextRankAt: 5000 };
}

router.get("/stats", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Tier 1: users who used this user's guild code
  const tier1Users = await db.select().from(usersTable).where(eq(usersTable.referredBy, user.guildCode));

  // Tier 2: users who were referred by tier1 users
  const tier2Users = [];
  for (const t1 of tier1Users) {
    const t2 = await db.select().from(usersTable).where(eq(usersTable.referredBy, t1.guildCode));
    tier2Users.push(...t2);
  }

  // Tier 3
  const tier3Users = [];
  for (const t2 of tier2Users) {
    const t3 = await db.select().from(usersTable).where(eq(usersTable.referredBy, t2.guildCode));
    tier3Users.push(...t3);
  }

  const guildTxs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));
  const guildEarnings = guildTxs.filter(t => t.type === "guild_commission" && t.status === "cleared");
  const totalEarnings = guildEarnings.reduce((acc, t) => acc + Number(t.amount), 0);

  // Volume by tiers based on investments
  const allInvs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const totalVolumeFunded = allInvs.reduce((acc, i) => acc + Number(i.amount), 0);

  const { rank, nextRankAt } = getRank(totalVolumeFunded);

  res.json({
    guildCode: user.guildCode,
    tier1Count: tier1Users.length,
    tier2Count: tier2Users.length,
    tier3Count: tier3Users.length,
    tier1Earnings: 0,
    tier2Earnings: 0,
    tier3Earnings: 0,
    totalEarnings,
    rank,
    totalVolumeFunded,
    nextRankAt,
  });
});

router.get("/referrals", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tier1Users = await db.select().from(usersTable).where(eq(usersTable.referredBy, user.guildCode));
  const referrals = [];

  for (const t1 of tier1Users) {
    const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, t1.id));
    const volume = invs.reduce((acc, i) => acc + Number(i.amount), 0);
    referrals.push({
      id: t1.id,
      traderId: t1.traderId,
      email: t1.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
      tier: 1,
      joinedAt: t1.createdAt.toISOString(),
      volumeFunded: volume,
    });

    const tier2 = await db.select().from(usersTable).where(eq(usersTable.referredBy, t1.guildCode));
    for (const t2 of tier2) {
      const t2invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, t2.id));
      const t2vol = t2invs.reduce((acc, i) => acc + Number(i.amount), 0);
      referrals.push({
        id: t2.id,
        traderId: t2.traderId,
        email: t2.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
        tier: 2,
        joinedAt: t2.createdAt.toISOString(),
        volumeFunded: t2vol,
      });
    }
  }

  res.json(referrals);
});

router.get("/commissions", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));
  const commissions = txs.filter(t => t.type === "guild_commission");
  res.json(commissions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    status: t.status,
    description: t.description ?? null,
    txid: t.txid ?? null,
    coin: t.coin ?? null,
    createdAt: t.createdAt.toISOString(),
  })));
});

export default router;
