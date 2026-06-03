import { Router } from "express";
import { db, usersTable, kycTable, investmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { UpdateProfileBody, SubmitKycBody, UpdateWalletAddressesBody } from "@workspace/api-zod";

const router = Router();

async function buildProfile(user: typeof usersTable.$inferSelect) {
  const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, user.id));
  const active = invs.filter(i => i.status === "active");
  const delivered = invs.filter(i => i.status === "delivered");
  const totalProfit = delivered.reduce((acc, i) => acc + Number(i.actualProfit ?? 0), 0);
  const totalShipped = invs.reduce((acc, i) => acc + Number(i.amount), 0);

  const { shipmentsTable } = await import("@workspace/db");
  const shipmentIds = [...new Set(invs.map(i => i.shipmentId))];
  const countries = new Set<string>();
  for (const sid of shipmentIds) {
    const [s] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, sid)).limit(1);
    if (s) {
      countries.add(s.origin.split(",").pop()?.trim() ?? s.origin);
      countries.add(s.destination.split(",").pop()?.trim() ?? s.destination);
    }
  }

  return {
    id: user.id,
    email: user.email,
    traderId: user.traderId,
    kycStatus: user.kycStatus,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    username: user.username ?? null,
    country: user.country ?? null,
    telegramHandle: user.telegramHandle ?? null,
    whatsappNumber: user.whatsappNumber ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    walletAddresses: {
      btc: user.walletAddressBtc ?? null,
      eth: user.walletAddressEth ?? null,
      usdt: user.walletAddressUsdt ?? null,
      bnb: user.walletAddressBnb ?? null,
    },
    traderStats: {
      totalShipped,
      totalProfit,
      countriesTraded: countries.size,
      activeInvestments: active.length,
      deliveredInvestments: delivered.length,
    },
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await buildProfile(user));
});

router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" }); return;
  }
  const { firstName, lastName, username, country, telegramHandle, whatsappNumber } = parsed.data;

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (telegramHandle !== undefined) updates.telegramHandle = telegramHandle ?? undefined;
  if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber ?? undefined;
  if (firstName !== undefined) updates.firstName = firstName ?? undefined;
  if (lastName !== undefined) updates.lastName = lastName ?? undefined;
  if (country !== undefined) updates.country = country ?? undefined;
  if (username !== undefined) {
    if (username) {
      const check = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
      if (check.length > 0 && check[0].id !== userId) {
        res.status(400).json({ error: "Username already taken" }); return;
      }
    }
    updates.username = username ?? undefined;
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  res.json(await buildProfile(user));
});

router.post("/kyc", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const parsed = SubmitKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" }); return;
  }
  const { idDocumentUrl, selfieUrl, proofOfAddressUrl } = parsed.data;

  await db.insert(kycTable).values({
    userId,
    idDocumentUrl,
    selfieUrl,
    proofOfAddressUrl: proofOfAddressUrl ?? null,
    status: "pending",
  });

  const [user] = await db.update(usersTable).set({ kycStatus: "pending" }).where(eq(usersTable.id, userId)).returning();
  res.json(await buildProfile(user));
});

router.patch("/wallet-addresses", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const parsed = UpdateWalletAddressesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" }); return;
  }
  const { btc, eth, usdt, bnb } = parsed.data;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (btc !== undefined) updates.walletAddressBtc = btc ?? undefined;
  if (eth !== undefined) updates.walletAddressEth = eth ?? undefined;
  if (usdt !== undefined) updates.walletAddressUsdt = usdt ?? undefined;
  if (bnb !== undefined) updates.walletAddressBnb = bnb ?? undefined;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  res.json(await buildProfile(user));
});

export default router;
