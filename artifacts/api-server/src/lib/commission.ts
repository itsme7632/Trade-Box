import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { audit } from "./audit";

export const COMMISSION_RATES = {
  tier1: 0.07,
  tier2: 0.02,
  tier3: 0.01,
} as const;

export interface CommissionResult {
  tier: number;
  recipientId: number;
  recipientTraderId: string;
  commission: number;
}

/**
 * Process guild commissions for a delivered investment.
 * Walks up 3 referral tiers from the investor, credits each referrer,
 * inserts a guild_commission transaction with notes="1"|"2"|"3",
 * and emits an audit log.
 *
 * @param investorId       - User who made the investment
 * @param investorTraderId - For display in commission description
 * @param profit           - Profit earned by the investor (commission base)
 * @param shipmentId       - Shipment that was delivered
 * @param shipmentTitle    - For audit log readability
 * @param triggeredBy      - Admin userId or "cron"
 * @returns Array of commission records paid (for audit/test assertions)
 */
export async function processGuildCommissions(
  investorId: number,
  investorTraderId: string,
  profit: number,
  shipmentId: number,
  shipmentTitle: string,
  triggeredBy: number | "cron" = "cron",
): Promise<CommissionResult[]> {
  const results: CommissionResult[] = [];

  const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, investorId)).limit(1);
  if (!investor || !investor.referredBy) return results;

  const tiers: Array<{ rate: number; tier: 1 | 2 | 3 }> = [
    { rate: COMMISSION_RATES.tier1, tier: 1 },
    { rate: COMMISSION_RATES.tier2, tier: 2 },
    { rate: COMMISSION_RATES.tier3, tier: 3 },
  ];

  let currentReferredBy: string | null = investor.referredBy;

  for (const { rate, tier } of tiers) {
    if (!currentReferredBy) break;

    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.guildCode, currentReferredBy))
      .limit(1);

    if (!referrer) break;

    const commission = Math.round(profit * rate * 100) / 100;

    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${commission}` })
      .where(eq(usersTable.id, referrer.id));

    await db.insert(transactionsTable).values({
      userId: referrer.id,
      type: "guild_commission",
      amount: String(commission),
      status: "cleared",
      description: `Tier ${tier} commission from ${investorTraderId}`,
      notes: String(tier),
      relatedUserId: investorId,
      shipmentId,
    });

    audit({
      event: "guild_commission_paid",
      userId: referrer.id,
      detail: {
        tier,
        referrerId: referrer.id,
        referrerTraderId: referrer.traderId,
        investorTraderId,
        profit,
        commission,
        shipmentId,
        shipmentTitle,
        triggeredBy,
      },
    });

    results.push({ tier, recipientId: referrer.id, recipientTraderId: referrer.traderId, commission });

    currentReferredBy = referrer.referredBy;
  }

  return results;
}

/**
 * Parse the commission tier from a transaction record.
 * Primary source: notes field ("1", "2", "3").
 * Fallback: description prefix ("Tier N commission from ...").
 */
export function parseTier(notes: string | null, description: string | null): 1 | 2 | 3 | null {
  if (notes === "1") return 1;
  if (notes === "2") return 2;
  if (notes === "3") return 3;
  if (description) {
    const m = description.match(/^Tier ([123]) commission/i);
    if (m) return Number(m[1]) as 1 | 2 | 3;
  }
  return null;
}
