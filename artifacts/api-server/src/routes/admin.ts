import { Router } from "express";
import { db, usersTable, transactionsTable, kycTable, shipmentsTable, investmentsTable, cryptoWalletsTable, supportSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import { AdminRejectDepositBody, AdminProcessWithdrawalBody, AdminRejectKycBody, AdminCreditProfitBody, AdminCreateShipmentBody, AdminUpdateShipmentBody, AdminUpdateCryptoWalletsBody } from "@workspace/api-zod";
import { audit, getClientIp } from "../lib/audit";
import { processGuildCommissions, parseTier } from "../lib/commission";
import { createNotification } from "../lib/notifications";

const SupportSettingsPatchBody = z.object({
  telegramSupport: z.string().optional(),
  whatsappSupport: z.string().optional(),
  supportEmail: z.string().email().optional(),
  telegramGroup: z.string().optional(),
  whatsappCommunity: z.string().optional(),
  announcementChannel: z.string().optional(),
});

const AdminRejectWithdrawalBody = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

const router = Router();

router.use(requireAuth, requireAdmin);

// STATS
router.get("/stats", async (_req, res) => {
  const users = await db.select().from(usersTable);
  const txs = await db.select().from(transactionsTable);
  const shipments = await db.select().from(shipmentsTable);
  const kycs = await db.select().from(kycTable);

  const totalDeposited = txs.filter(t => t.type === "deposit" && t.status === "cleared" && Number(t.amount) > 0).reduce((acc, t) => acc + Number(t.amount), 0);
  const totalWithdrawn = txs.filter(t => t.type === "withdrawal" && t.status === "cleared").reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const totalProfitPaid = txs.filter(t => t.type === "delivery_profit" && t.status === "cleared").reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingDeposits = txs.filter(t => t.type === "deposit" && t.status === "reviewing").length;
  const pendingWithdrawals = txs.filter(t => t.type === "withdrawal" && t.status === "in_transit").length;
  const pendingKyc = kycs.filter(k => k.status === "pending").length;
  const activeShipments = shipments.filter(s => ["open", "funded", "in_transit"].includes(s.status)).length;

  res.json({
    totalUsers: users.filter(u => u.role === "user").length,
    totalDeposited,
    totalWithdrawn,
    totalProfitPaid,
    activeShipments,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
  });
});

// DEPOSITS
router.get("/deposits", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  let txs = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "deposit"));

  if (status && status !== "all") {
    txs = txs.filter(t => t.status === status);
  }

  const results = [];
  for (const tx of txs) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
    if (user) {
      results.push({
        id: tx.id,
        userId: tx.userId,
        traderId: user.traderId,
        email: user.email,
        coin: tx.coin ?? "USDT",
        amount: Number(tx.amount),
        txid: tx.txid ?? "",
        proofUrl: tx.proofUrl ?? null,
        status: tx.status,
        notes: tx.notes ?? null,
        createdAt: tx.createdAt.toISOString(),
      });
    }
  }
  res.json(results);
});

router.post("/deposits/:id/approve", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  const amount = Number(tx.amount);
  await db.update(transactionsTable).set({ status: "cleared" }).where(eq(transactionsTable.id, id));
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${amount}`,
    totalDeposited: sql`${usersTable.totalDeposited} + ${amount}`,
  }).where(eq(usersTable.id, tx.userId));

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);

  audit({ event: "deposit_approved", userId: adminId, ip, detail: { txId: id, targetUser: user.traderId, amount } });

  createNotification(tx.userId, "deposit", "Deposit Approved ✓", `Your deposit of ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT has been approved and credited to your account.`, { link: "/wallet" });

  res.json({
    id: updated.id,
    userId: updated.userId,
    traderId: user.traderId,
    email: user.email,
    coin: updated.coin ?? "USDT",
    amount: Number(updated.amount),
    txid: updated.txid ?? "",
    proofUrl: updated.proofUrl ?? null,
    status: "cleared",
    notes: updated.notes ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.post("/deposits/:id/reject", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = AdminRejectDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  await db.update(transactionsTable).set({ status: "rejected", notes: parsed.data.reason }).where(eq(transactionsTable.id, id));
  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

  audit({ event: "deposit_rejected", userId: adminId, ip, detail: { txId: id, targetUser: user.traderId, reason: parsed.data.reason } });

  createNotification(updated.userId, "deposit", "Deposit Rejected", `Your deposit of ${Number(updated.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT was rejected. Reason: ${parsed.data.reason}`, { link: "/wallet" });

  res.json({
    id: updated.id,
    userId: updated.userId,
    traderId: user.traderId,
    email: user.email,
    coin: updated.coin ?? "USDT",
    amount: Number(updated.amount),
    txid: updated.txid ?? "",
    proofUrl: updated.proofUrl ?? null,
    status: "rejected",
    notes: updated.notes ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// WITHDRAWALS
router.get("/withdrawals", async (_req, res) => {
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "withdrawal"));
  const results = [];
  for (const tx of txs) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
    if (user) {
      const principal = Math.abs(Number(tx.amount));
      const fee = tx.notes ? Number(tx.notes) : principal * 0.01;
      results.push({
        id: tx.id,
        userId: tx.userId,
        traderId: user.traderId,
        email: user.email,
        coin: tx.coin ?? "USDT",
        amount: principal,
        fee,
        walletAddress: tx.walletAddress ?? "",
        status: tx.status,
        txid: tx.txid ?? null,
        createdAt: tx.createdAt.toISOString(),
      });
    }
  }
  res.json(results);
});

// Process (approve) withdrawal — balance was already deducted at submission; only update totalWithdrawn and mark cleared.
router.post("/withdrawals/:id/process", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = AdminProcessWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (tx.status !== "in_transit") {
    res.status(400).json({ error: "Withdrawal is not in a processable state" });
    return;
  }
  const principal = Math.abs(Number(tx.amount));

  // Balance was reserved at submission. Now just mark cleared and record in totalWithdrawn.
  await db.update(transactionsTable).set({ status: "cleared", txid: parsed.data.txid }).where(eq(transactionsTable.id, id));
  await db.update(usersTable).set({
    totalWithdrawn: sql`${usersTable.totalWithdrawn} + ${principal}`,
  }).where(eq(usersTable.id, tx.userId));

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
  const fee = tx.notes ? Number(tx.notes) : principal * 0.01;

  audit({ event: "withdrawal_approved", userId: adminId, ip, detail: { txId: id, targetUser: user.traderId, principal, fee, txid: parsed.data.txid } });

  createNotification(tx.userId, "withdrawal", "Withdrawal Processed ✓", `Your withdrawal of ${principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT has been sent. TXID: ${parsed.data.txid}`, { link: "/wallet" });

  res.json({
    id: updated.id,
    userId: updated.userId,
    traderId: user.traderId,
    email: user.email,
    coin: updated.coin ?? "USDT",
    amount: principal,
    fee,
    walletAddress: updated.walletAddress ?? "",
    status: "cleared",
    txid: updated.txid ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// Reject withdrawal — restore the reserved balance (principal + fee) back to the user.
router.post("/withdrawals/:id/reject", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = AdminRejectWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (tx.status !== "in_transit") {
    res.status(400).json({ error: "Withdrawal is not in a rejectable state" });
    return;
  }
  const principal = Math.abs(Number(tx.amount));
  const fee = tx.notes ? Number(tx.notes) : principal * 0.01;
  const totalToRestore = principal + fee;

  // Restore the reserved amount (principal + fee) back to user's available balance.
  await db.update(transactionsTable)
    .set({ status: "rejected", notes: parsed.data.reason })
    .where(eq(transactionsTable.id, id));
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${totalToRestore}`,
  }).where(eq(usersTable.id, tx.userId));

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);

  audit({ event: "withdrawal_rejected", userId: adminId, ip, detail: { txId: id, targetUser: user.traderId, principal, fee, totalRestored: totalToRestore, reason: parsed.data.reason } });

  createNotification(tx.userId, "withdrawal", "Withdrawal Rejected", `Your withdrawal of ${principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT was rejected: ${parsed.data.reason}. Funds have been returned to your balance.`, { link: "/wallet" });

  res.json({
    id: updated.id,
    userId: updated.userId,
    traderId: user.traderId,
    email: user.email,
    coin: updated.coin ?? "USDT",
    amount: principal,
    fee,
    walletAddress: updated.walletAddress ?? "",
    status: "rejected",
    txid: updated.txid ?? null,
    notes: updated.notes ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// USERS
router.get("/users", async (req, res) => {
  const { search, kycStatus } = req.query as Record<string, string>;
  let users = await db.select().from(usersTable);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u => u.email.toLowerCase().includes(s) || u.traderId.toLowerCase().includes(s));
  }
  if (kycStatus && kycStatus !== "all") {
    users = users.filter(u => u.kycStatus === kycStatus);
  }
  // Bulk-load all investments once to avoid N+1 per user
  const allInvs = await db.select().from(investmentsTable);
  const investedByUser = new Map<number, number>();
  for (const inv of allInvs) {
    investedByUser.set(inv.userId, (investedByUser.get(inv.userId) ?? 0) + Number(inv.amount));
  }

  res.json(users.map(u => ({
    id: u.id,
    email: u.email,
    traderId: u.traderId,
    balance: Number(u.balance),
    totalDeposited: Number(u.totalDeposited),
    totalInvested: Math.round((investedByUser.get(u.id) ?? 0) * 100) / 100,
    kycStatus: u.kycStatus,
    role: u.role,
    guildCode: u.guildCode ?? null,
    referredBy: u.referredBy ?? null,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, id));
  const totalInvested = invs.reduce((acc, i) => acc + Number(i.amount), 0);
  res.json({
    id: user.id,
    email: user.email,
    traderId: user.traderId,
    balance: Number(user.balance),
    totalDeposited: Number(user.totalDeposited),
    totalInvested,
    kycStatus: user.kycStatus,
    role: user.role,
    guildCode: user.guildCode ?? null,
    referredBy: user.referredBy ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/users/:id/credit-profit", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = AdminCreditProfitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { amount, description } = parsed.data;
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${amount}`,
    totalProfits: sql`${usersTable.totalProfits} + ${amount}`,
  }).where(eq(usersTable.id, id));
  await db.insert(transactionsTable).values({
    userId: id,
    type: "delivery_profit",
    amount: String(amount),
    status: "cleared",
    description,
  });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, id));
  const totalInvested = invs.reduce((acc, i) => acc + Number(i.amount), 0);

  audit({ event: "admin_credit_profit", userId: adminId, ip, detail: { targetUser: user.traderId, amount, description } });

  res.json({
    id: user.id,
    email: user.email,
    traderId: user.traderId,
    balance: Number(user.balance),
    totalDeposited: Number(user.totalDeposited),
    totalInvested,
    kycStatus: user.kycStatus,
    role: user.role,
    guildCode: user.guildCode ?? null,
    referredBy: user.referredBy ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

// KYC
router.get("/kyc", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  let kycs = await db.select().from(kycTable);
  if (!status || status === "pending") {
    kycs = kycs.filter(k => k.status === "pending");
  } else if (status !== "all") {
    kycs = kycs.filter(k => k.status === status);
  }
  const results = [];
  for (const k of kycs) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, k.userId)).limit(1);
    if (user) {
      results.push({
        id: k.id,
        userId: k.userId,
        traderId: user.traderId,
        email: user.email,
        idDocumentUrl: k.idDocumentUrl,
        selfieUrl: k.selfieUrl,
        proofOfAddressUrl: k.proofOfAddressUrl ?? null,
        status: k.status,
        rejectionReason: k.rejectionReason ?? null,
        submittedAt: k.submittedAt.toISOString(),
      });
    }
  }
  res.json(results);
});

router.post("/kyc/:id/approve", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [kyc] = await db.update(kycTable).set({ status: "approved", reviewedAt: new Date() }).where(eq(kycTable.id, id)).returning();
  await db.update(usersTable).set({ kycStatus: "approved" }).where(eq(usersTable.id, kyc.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, kyc.userId)).limit(1);

  audit({ event: "kyc_approved", userId: adminId, ip, detail: { kycId: id, targetUser: user.traderId } });

  createNotification(kyc.userId, "info", "KYC Verified ✓", "Your identity has been verified successfully. You now have full access to all platform features.", { link: "/profile" });

  res.json({
    id: kyc.id, userId: kyc.userId, traderId: user.traderId, email: user.email,
    idDocumentUrl: kyc.idDocumentUrl, selfieUrl: kyc.selfieUrl, proofOfAddressUrl: kyc.proofOfAddressUrl ?? null,
    status: kyc.status, rejectionReason: kyc.rejectionReason ?? null, submittedAt: kyc.submittedAt.toISOString(),
  });
});

router.post("/kyc/:id/reject", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = AdminRejectKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [kyc] = await db.update(kycTable).set({ status: "rejected", rejectionReason: parsed.data.reason, reviewedAt: new Date() }).where(eq(kycTable.id, id)).returning();
  await db.update(usersTable).set({ kycStatus: "rejected" }).where(eq(usersTable.id, kyc.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, kyc.userId)).limit(1);

  audit({ event: "kyc_rejected", userId: adminId, ip, detail: { kycId: id, targetUser: user.traderId, reason: parsed.data.reason } });

  createNotification(kyc.userId, "info", "KYC Rejected", `Your identity verification was rejected: ${parsed.data.reason}. Please resubmit with clearer documents.`, { link: "/profile" });

  res.json({
    id: kyc.id, userId: kyc.userId, traderId: user.traderId, email: user.email,
    idDocumentUrl: kyc.idDocumentUrl, selfieUrl: kyc.selfieUrl, proofOfAddressUrl: kyc.proofOfAddressUrl ?? null,
    status: kyc.status, rejectionReason: kyc.rejectionReason ?? null, submittedAt: kyc.submittedAt.toISOString(),
  });
});

// SHIPMENTS
router.get("/shipments", async (_req, res) => {
  const shipments = await db.select().from(shipmentsTable);
  res.json(shipments.map(s => ({
    id: s.id, title: s.title, cargoType: s.cargoType, origin: s.origin, destination: s.destination,
    originCoords: s.originCoords ?? null, destinationCoords: s.destinationCoords ?? null,
    profitPercent: Number(s.profitPercent), riskGrade: s.riskGrade,
    fundingGoal: Number(s.fundingGoal), fundingRaised: Number(s.fundingRaised),
    minInvestment: Number(s.minInvestment), departureDate: s.departureDate.toISOString(),
    arrivalDate: s.arrivalDate.toISOString(), transitDays: s.transitDays, status: s.status,
    freightForwarder: s.freightForwarder, vesselName: s.vesselName,
    hsCode: s.hsCode ?? null, weightTons: s.weightTons ? Number(s.weightTons) : null,
    volumeCbm: s.volumeCbm ? Number(s.volumeCbm) : null, description: s.description ?? null,
    investorCount: 0, myInvestment: null, createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/shipments", async (req, res) => {
  const parsed = AdminCreateShipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const dep = new Date(data.departureDate);
  const arr = new Date(data.arrivalDate);
  const transitDays = Math.max(1, Math.ceil((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));
  const [shipment] = await db.insert(shipmentsTable).values({
    title: data.title,
    cargoType: data.cargoType as typeof shipmentsTable.$inferSelect["cargoType"],
    origin: data.origin, destination: data.destination,
    originCoords: data.originCoords ?? null, destinationCoords: data.destinationCoords ?? null,
    profitPercent: String(data.profitPercent),
    riskGrade: data.riskGrade as typeof shipmentsTable.$inferSelect["riskGrade"],
    fundingGoal: String(data.fundingGoal), fundingRaised: "0",
    minInvestment: String(data.minInvestment),
    departureDate: dep, arrivalDate: arr, transitDays,
    freightForwarder: data.freightForwarder, vesselName: data.vesselName,
    hsCode: data.hsCode ?? null,
    weightTons: data.weightTons ? String(data.weightTons) : null,
    volumeCbm: data.volumeCbm ? String(data.volumeCbm) : null,
    description: data.description ?? null,
    status: "open",
  }).returning();
  res.status(201).json({
    id: shipment.id, title: shipment.title, cargoType: shipment.cargoType,
    origin: shipment.origin, destination: shipment.destination,
    originCoords: shipment.originCoords ?? null, destinationCoords: shipment.destinationCoords ?? null,
    profitPercent: Number(shipment.profitPercent), riskGrade: shipment.riskGrade,
    fundingGoal: Number(shipment.fundingGoal), fundingRaised: Number(shipment.fundingRaised),
    minInvestment: Number(shipment.minInvestment),
    departureDate: shipment.departureDate.toISOString(), arrivalDate: shipment.arrivalDate.toISOString(),
    transitDays: shipment.transitDays, status: shipment.status,
    freightForwarder: shipment.freightForwarder, vesselName: shipment.vesselName,
    hsCode: shipment.hsCode ?? null,
    weightTons: shipment.weightTons ? Number(shipment.weightTons) : null,
    volumeCbm: shipment.volumeCbm ? Number(shipment.volumeCbm) : null,
    description: shipment.description ?? null, investorCount: 0, myInvestment: null,
    createdAt: shipment.createdAt.toISOString(),
  });
});

router.patch("/shipments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = AdminUpdateShipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  const updates: Partial<typeof shipmentsTable.$inferInsert> = {};
  if (data.title) updates.title = data.title;
  if (data.profitPercent != null) updates.profitPercent = String(data.profitPercent);
  if (data.riskGrade) updates.riskGrade = data.riskGrade as typeof shipmentsTable.$inferSelect["riskGrade"];
  if (data.status) updates.status = data.status as typeof shipmentsTable.$inferSelect["status"];
  if (data.arrivalDate) updates.arrivalDate = new Date(data.arrivalDate);
  if (data.description) updates.description = data.description;
  const [shipment] = await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, id)).returning();
  res.json({
    id: shipment.id, title: shipment.title, cargoType: shipment.cargoType,
    origin: shipment.origin, destination: shipment.destination,
    originCoords: shipment.originCoords ?? null, destinationCoords: shipment.destinationCoords ?? null,
    profitPercent: Number(shipment.profitPercent), riskGrade: shipment.riskGrade,
    fundingGoal: Number(shipment.fundingGoal), fundingRaised: Number(shipment.fundingRaised),
    minInvestment: Number(shipment.minInvestment),
    departureDate: shipment.departureDate.toISOString(), arrivalDate: shipment.arrivalDate.toISOString(),
    transitDays: shipment.transitDays, status: shipment.status,
    freightForwarder: shipment.freightForwarder, vesselName: shipment.vesselName,
    hsCode: shipment.hsCode ?? null,
    weightTons: shipment.weightTons ? Number(shipment.weightTons) : null,
    volumeCbm: shipment.volumeCbm ? Number(shipment.volumeCbm) : null,
    description: shipment.description ?? null, investorCount: 0, myInvestment: null,
    createdAt: shipment.createdAt.toISOString(),
  });
});

router.post("/shipments/:id/deliver", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  if (shipment.status === "delivered") {
    res.status(400).json({ error: "Shipment already delivered" });
    return;
  }

  await db.update(shipmentsTable).set({ status: "delivered" }).where(eq(shipmentsTable.id, id));

  const investments = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.shipmentId, id), eq(investmentsTable.status, "active")));

  const commissionSummary: { investorTraderId: string; commissions: Awaited<ReturnType<typeof processGuildCommissions>> }[] = [];

  for (const inv of investments) {
    const profit = Number(inv.expectedProfit);
    const total = Number(inv.amount) + profit;

    await db.update(investmentsTable).set({
      status: "delivered",
      actualProfit: String(profit),
      deliveredAt: new Date(),
    }).where(eq(investmentsTable.id, inv.id));

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${total}`,
      totalProfits: sql`${usersTable.totalProfits} + ${profit}`,
    }).where(eq(usersTable.id, inv.userId));

    await db.insert(transactionsTable).values({
      userId: inv.userId,
      type: "delivery_profit",
      amount: String(profit),
      status: "cleared",
      description: `Delivery profit: ${shipment.title}`,
      shipmentId: id,
    });

    // Guild commissions — delegated to shared commission library (stores tier in notes, relatedUserId, shipmentId)
    const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
    const commResults = await processGuildCommissions(inv.userId, investor.traderId, profit, id, shipment.title, adminId);
    commissionSummary.push({ investorTraderId: investor.traderId, commissions: commResults });
  }

  audit({
    event: "shipment_delivered",
    userId: adminId,
    detail: { shipmentId: id, title: shipment.title, investorCount: investments.length, commissionSummary },
  });

  const [updated] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  res.json({
    id: updated.id, title: updated.title, cargoType: updated.cargoType,
    origin: updated.origin, destination: updated.destination,
    originCoords: updated.originCoords ?? null, destinationCoords: updated.destinationCoords ?? null,
    profitPercent: Number(updated.profitPercent), riskGrade: updated.riskGrade,
    fundingGoal: Number(updated.fundingGoal), fundingRaised: Number(updated.fundingRaised),
    minInvestment: Number(updated.minInvestment),
    departureDate: updated.departureDate.toISOString(), arrivalDate: updated.arrivalDate.toISOString(),
    transitDays: updated.transitDays, status: updated.status,
    freightForwarder: updated.freightForwarder, vesselName: updated.vesselName,
    hsCode: updated.hsCode ?? null,
    weightTons: updated.weightTons ? Number(updated.weightTons) : null,
    volumeCbm: updated.volumeCbm ? Number(updated.volumeCbm) : null,
    description: updated.description ?? null, investorCount: investments.length, myInvestment: null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// CRYPTO WALLETS
router.get("/crypto-wallets", async (_req, res) => {
  const wallets = await db.select().from(cryptoWalletsTable);
  res.json(wallets.map(w => ({ coin: w.coin, address: w.address, network: w.network })));
});

router.patch("/crypto-wallets", async (req, res) => {
  const parsed = AdminUpdateCryptoWalletsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  const coins = [
    { key: "btc" as const, network: "Bitcoin" },
    { key: "eth" as const, network: "Ethereum" },
    { key: "usdt" as const, network: "TRC-20" },
    { key: "bnb" as const, network: "BEP-20" },
    { key: "trx" as const, network: "TRON" },
  ];
  for (const { key, network } of coins) {
    const address = data[key];
    if (address) {
      const existing = await db.select().from(cryptoWalletsTable).where(eq(cryptoWalletsTable.coin, key.toUpperCase())).limit(1);
      if (existing.length > 0) {
        await db.update(cryptoWalletsTable).set({ address, network }).where(eq(cryptoWalletsTable.coin, key.toUpperCase()));
      } else {
        await db.insert(cryptoWalletsTable).values({ coin: key.toUpperCase(), address, network });
      }
    }
  }
  const wallets = await db.select().from(cryptoWalletsTable);
  res.json(wallets.map(w => ({ coin: w.coin, address: w.address, network: w.network })));
});

// GUILD / REFERRAL ADMIN ROUTES

// GET /admin/guild/commissions — full commission audit trail
router.get("/guild/commissions", async (req, res) => {
  const { userId: filterUserId } = req.query as Record<string, string>;

  let txs = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "guild_commission"));
  if (filterUserId) {
    const uid = parseInt(filterUserId);
    txs = txs.filter(t => t.userId === uid);
  }

  const results = [];
  for (const t of txs) {
    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, t.userId)).limit(1);
    let investorTraderId: string | null = null;
    if (t.relatedUserId) {
      const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, t.relatedUserId)).limit(1);
      investorTraderId = investor?.traderId ?? null;
    }
    results.push({
      id: t.id,
      recipientId: t.userId,
      recipientTraderId: recipient?.traderId ?? null,
      recipientEmail: recipient?.email ?? null,
      investorId: t.relatedUserId ?? null,
      investorTraderId,
      tier: parseTier(t.notes, t.description),
      amount: Number(t.amount),
      status: t.status,
      description: t.description ?? null,
      shipmentId: t.shipmentId ?? null,
      createdAt: t.createdAt.toISOString(),
    });
  }
  res.json(results);
});

// GET /admin/guild/stats — network-wide guild statistics
router.get("/guild/stats", async (_req, res) => {
  const allUsers = await db.select().from(usersTable);
  const allInvs = await db.select().from(investmentsTable);
  const allCommTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "guild_commission"));

  const withReferral = allUsers.filter(u => u.referredBy !== null && u.role === "user");
  const totalUsers = allUsers.filter(u => u.role === "user").length;
  const totalReferrers = allUsers.filter(u =>
    allUsers.some(other => other.referredBy === u.guildCode)
  ).length;

  const clearedComm = allCommTxs.filter(t => t.status === "cleared");
  const totalCommissionsPaid = clearedComm.reduce((acc, t) => acc + Number(t.amount), 0);

  const commByTier = { "1": 0, "2": 0, "3": 0 };
  for (const t of clearedComm) {
    const tier = parseTier(t.notes, t.description);
    if (tier === 1) commByTier["1"] += Number(t.amount);
    else if (tier === 2) commByTier["2"] += Number(t.amount);
    else if (tier === 3) commByTier["3"] += Number(t.amount);
  }

  // Top 10 earners by commission received
  const earningsByUser = new Map<number, number>();
  for (const t of clearedComm) {
    earningsByUser.set(t.userId, (earningsByUser.get(t.userId) ?? 0) + Number(t.amount));
  }
  const topEarners = [...earningsByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([uid, earned]) => {
      const user = allUsers.find(u => u.id === uid);
      return { traderId: user?.traderId ?? "?", email: user?.email ?? "?", earned: Math.round(earned * 100) / 100 };
    });

  // Top 10 referrers by referral count
  const referralCountByUser = new Map<string, number>();
  for (const u of withReferral) {
    if (u.referredBy) {
      referralCountByUser.set(u.referredBy, (referralCountByUser.get(u.referredBy) ?? 0) + 1);
    }
  }
  const topReferrers = [...referralCountByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([guildCode, count]) => {
      const user = allUsers.find(u => u.guildCode === guildCode);
      return { traderId: user?.traderId ?? "?", guildCode, referralCount: count };
    });

  res.json({
    totalUsers,
    totalWithReferral: withReferral.length,
    referralConversionRate: totalUsers > 0 ? Math.round((withReferral.length / totalUsers) * 10000) / 100 : 0,
    totalReferrers,
    totalCommissionsPaid: Math.round(totalCommissionsPaid * 100) / 100,
    commissionsByTier: {
      tier1: { total: Math.round(commByTier["1"] * 100) / 100, count: clearedComm.filter(t => parseTier(t.notes, t.description) === 1).length },
      tier2: { total: Math.round(commByTier["2"] * 100) / 100, count: clearedComm.filter(t => parseTier(t.notes, t.description) === 2).length },
      tier3: { total: Math.round(commByTier["3"] * 100) / 100, count: clearedComm.filter(t => parseTier(t.notes, t.description) === 3).length },
    },
    topEarners,
    topReferrers,
  });
});

// POST /admin/test/setup-referral-chain — create test users A→B→C→D with investments and commissions
// Only available in non-production environments
router.post("/test/setup-referral-chain", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Test endpoint disabled in production" });
    return;
  }

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("TestPass123!", 12);

  function guildCode(suffix: string) { return `TB-GUILD-TEST${suffix}`; }
  function traderId(suffix: string) { return `TB-TEST${suffix}`; }

  const chain: Array<{ label: string; email: string; traderId: string; guildCode: string; referredBy: string | null }> = [
    { label: "A", email: "chain-a@tradebox.test", traderId: traderId("A"), guildCode: guildCode("A"), referredBy: null },
    { label: "B", email: "chain-b@tradebox.test", traderId: traderId("B"), guildCode: guildCode("B"), referredBy: guildCode("A") },
    { label: "C", email: "chain-c@tradebox.test", traderId: traderId("C"), guildCode: guildCode("C"), referredBy: guildCode("B") },
    { label: "D", email: "chain-d@tradebox.test", traderId: traderId("D"), guildCode: guildCode("D"), referredBy: guildCode("C") },
  ];

  const createdUsers: Record<string, typeof usersTable.$inferSelect> = {};

  for (const entry of chain) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, entry.email)).limit(1);
    if (existing.length > 0) {
      await db.delete(usersTable).where(eq(usersTable.email, entry.email));
    }
    const [user] = await db.insert(usersTable).values({
      email: entry.email,
      passwordHash: hash,
      traderId: entry.traderId,
      guildCode: entry.guildCode,
      referredBy: entry.referredBy,
      role: "user",
      kycStatus: "none",
    }).returning();
    createdUsers[entry.label] = user;
  }

  // Give user D $1,000 balance and create a shipment
  const userD = createdUsers["D"];
  await db.update(usersTable).set({ balance: "1000", totalDeposited: "1000" }).where(eq(usersTable.id, userD.id));

  // Create a test shipment
  const dep = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const arr = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const [shipment] = await db.insert(shipmentsTable).values({
    title: "Test Commission Shipment A→D",
    cargoType: "electronics",
    origin: "Shanghai, CN",
    destination: "Rotterdam, NL",
    profitPercent: "10",
    riskGrade: "B",
    fundingGoal: "1000",
    fundingRaised: "0",
    minInvestment: "100",
    departureDate: dep,
    arrivalDate: arr,
    transitDays: 6,
    freightForwarder: "Test Forwarder",
    vesselName: "TEST VESSEL",
    status: "in_transit",
  }).returning();

  // D invests $1,000
  const principal = 1000;
  const profitPct = 10;
  const expectedProfit = Math.round(principal * profitPct / 100 * 100) / 100;
  const [investment] = await db.insert(investmentsTable).values({
    userId: userD.id,
    shipmentId: shipment.id,
    amount: String(principal),
    profitPercent: String(profitPct),
    expectedProfit: String(expectedProfit),
    status: "active",
  }).returning();

  await db.update(shipmentsTable).set({ fundingRaised: String(principal) }).where(eq(shipmentsTable.id, shipment.id));
  await db.update(usersTable).set({ balance: "0" }).where(eq(usersTable.id, userD.id));

  // Deliver the shipment (this triggers guild commissions)
  await db.update(shipmentsTable).set({ status: "delivered" }).where(eq(shipmentsTable.id, shipment.id));
  await db.update(investmentsTable).set({
    status: "delivered",
    actualProfit: String(expectedProfit),
    deliveredAt: new Date(),
  }).where(eq(investmentsTable.id, investment.id));

  const total = principal + expectedProfit;
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${total}`,
    totalProfits: sql`${usersTable.totalProfits} + ${expectedProfit}`,
  }).where(eq(usersTable.id, userD.id));

  await db.insert(transactionsTable).values({
    userId: userD.id,
    type: "delivery_profit",
    amount: String(expectedProfit),
    status: "cleared",
    description: `Delivery profit: ${shipment.title}`,
    shipmentId: shipment.id,
  });

  // Process guild commissions
  const commResults = await processGuildCommissions(
    userD.id, userD.traderId, expectedProfit, shipment.id, shipment.title, "test"
  );

  // Fetch final balances
  const finalUsers: Record<string, { traderId: string; balance: number; earned: number }> = {};
  for (const [label, u] of Object.entries(createdUsers)) {
    const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, u.id)).limit(1);
    const commTxs = await db.select().from(transactionsTable).where(
      and(eq(transactionsTable.userId, u.id), eq(transactionsTable.type, "guild_commission"))
    );
    const earned = commTxs.filter(t => t.status === "cleared").reduce((acc, t) => acc + Number(t.amount), 0);
    finalUsers[label] = { traderId: fresh.traderId, balance: Number(fresh.balance), earned };
  }

  res.json({
    chain: "A → B → C → D",
    shipmentId: shipment.id,
    investmentPrincipal: principal,
    investmentProfit: expectedProfit,
    commissionRates: { tier1: "7%", tier2: "2%", tier3: "1%" },
    commissionsGenerated: commResults,
    userBalances: finalUsers,
    expected: {
      A_earns: `${(profitPct / 100 * 7).toFixed(2)}% of profit = $${(expectedProfit * 0.07).toFixed(2)}`,
      B_earns: `${(profitPct / 100 * 2).toFixed(2)}% of profit = $${(expectedProfit * 0.02).toFixed(2)}`,
      C_earns: `${(profitPct / 100 * 1).toFixed(2)}% of profit = $${(expectedProfit * 0.01).toFixed(2)}`,
      D_earns: `profit = $${expectedProfit.toFixed(2)} returned to balance`,
    },
  });
});

// SUPPORT SETTINGS (admin path)
router.get("/support-settings", async (_req, res) => {
  const [settings] = await db.select().from(supportSettingsTable).limit(1);
  res.json(settings ?? {
    telegramSupport: null, whatsappSupport: null, supportEmail: null,
    telegramGroup: null, whatsappCommunity: null, announcementChannel: null,
  });
});

router.patch("/support-settings", async (req, res) => {
  const parsed = SupportSettingsPatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { telegramSupport, whatsappSupport, supportEmail, telegramGroup, whatsappCommunity, announcementChannel } = parsed.data;

  const existing = await db.select().from(supportSettingsTable).limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(supportSettingsTable).values({
      telegramSupport, whatsappSupport, supportEmail, telegramGroup, whatsappCommunity, announcementChannel,
    }).returning();
    res.json(row);
  } else {
    const updates: Record<string, unknown> = {};
    if (telegramSupport !== undefined) updates.telegramSupport = telegramSupport;
    if (whatsappSupport !== undefined) updates.whatsappSupport = whatsappSupport;
    if (supportEmail !== undefined) updates.supportEmail = supportEmail;
    if (telegramGroup !== undefined) updates.telegramGroup = telegramGroup;
    if (whatsappCommunity !== undefined) updates.whatsappCommunity = whatsappCommunity;
    if (announcementChannel !== undefined) updates.announcementChannel = announcementChannel;
    const [row] = await db.update(supportSettingsTable).set(updates).where(eq(supportSettingsTable.id, existing[0].id)).returning();
    res.json(row);
  }
});

export default router;
