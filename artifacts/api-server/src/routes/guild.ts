import { Router } from "express";
import { db, usersTable, investmentsTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { COMMISSION_RATES, parseTier } from "../lib/commission";

const router = Router();

function getRank(totalVolume: number): { rank: string; nextRankAt: number | null; nextRank: string | null } {
  if (totalVolume >= 100000) return { rank: "Magnate", nextRankAt: null, nextRank: null };
  if (totalVolume >= 25000) return { rank: "Broker", nextRankAt: 100000, nextRank: "Magnate" };
  if (totalVolume >= 5000) return { rank: "Trader", nextRankAt: 25000, nextRank: "Broker" };
  return { rank: "Merchant", nextRankAt: 5000, nextRank: "Trader" };
}

function maskEmail(email: string): string {
  return email.replace(/(.{2}).+(@.+)/, "$1***$2");
}

/**
 * Walk up the referral chain from a user, up to maxDepth levels.
 * Returns [tier1[], tier2[], tier3[]] referrer sets.
 */
async function getReferralTiers(userGuildCode: string): Promise<{
  tier1: typeof usersTable.$inferSelect[];
  tier2: typeof usersTable.$inferSelect[];
  tier3: typeof usersTable.$inferSelect[];
}> {
  const tier1 = await db.select().from(usersTable).where(eq(usersTable.referredBy, userGuildCode));

  const tier2: typeof usersTable.$inferSelect[] = [];
  for (const t1 of tier1) {
    const children = await db.select().from(usersTable).where(eq(usersTable.referredBy, t1.guildCode));
    tier2.push(...children);
  }

  const tier3: typeof usersTable.$inferSelect[] = [];
  for (const t2 of tier2) {
    const children = await db.select().from(usersTable).where(eq(usersTable.referredBy, t2.guildCode));
    tier3.push(...children);
  }

  return { tier1, tier2, tier3 };
}

// GET /guild/stats
router.get("/stats", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { tier1, tier2, tier3 } = await getReferralTiers(user.guildCode);

  // All guild_commission transactions for this user
  const allTxs = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "guild_commission"))
  );
  const cleared = allTxs.filter(t => t.status === "cleared");

  let tier1Earnings = 0;
  let tier2Earnings = 0;
  let tier3Earnings = 0;
  let uncategorised = 0;

  for (const t of cleared) {
    const tier = parseTier(t.notes, t.description);
    const amt = Number(t.amount);
    if (tier === 1) tier1Earnings += amt;
    else if (tier === 2) tier2Earnings += amt;
    else if (tier === 3) tier3Earnings += amt;
    else uncategorised += amt;
  }
  const totalEarnings = tier1Earnings + tier2Earnings + tier3Earnings + uncategorised;

  // Lifetime invested volume (own investments)
  const ownInvs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const totalVolumeFunded = ownInvs.reduce((acc, i) => acc + Number(i.amount), 0);

  const { rank, nextRankAt, nextRank } = getRank(totalVolumeFunded);

  // Network volume (investments from all referrals)
  const allRefIds = [...tier1, ...tier2, ...tier3].map(u => u.id);
  let networkVolume = 0;
  for (const refId of allRefIds) {
    const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, refId));
    networkVolume += invs.reduce((acc, i) => acc + Number(i.amount), 0);
  }

  res.json({
    guildCode: user.guildCode,
    referralLink: `?ref=${user.guildCode}`,
    tier1Count: tier1.length,
    tier2Count: tier2.length,
    tier3Count: tier3.length,
    tier1Earnings: Math.round(tier1Earnings * 100) / 100,
    tier2Earnings: Math.round(tier2Earnings * 100) / 100,
    tier3Earnings: Math.round(tier3Earnings * 100) / 100,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    commissionRates: COMMISSION_RATES,
    rank,
    nextRank,
    nextRankAt,
    totalVolumeFunded: Math.round(totalVolumeFunded * 100) / 100,
    networkVolume: Math.round(networkVolume * 100) / 100,
  });
});

// GET /guild/referrals — all 3 tiers with volume
router.get("/referrals", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { tier1, tier2, tier3 } = await getReferralTiers(user.guildCode);
  const referrals = [];

  async function buildEntry(u: typeof usersTable.$inferSelect, tier: 1 | 2 | 3, parentTraderId?: string) {
    const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, u.id));
    const volumeFunded = invs.reduce((acc, i) => acc + Number(i.amount), 0);
    const activeInvs = invs.filter(i => i.status === "active");
    return {
      id: u.id,
      traderId: u.traderId,
      email: maskEmail(u.email),
      tier,
      parentTraderId: parentTraderId ?? null,
      joinedAt: u.createdAt.toISOString(),
      volumeFunded: Math.round(volumeFunded * 100) / 100,
      activeInvestments: activeInvs.length,
      kycStatus: u.kycStatus,
    };
  }

  // Build parent map: for tier2 users, find their tier1 parent
  const tier1ByCode = new Map(tier1.map(u => [u.guildCode, u]));
  const tier2ByCode = new Map(tier2.map(u => [u.guildCode, u]));

  for (const u of tier1) {
    referrals.push(await buildEntry(u, 1));
  }
  for (const u of tier2) {
    const parent = tier1ByCode.get(u.referredBy ?? "");
    referrals.push(await buildEntry(u, 2, parent?.traderId));
  }
  for (const u of tier3) {
    const parent = tier2ByCode.get(u.referredBy ?? "");
    referrals.push(await buildEntry(u, 3, parent?.traderId));
  }

  res.json(referrals);
});

// GET /guild/commissions — full earnings history with tier annotation
router.get("/commissions", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const txs = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "guild_commission"))
  );

  res.json(txs.map(t => ({
    id: t.id,
    amount: Number(t.amount),
    tier: parseTier(t.notes, t.description),
    status: t.status,
    description: t.description ?? null,
    relatedUserId: t.relatedUserId ?? null,
    shipmentId: t.shipmentId ?? null,
    createdAt: t.createdAt.toISOString(),
  })));
});

// GET /guild/earnings — earnings grouped by tier with running totals
router.get("/earnings", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const txs = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "guild_commission"))
  );

  const byTier: Record<string, { total: number; count: number; entries: unknown[] }> = {
    "1": { total: 0, count: 0, entries: [] },
    "2": { total: 0, count: 0, entries: [] },
    "3": { total: 0, count: 0, entries: [] },
    "unknown": { total: 0, count: 0, entries: [] },
  };

  for (const t of txs.filter(t => t.status === "cleared")) {
    const tier = parseTier(t.notes, t.description);
    const key = tier ? String(tier) : "unknown";
    const amt = Number(t.amount);
    byTier[key].total += amt;
    byTier[key].count++;
    byTier[key].entries.push({
      id: t.id,
      amount: amt,
      tier,
      description: t.description,
      shipmentId: t.shipmentId ?? null,
      relatedUserId: t.relatedUserId ?? null,
      createdAt: t.createdAt.toISOString(),
    });
  }

  res.json({
    summary: {
      tier1: { total: Math.round(byTier["1"].total * 100) / 100, count: byTier["1"].count, rate: "7%" },
      tier2: { total: Math.round(byTier["2"].total * 100) / 100, count: byTier["2"].count, rate: "2%" },
      tier3: { total: Math.round(byTier["3"].total * 100) / 100, count: byTier["3"].count, rate: "1%" },
      unknown: { total: Math.round(byTier["unknown"].total * 100) / 100, count: byTier["unknown"].count },
    },
    history: txs.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      tier: parseTier(t.notes, t.description),
      status: t.status,
      description: t.description ?? null,
      shipmentId: t.shipmentId ?? null,
      relatedUserId: t.relatedUserId ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

// GET /guild/performance — dashboard-ready summary
router.get("/performance", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { tier1, tier2, tier3 } = await getReferralTiers(user.guildCode);

  // Per-tier earnings totals
  const allTxs = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "guild_commission"))
  );

  let t1e = 0, t2e = 0, t3e = 0;
  for (const t of allTxs.filter(x => x.status === "cleared")) {
    const tier = parseTier(t.notes, t.description);
    if (tier === 1) t1e += Number(t.amount);
    else if (tier === 2) t2e += Number(t.amount);
    else if (tier === 3) t3e += Number(t.amount);
  }

  // Tier volumes
  async function tierVolume(users: typeof usersTable.$inferSelect[]) {
    let vol = 0;
    for (const u of users) {
      const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, u.id));
      vol += invs.reduce((acc, i) => acc + Number(i.amount), 0);
    }
    return Math.round(vol * 100) / 100;
  }

  const [vol1, vol2, vol3] = await Promise.all([
    tierVolume(tier1),
    tierVolume(tier2),
    tierVolume(tier3),
  ]);

  const ownInvs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const totalVolumeFunded = ownInvs.reduce((acc, i) => acc + Number(i.amount), 0);
  const { rank, nextRankAt, nextRank } = getRank(totalVolumeFunded);

  res.json({
    guildCode: user.guildCode,
    rank, nextRank, nextRankAt,
    totalVolumeFunded: Math.round(totalVolumeFunded * 100) / 100,
    tiers: {
      tier1: {
        count: tier1.length,
        networkVolume: vol1,
        earnings: Math.round(t1e * 100) / 100,
        rate: "7%",
      },
      tier2: {
        count: tier2.length,
        networkVolume: vol2,
        earnings: Math.round(t2e * 100) / 100,
        rate: "2%",
      },
      tier3: {
        count: tier3.length,
        networkVolume: vol3,
        earnings: Math.round(t3e * 100) / 100,
        rate: "1%",
      },
    },
    totalEarnings: Math.round((t1e + t2e + t3e) * 100) / 100,
  });
});

export default router;
