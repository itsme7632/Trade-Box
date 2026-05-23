import { Router } from "express";
import { db, usersTable, transactionsTable, kycTable, shipmentsTable, investmentsTable, cryptoWalletsTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { AdminRejectDepositBody, AdminProcessWithdrawalBody, AdminRejectKycBody, AdminCreditProfitBody, AdminCreateShipmentBody, AdminUpdateShipmentBody, AdminUpdateCryptoWalletsBody } from "@workspace/api-zod";

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
router.get("/deposits", async (_req, res) => {
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "deposit"));
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
        status: tx.status === "reviewing" ? "reviewing" : tx.status === "cleared" ? "cleared" : "rejected",
        notes: tx.notes ?? null,
        createdAt: tx.createdAt.toISOString(),
      });
    }
  }
  res.json(results);
});

router.post("/deposits/:id/approve", async (req, res) => {
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
  const id = parseInt(req.params.id);
  const parsed = AdminRejectDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  await db.update(transactionsTable).set({ status: "rejected", notes: parsed.data.reason }).where(eq(transactionsTable.id, id));
  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
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
      results.push({
        id: tx.id,
        userId: tx.userId,
        traderId: user.traderId,
        email: user.email,
        coin: tx.coin ?? "USDT",
        amount: Math.abs(Number(tx.amount)),
        fee: Math.abs(Number(tx.amount)) * 0.01,
        walletAddress: tx.walletAddress ?? "",
        status: tx.status,
        txid: tx.txid ?? null,
        createdAt: tx.createdAt.toISOString(),
      });
    }
  }
  res.json(results);
});

router.post("/withdrawals/:id/process", async (req, res) => {
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
  const amount = Math.abs(Number(tx.amount));
  await db.update(transactionsTable).set({ status: "cleared", txid: parsed.data.txid }).where(eq(transactionsTable.id, id));
  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} - ${amount}`,
    totalWithdrawn: sql`${usersTable.totalWithdrawn} + ${amount}`,
  }).where(eq(usersTable.id, tx.userId));

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
  res.json({
    id: updated.id,
    userId: updated.userId,
    traderId: user.traderId,
    email: user.email,
    coin: updated.coin ?? "USDT",
    amount,
    fee: amount * 0.01,
    walletAddress: updated.walletAddress ?? "",
    status: "cleared",
    txid: updated.txid ?? null,
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
  res.json(users.map(u => ({
    id: u.id,
    email: u.email,
    traderId: u.traderId,
    balance: Number(u.balance),
    totalDeposited: Number(u.totalDeposited),
    totalInvested: 0,
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
router.get("/kyc", async (_req, res) => {
  const kycs = await db.select().from(kycTable).where(eq(kycTable.status, "pending"));
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
  const id = parseInt(req.params.id);
  const [kyc] = await db.update(kycTable).set({ status: "approved", reviewedAt: new Date() }).where(eq(kycTable.id, id)).returning();
  await db.update(usersTable).set({ kycStatus: "approved" }).where(eq(usersTable.id, kyc.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, kyc.userId)).limit(1);
  res.json({
    id: kyc.id, userId: kyc.userId, traderId: user.traderId, email: user.email,
    idDocumentUrl: kyc.idDocumentUrl, selfieUrl: kyc.selfieUrl, proofOfAddressUrl: kyc.proofOfAddressUrl ?? null,
    status: kyc.status, rejectionReason: kyc.rejectionReason ?? null, submittedAt: kyc.submittedAt.toISOString(),
  });
});

router.post("/kyc/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = AdminRejectKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [kyc] = await db.update(kycTable).set({ status: "rejected", rejectionReason: parsed.data.reason, reviewedAt: new Date() }).where(eq(kycTable.id, id)).returning();
  await db.update(usersTable).set({ kycStatus: "rejected" }).where(eq(usersTable.id, kyc.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, kyc.userId)).limit(1);
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
  const id = parseInt(req.params.id);
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }

  await db.update(shipmentsTable).set({ status: "delivered" }).where(eq(shipmentsTable.id, id));

  const investments = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.shipmentId, id), eq(investmentsTable.status, "active")));

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

    // Guild commissions
    const [investor] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
    if (investor.referredBy) {
      const [referrer1] = await db.select().from(usersTable).where(eq(usersTable.guildCode, investor.referredBy)).limit(1);
      if (referrer1) {
        const comm1 = profit * 0.07;
        await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${comm1}` }).where(eq(usersTable.id, referrer1.id));
        await db.insert(transactionsTable).values({ userId: referrer1.id, type: "guild_commission", amount: String(comm1), status: "cleared", description: `Tier 1 commission from ${investor.traderId}` });

        if (referrer1.referredBy) {
          const [referrer2] = await db.select().from(usersTable).where(eq(usersTable.guildCode, referrer1.referredBy)).limit(1);
          if (referrer2) {
            const comm2 = profit * 0.02;
            await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${comm2}` }).where(eq(usersTable.id, referrer2.id));
            await db.insert(transactionsTable).values({ userId: referrer2.id, type: "guild_commission", amount: String(comm2), status: "cleared", description: `Tier 2 commission from ${investor.traderId}` });

            if (referrer2.referredBy) {
              const [referrer3] = await db.select().from(usersTable).where(eq(usersTable.guildCode, referrer2.referredBy)).limit(1);
              if (referrer3) {
                const comm3 = profit * 0.01;
                await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${comm3}` }).where(eq(usersTable.id, referrer3.id));
                await db.insert(transactionsTable).values({ userId: referrer3.id, type: "guild_commission", amount: String(comm3), status: "cleared", description: `Tier 3 commission from ${investor.traderId}` });
              }
            }
          }
        }
      }
    }
  }

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

export default router;
