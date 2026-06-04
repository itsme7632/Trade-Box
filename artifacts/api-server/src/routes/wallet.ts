import { Router } from "express";
import { db, usersTable, transactionsTable, cryptoWalletsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { SubmitDepositBody, SubmitWithdrawalBody } from "@workspace/api-zod";
import { audit, getClientIp } from "../lib/audit";

const router = Router();

function formatLedger(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    status: tx.status,
    description: tx.description ?? null,
    txid: tx.txid ?? null,
    coin: tx.coin ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}

router.get("/balance", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { investmentsTable } = await import("@workspace/db");
  const { eq: eqFn } = await import("drizzle-orm");
  const invs = await db.select().from(investmentsTable).where(eqFn(investmentsTable.userId, userId));
  const totalInvested = invs.filter(i => i.status === "active").reduce((acc, i) => acc + Number(i.amount), 0);

  res.json({
    balance: Number(user.balance),
    totalDeposited: Number(user.totalDeposited),
    totalWithdrawn: Number(user.totalWithdrawn),
    totalProfits: Number(user.totalProfits),
    totalInvested,
  });
});

router.get("/ledger", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const { type, status } = req.query as Record<string, string>;

  const conditions: ReturnType<typeof eq>[] = [eq(transactionsTable.userId, userId)];
  if (type && type !== "all") {
    const typeMap: Record<string, string> = {
      deposits: "deposit",
      withdrawals: "withdrawal",
      deliveries: "delivery_profit",
      guild: "guild_commission",
    };
    const mappedType = typeMap[type] || type;
    conditions.push(eq(transactionsTable.type, mappedType as typeof transactionsTable.$inferSelect["type"]));
  }
  if (status && status !== "all") {
    conditions.push(eq(transactionsTable.status, status as typeof transactionsTable.$inferSelect["status"]));
  }

  const txs = await db.select().from(transactionsTable).where(and(...conditions));
  res.json(txs.map(formatLedger));
});

router.post("/deposit", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const parsed = SubmitDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { coin, amount, txid, proofUrl } = parsed.data;

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: String(amount),
    status: "reviewing",
    description: `Deposit via ${coin.toUpperCase()}`,
    txid,
    coin: coin.toUpperCase(),
    proofUrl: proofUrl ?? null,
  }).returning();

  res.status(201).json(formatLedger(tx));
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const ip = getClientIp(req);
  const parsed = SubmitWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { coin, amount, walletAddress } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const fee = amount * 0.01;
  const totalReserved = amount + fee;

  if (Number(user.balance) < totalReserved) {
    res.status(400).json({ error: "Insufficient balance (including 1% fee)" });
    return;
  }

  // Immediately reserve (deduct) the full amount + fee from available balance.
  // Balance is restored only if admin rejects the withdrawal.
  // totalWithdrawn is updated only when admin approves (marks cleared).
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} - ${totalReserved}`,
  }).where(eq(usersTable.id, userId));

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(-amount),
    status: "in_transit",
    description: `Withdrawal to ${walletAddress.slice(0, 10)}... via ${coin.toUpperCase()}`,
    coin: coin.toUpperCase(),
    walletAddress,
    txid: null,
    notes: String(fee),
  }).returning();

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  audit({
    event: "withdrawal_created",
    userId,
    traderId: updatedUser.traderId,
    ip,
    detail: { amount, fee, coin, walletAddress, txId: tx.id, newBalance: Number(updatedUser.balance) },
  });

  res.status(201).json(formatLedger(tx));
});

router.get("/crypto-addresses", requireAuth, async (_req, res) => {
  const wallets = await db.select().from(cryptoWalletsTable);
  res.json(wallets.map((w) => ({
    coin: w.coin,
    address: w.address,
    network: w.network,
  })));
});

export default router;
