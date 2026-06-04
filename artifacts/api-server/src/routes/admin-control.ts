import { Router } from "express";
import { db, usersTable, transactionsTable, investmentsTable, announcementsTable, platformSettingsTable, shipmentsTable, kycTable } from "@workspace/db";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin } from "../lib/auth";
import { audit, getClientIp } from "../lib/audit";

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUser(u: typeof usersTable.$inferSelect, extras: Record<string, unknown> = {}) {
  return {
    id: u.id,
    email: u.email,
    traderId: u.traderId,
    role: u.role,
    status: u.status,
    kycStatus: u.kycStatus,
    balance: Number(u.balance),
    totalDeposited: Number(u.totalDeposited),
    totalWithdrawn: Number(u.totalWithdrawn),
    totalProfits: Number(u.totalProfits),
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    username: u.username ?? null,
    country: u.country ?? null,
    guildCode: u.guildCode,
    referredBy: u.referredBy ?? null,
    registrationIp: u.registrationIp ?? null,
    lastLoginIp: u.lastLoginIp ?? null,
    twoFactorEnabled: u.twoFactorEnabled,
    createdAt: u.createdAt.toISOString(),
    ...extras,
  };
}

async function getReferralChain(userId: number): Promise<{ traderId: string; guildCode: string }[]> {
  const chain: { traderId: string; guildCode: string }[] = [];
  const [user] = await db.select({ referredBy: usersTable.referredBy })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.referredBy) return chain;

  let guildCode: string | null = user.referredBy;
  let depth = 0;
  while (guildCode && depth < 3) {
    const [ref] = await db.select({ traderId: usersTable.traderId, guildCode: usersTable.guildCode, referredBy: usersTable.referredBy })
      .from(usersTable).where(eq(usersTable.guildCode, guildCode)).limit(1);
    if (!ref) break;
    chain.push({ traderId: ref.traderId, guildCode: ref.guildCode });
    guildCode = ref.referredBy ?? null;
    depth++;
  }
  return chain;
}

// ── ENHANCED USERS LIST ───────────────────────────────────────────────────────

router.get("/users", async (req, res) => {
  const { search, kycStatus, status, role } = req.query as Record<string, string>;
  let users = await db.select().from(usersTable);

  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u =>
      u.email.toLowerCase().includes(s) ||
      u.traderId.toLowerCase().includes(s) ||
      (u.username ?? "").toLowerCase().includes(s) ||
      (u.firstName ?? "").toLowerCase().includes(s) ||
      (u.lastName ?? "").toLowerCase().includes(s)
    );
  }
  if (kycStatus && kycStatus !== "all") users = users.filter(u => u.kycStatus === kycStatus);
  if (status && status !== "all") users = users.filter(u => u.status === status);
  if (role && role !== "all") users = users.filter(u => u.role === role);

  const allInvs = await db.select().from(investmentsTable);
  const investedByUser = new Map<number, number>();
  for (const inv of allInvs) {
    investedByUser.set(inv.userId, (investedByUser.get(inv.userId) ?? 0) + Number(inv.amount));
  }

  const allCommTxs = await db.select({
    userId: transactionsTable.userId,
    amount: transactionsTable.amount,
  }).from(transactionsTable).where(eq(transactionsTable.type, "guild_commission"));
  const commByUser = new Map<number, number>();
  for (const t of allCommTxs) {
    commByUser.set(t.userId, (commByUser.get(t.userId) ?? 0) + Number(t.amount));
  }

  res.json(users.map(u => formatUser(u, {
    totalInvested: Math.round((investedByUser.get(u.id) ?? 0) * 100) / 100,
    totalCommissions: Math.round((commByUser.get(u.id) ?? 0) * 100) / 100,
  })));
});

// ── USER DETAIL ───────────────────────────────────────────────────────────────

router.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }

  const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, id));
  const totalInvested = invs.reduce((acc, i) => acc + Number(i.amount), 0);

  const commTxs = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, id), eq(transactionsTable.type, "guild_commission")));
  const totalCommissions = commTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  const referralChain = await getReferralChain(id);

  res.json(formatUser(u, {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCommissions: Math.round(totalCommissions * 100) / 100,
    referralChain,
    investments: invs.map(i => ({
      id: i.id, shipmentId: i.shipmentId, amount: Number(i.amount),
      expectedProfit: Number(i.expectedProfit), actualProfit: i.actualProfit ? Number(i.actualProfit) : null,
      status: i.status, createdAt: i.createdAt.toISOString(),
    })),
  }));
});

// ── USER ACTIONS ──────────────────────────────────────────────────────────────

router.post("/users/:id/suspend", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (u.role === "admin") { res.status(400).json({ error: "Cannot suspend admin accounts" }); return; }
  const { reason } = req.body;
  await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, id));
  audit({ event: "user_suspended", userId: adminId, ip, detail: { targetUser: u.traderId, reason } });
  res.json({ success: true, status: "suspended" });
});

router.post("/users/:id/unsuspend", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, id));
  audit({ event: "user_unsuspended", userId: adminId, ip, detail: { targetUser: u.traderId } });
  res.json({ success: true, status: "active" });
});

router.post("/users/:id/ban", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (u.role === "admin") { res.status(400).json({ error: "Cannot ban admin accounts" }); return; }
  const { reason } = req.body;
  await db.update(usersTable).set({ status: "banned", sessionVersion: sql`${usersTable.sessionVersion} + 1` }).where(eq(usersTable.id, id));
  audit({ event: "user_banned", userId: adminId, ip, detail: { targetUser: u.traderId, reason } });
  res.json({ success: true, status: "banned" });
});

router.post("/users/:id/reset-password", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = z.object({ newPassword: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "newPassword must be at least 8 characters" }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({
    passwordHash,
    sessionVersion: sql`${usersTable.sessionVersion} + 1`,
  }).where(eq(usersTable.id, id));
  audit({ event: "admin_reset_password", userId: adminId, ip, detail: { targetUser: u.traderId } });
  res.json({ success: true });
});

router.post("/users/:id/force-logout", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  await db.update(usersTable).set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` }).where(eq(usersTable.id, id));
  audit({ event: "admin_force_logout", userId: adminId, ip, detail: { targetUser: u.traderId } });
  res.json({ success: true });
});

router.post("/users/:id/promote", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (u.role === "admin") { res.status(400).json({ error: "User is already an admin" }); return; }
  await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, id));
  audit({ event: "user_promoted", userId: adminId, ip, detail: { targetUser: u.traderId } });
  res.json({ success: true, role: "admin" });
});

router.post("/users/:id/demote", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  if (id === adminId) { res.status(400).json({ error: "Cannot demote yourself" }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (u.role !== "admin") { res.status(400).json({ error: "User is not an admin" }); return; }
  await db.update(usersTable).set({ role: "user" }).where(eq(usersTable.id, id));
  audit({ event: "user_demoted", userId: adminId, ip, detail: { targetUser: u.traderId } });
  res.json({ success: true, role: "user" });
});

router.post("/users/:id/add-balance", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = z.object({ amount: z.number().positive(), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "amount (positive number) required" }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const { amount, note } = parsed.data;
  await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${amount}` }).where(eq(usersTable.id, id));
  await db.insert(transactionsTable).values({
    userId: id,
    type: "deposit",
    amount: String(amount),
    status: "cleared",
    description: note ? `Admin credit: ${note}` : "Admin manual balance credit",
    notes: "admin_manual",
  });
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  audit({ event: "admin_add_balance", userId: adminId, ip, detail: { targetUser: u.traderId, amount, note } });
  res.json({ success: true, newBalance: Number(updated.balance) });
});

router.post("/users/:id/deduct-balance", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = z.object({ amount: z.number().positive(), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "amount (positive number) required" }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const { amount, note } = parsed.data;
  if (Number(u.balance) < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
  await db.update(usersTable).set({ balance: sql`${usersTable.balance} - ${amount}` }).where(eq(usersTable.id, id));
  await db.insert(transactionsTable).values({
    userId: id,
    type: "withdrawal",
    amount: String(-amount),
    status: "cleared",
    description: note ? `Admin debit: ${note}` : "Admin manual balance deduction",
    notes: "admin_manual",
  });
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  audit({ event: "admin_deduct_balance", userId: adminId, ip, detail: { targetUser: u.traderId, amount, note } });
  res.json({ success: true, newBalance: Number(updated.balance) });
});

router.post("/users/:id/add-commission", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = z.object({ amount: z.number().positive(), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "amount (positive number) required" }); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const { amount, note } = parsed.data;
  await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${amount}` }).where(eq(usersTable.id, id));
  await db.insert(transactionsTable).values({
    userId: id,
    type: "guild_commission",
    amount: String(amount),
    status: "cleared",
    description: note ? `Manual commission: ${note}` : "Admin manual commission credit",
    notes: "admin_manual",
  });
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  audit({ event: "admin_add_commission", userId: adminId, ip, detail: { targetUser: u.traderId, amount, note } });
  res.json({ success: true, newBalance: Number(updated.balance) });
});

// ── PLATFORM SETTINGS ─────────────────────────────────────────────────────────

const SettingsPatchBody = z.object({
  siteName: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  telegramLink: z.string().optional(),
  whatsappLink: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  requireKyc: z.boolean().optional(),
  referralsEnabled: z.boolean().optional(),
  minDeposit: z.number().nonnegative().optional(),
  minWithdrawal: z.number().nonnegative().optional(),
  withdrawalFeePercent: z.number().min(0).max(100).optional(),
  tier1Rate: z.number().min(0).max(100).optional(),
  tier2Rate: z.number().min(0).max(100).optional(),
  tier3Rate: z.number().min(0).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  sessionTimeoutDays: z.number().int().min(1).max(365).optional(),
  maxLoginAttempts: z.number().int().min(1).max(100).optional(),
});

router.get("/settings", async (_req, res) => {
  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(platformSettingsTable).values({}).returning();
    res.json(serializeSettings(created));
    return;
  }
  res.json(serializeSettings(settings));
});

router.patch("/settings", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const parsed = SettingsPatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.siteName !== undefined) updates.siteName = data.siteName;
  if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
  if (data.faviconUrl !== undefined) updates.faviconUrl = data.faviconUrl;
  if (data.supportEmail !== undefined) updates.supportEmail = data.supportEmail;
  if (data.telegramLink !== undefined) updates.telegramLink = data.telegramLink;
  if (data.whatsappLink !== undefined) updates.whatsappLink = data.whatsappLink;
  if (data.registrationEnabled !== undefined) updates.registrationEnabled = data.registrationEnabled;
  if (data.requireKyc !== undefined) updates.requireKyc = data.requireKyc;
  if (data.referralsEnabled !== undefined) updates.referralsEnabled = data.referralsEnabled;
  if (data.minDeposit !== undefined) updates.minDeposit = String(data.minDeposit);
  if (data.minWithdrawal !== undefined) updates.minWithdrawal = String(data.minWithdrawal);
  if (data.withdrawalFeePercent !== undefined) updates.withdrawalFeePercent = String(data.withdrawalFeePercent);
  if (data.tier1Rate !== undefined) updates.tier1Rate = String(data.tier1Rate);
  if (data.tier2Rate !== undefined) updates.tier2Rate = String(data.tier2Rate);
  if (data.tier3Rate !== undefined) updates.tier3Rate = String(data.tier3Rate);
  if (data.maintenanceMode !== undefined) updates.maintenanceMode = data.maintenanceMode;
  if (data.sessionTimeoutDays !== undefined) updates.sessionTimeoutDays = data.sessionTimeoutDays;
  if (data.maxLoginAttempts !== undefined) updates.maxLoginAttempts = data.maxLoginAttempts;

  const existing = await db.select().from(platformSettingsTable).limit(1);
  let result;
  if (existing.length === 0) {
    [result] = await db.insert(platformSettingsTable).values(updates as any).returning();
  } else {
    [result] = await db.update(platformSettingsTable).set(updates).where(eq(platformSettingsTable.id, existing[0].id)).returning();
  }
  audit({ event: "settings_updated", userId: adminId, ip, detail: { changes: Object.keys(updates) } });
  res.json(serializeSettings(result));
});

function serializeSettings(s: typeof platformSettingsTable.$inferSelect) {
  return {
    id: s.id,
    siteName: s.siteName,
    logoUrl: s.logoUrl ?? null,
    faviconUrl: s.faviconUrl ?? null,
    supportEmail: s.supportEmail ?? null,
    telegramLink: s.telegramLink ?? null,
    whatsappLink: s.whatsappLink ?? null,
    registrationEnabled: s.registrationEnabled,
    requireKyc: s.requireKyc,
    referralsEnabled: s.referralsEnabled,
    minDeposit: Number(s.minDeposit),
    minWithdrawal: Number(s.minWithdrawal),
    withdrawalFeePercent: Number(s.withdrawalFeePercent),
    tier1Rate: Number(s.tier1Rate),
    tier2Rate: Number(s.tier2Rate),
    tier3Rate: Number(s.tier3Rate),
    maintenanceMode: s.maintenanceMode,
    sessionTimeoutDays: s.sessionTimeoutDays,
    maxLoginAttempts: s.maxLoginAttempts,
    updatedAt: s.updatedAt.toISOString(),
  };
}

// ── PLAN MANAGEMENT ───────────────────────────────────────────────────────────

router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(shipmentsTable);
  const allInvs = await db.select({ shipmentId: investmentsTable.shipmentId, amount: investmentsTable.amount })
    .from(investmentsTable);
  const invCountByPlan = new Map<number, number>();
  const invVolByPlan = new Map<number, number>();
  for (const inv of allInvs) {
    invCountByPlan.set(inv.shipmentId, (invCountByPlan.get(inv.shipmentId) ?? 0) + 1);
    invVolByPlan.set(inv.shipmentId, (invVolByPlan.get(inv.shipmentId) ?? 0) + Number(inv.amount));
  }
  res.json(plans.map(p => ({
    id: p.id,
    title: p.title,
    cargoType: p.cargoType,
    origin: p.origin,
    destination: p.destination,
    profitPercent: Number(p.profitPercent),
    riskGrade: p.riskGrade,
    fundingGoal: Number(p.fundingGoal),
    fundingRaised: Number(p.fundingRaised),
    minInvestment: Number(p.minInvestment),
    departureDate: p.departureDate.toISOString(),
    arrivalDate: p.arrivalDate.toISOString(),
    transitDays: p.transitDays,
    status: p.status,
    freightForwarder: p.freightForwarder,
    vesselName: p.vesselName,
    hsCode: p.hsCode ?? null,
    weightTons: p.weightTons ? Number(p.weightTons) : null,
    volumeCbm: p.volumeCbm ? Number(p.volumeCbm) : null,
    description: p.description ?? null,
    isFeatured: p.isFeatured === 1,
    isArchived: (p as any).isArchived === 1,
    investorCount: invCountByPlan.get(p.id) ?? 0,
    investorVolume: Math.round((invVolByPlan.get(p.id) ?? 0) * 100) / 100,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/plans/:id/toggle-featured", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const [plan] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  const newFeatured = plan.isFeatured === 1 ? 0 : 1;
  await db.update(shipmentsTable).set({ isFeatured: newFeatured }).where(eq(shipmentsTable.id, id));
  audit({ event: "plan_featured_toggled", userId: adminId, detail: { planId: id, isFeatured: newFeatured === 1 } });
  res.json({ success: true, isFeatured: newFeatured === 1 });
});

router.post("/plans/:id/activate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const [plan] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (plan.status === "delivered") { res.status(400).json({ error: "Cannot reactivate a delivered plan" }); return; }
  await db.update(shipmentsTable).set({ status: "open" }).where(eq(shipmentsTable.id, id));
  audit({ event: "plan_activated", userId: adminId, detail: { planId: id } });
  res.json({ success: true, status: "open" });
});

router.post("/plans/:id/deactivate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const [plan] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (plan.status === "delivered") { res.status(400).json({ error: "Plan already delivered" }); return; }
  await db.update(shipmentsTable).set({ status: "funded" }).where(eq(shipmentsTable.id, id));
  audit({ event: "plan_deactivated", userId: adminId, detail: { planId: id } });
  res.json({ success: true, status: "funded" });
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

const AnnouncementBody = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["popup", "banner"]).default("banner"),
  targetAudience: z.enum(["all", "kyc_approved", "kyc_pending", "no_kyc"]).default("all"),
  isActive: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

router.get("/announcements", async (_req, res) => {
  const rows = await db.select().from(announcementsTable);
  res.json(rows.map(serializeAnnouncement));
});

router.post("/announcements", async (req, res) => {
  const adminId = (req as any).user.userId;
  const parsed = AnnouncementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const [row] = await db.insert(announcementsTable).values({
    title: d.title,
    message: d.message,
    type: d.type,
    targetAudience: d.targetAudience,
    isActive: d.isActive,
    scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
    expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    createdBy: adminId,
  }).returning();
  audit({ event: "announcement_created", userId: adminId, detail: { id: row.id, title: row.title } });
  res.status(201).json(serializeAnnouncement(row));
});

router.patch("/announcements/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const parsed = AnnouncementBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.title !== undefined) updates.title = d.title;
  if (d.message !== undefined) updates.message = d.message;
  if (d.type !== undefined) updates.type = d.type;
  if (d.targetAudience !== undefined) updates.targetAudience = d.targetAudience;
  if (d.isActive !== undefined) updates.isActive = d.isActive;
  if (d.scheduledAt !== undefined) updates.scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
  if (d.expiresAt !== undefined) updates.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
  const [row] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  audit({ event: "announcement_updated", userId: adminId, detail: { id, changes: Object.keys(updates) } });
  res.json(serializeAnnouncement(row));
});

router.delete("/announcements/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  audit({ event: "announcement_deleted", userId: adminId, detail: { id } });
  res.json({ success: true });
});

function serializeAnnouncement(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    type: a.type,
    targetAudience: a.targetAudience,
    isActive: a.isActive,
    scheduledAt: a.scheduledAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdBy: a.createdBy ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

// ── ENHANCED STATS ────────────────────────────────────────────────────────────

router.get("/analytics", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const allUsers = await db.select().from(usersTable);
  const allTxs = await db.select().from(transactionsTable);
  const allShipments = await db.select().from(shipmentsTable);
  const kycs = await db.select().from(kycTable);

  const totalUsers = allUsers.filter(u => u.role === "user").length;
  const activeUsers = allUsers.filter(u => u.role === "user" && u.status === "active").length;
  const suspendedUsers = allUsers.filter(u => u.status === "suspended").length;
  const bannedUsers = allUsers.filter(u => u.status === "banned").length;
  const pendingKyc = kycs.filter(k => k.status === "pending").length;
  const approvedKyc = allUsers.filter(u => u.kycStatus === "approved").length;

  const pendingDeposits = allTxs.filter(t => t.type === "deposit" && t.status === "reviewing").length;
  const pendingWithdrawals = allTxs.filter(t => t.type === "withdrawal" && t.status === "in_transit").length;

  const todayTxs = allTxs.filter(t => t.createdAt >= todayStart && t.createdAt < tomorrowStart);
  const depositsToday = todayTxs.filter(t => t.type === "deposit" && t.status === "cleared")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const withdrawalsToday = todayTxs.filter(t => t.type === "withdrawal" && t.status === "cleared")
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const registrationsToday = allUsers.filter(u => u.createdAt >= todayStart && u.createdAt < tomorrowStart).length;

  const totalDeposited = allTxs.filter(t => t.type === "deposit" && t.status === "cleared")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalWithdrawn = allTxs.filter(t => t.type === "withdrawal" && t.status === "cleared")
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const totalProfitPaid = allTxs.filter(t => t.type === "delivery_profit" && t.status === "cleared")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalCommissionsPaid = allTxs.filter(t => t.type === "guild_commission" && t.status === "cleared")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const activeShipments = allShipments.filter(s => ["open", "funded", "in_transit"].includes(s.status)).length;
  const openPlans = allShipments.filter(s => s.status === "open").length;

  res.json({
    users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers, registrationsToday },
    kyc: { pending: pendingKyc, approved: approvedKyc },
    financials: {
      totalDeposited: Math.round(totalDeposited * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      totalProfitPaid: Math.round(totalProfitPaid * 100) / 100,
      totalCommissionsPaid: Math.round(totalCommissionsPaid * 100) / 100,
      depositsToday: Math.round(depositsToday * 100) / 100,
      withdrawalsToday: Math.round(withdrawalsToday * 100) / 100,
    },
    pending: { deposits: pendingDeposits, withdrawals: pendingWithdrawals, kyc: pendingKyc },
    shipments: { active: activeShipments, open: openPlans },
  });
});

export default router;
