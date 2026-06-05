import { Router } from "express";
import { db, usersTable, transactionsTable, investmentsTable, announcementsTable, platformSettingsTable, shipmentsTable, kycTable } from "@workspace/db";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, requireAdmin } from "../lib/auth";
import { audit, getClientIp, getAuditLog } from "../lib/audit";
import { getAnnouncementStats } from "./announcements-public";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Ensure uploads directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Auto-migrate is_archived column ──────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS is_archived INTEGER NOT NULL DEFAULT 0`);
  } catch (_e) {}
})();

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

function serializePlan(p: any, invCountByPlan: Map<number, number>, invVolByPlan: Map<number, number>) {
  return {
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
    departureDate: p.departureDate instanceof Date ? p.departureDate.toISOString() : p.departureDate,
    arrivalDate: p.arrivalDate instanceof Date ? p.arrivalDate.toISOString() : p.arrivalDate,
    transitDays: p.transitDays,
    status: p.status,
    freightForwarder: p.freightForwarder,
    vesselName: p.vesselName,
    hsCode: p.hsCode ?? null,
    weightTons: p.weightTons ? Number(p.weightTons) : null,
    volumeCbm: p.volumeCbm ? Number(p.volumeCbm) : null,
    description: p.description ?? null,
    isFeatured: p.isFeatured === 1,
    isArchived: (p as any).is_archived === 1 || (p as any).isArchived === 1,
    investorCount: invCountByPlan.get(p.id) ?? 0,
    investorVolume: Math.round((invVolByPlan.get(p.id) ?? 0) * 100) / 100,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
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

// ── BRANDING UPLOAD ───────────────────────────────────────────────────────────

router.post("/upload/branding", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);

  const parsed = z.object({
    fileData: z.string().min(1),
    fileName: z.string().min(1),
    type: z.enum(["logo", "favicon"]),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: "fileData, fileName, and type are required" }); return; }

  const { fileData, fileName, type } = parsed.data;

  const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
  const ext = path.extname(fileName).toLowerCase() || (type === "favicon" ? ".ico" : ".png");
  const safeName = `${type}-${Date.now()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, safeName);

  try {
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
  } catch {
    res.status(500).json({ error: "Failed to save file" }); return;
  }

  const url = `/api/uploads/${safeName}`;
  const settingKey = type === "logo" ? "logoUrl" : "faviconUrl";

  const existing = await db.select().from(platformSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(platformSettingsTable).values({ [settingKey]: url } as any);
  } else {
    await db.update(platformSettingsTable).set({ [settingKey]: url } as any).where(eq(platformSettingsTable.id, existing[0].id));
  }

  audit({ event: "branding_uploaded", userId: adminId, ip, detail: { type, url } });
  res.json({ url, settingKey });
});

// ── PLAN MANAGEMENT ───────────────────────────────────────────────────────────

router.get("/plans", async (_req, res) => {
  const plans = await db.execute(sql`SELECT * FROM shipments`);
  const allInvs = await db.select({ shipmentId: investmentsTable.shipmentId, amount: investmentsTable.amount })
    .from(investmentsTable);
  const invCountByPlan = new Map<number, number>();
  const invVolByPlan = new Map<number, number>();
  for (const inv of allInvs) {
    invCountByPlan.set(inv.shipmentId, (invCountByPlan.get(inv.shipmentId) ?? 0) + 1);
    invVolByPlan.set(inv.shipmentId, (invVolByPlan.get(inv.shipmentId) ?? 0) + Number(inv.amount));
  }
  res.json((plans.rows as any[]).map(p => serializePlan(p, invCountByPlan, invVolByPlan)));
});

const PlanEditBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  vesselName: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  riskGrade: z.string().optional(),
  profitPercent: z.number().min(0.1).max(100).optional(),
  fundingGoal: z.number().positive().optional(),
  minInvestment: z.number().positive().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  cargoType: z.string().optional(),
  freightForwarder: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

router.patch("/plans/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const parsed = PlanEditBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.vesselName !== undefined) updates.vessel_name = d.vesselName;
  if (d.origin !== undefined) updates.origin = d.origin;
  if (d.destination !== undefined) updates.destination = d.destination;
  if (d.riskGrade !== undefined) updates.risk_grade = d.riskGrade;
  if (d.profitPercent !== undefined) updates.profit_percent = String(d.profitPercent);
  if (d.fundingGoal !== undefined) updates.funding_goal = String(d.fundingGoal);
  if (d.minInvestment !== undefined) updates.min_investment = String(d.minInvestment);
  if (d.departureDate !== undefined) updates.departure_date = new Date(d.departureDate);
  if (d.arrivalDate !== undefined) {
    const dep = d.departureDate ? new Date(d.departureDate) : undefined;
    const arr = new Date(d.arrivalDate);
    updates.arrival_date = arr;
    if (dep) {
      const days = Math.max(1, Math.ceil((arr.getTime() - dep.getTime()) / 86400000));
      updates.transit_days = days;
    }
  }
  if (d.cargoType !== undefined) updates.cargo_type = d.cargoType;
  if (d.freightForwarder !== undefined) updates.freight_forwarder = d.freightForwarder;
  if (d.isFeatured !== undefined) updates.is_featured = d.isFeatured ? 1 : 0;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const setParts = Object.entries(updates).map(([col, val]) => sql`${sql.raw(col)} = ${val}`);
  await db.execute(sql`UPDATE shipments SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`);

  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${id}`);
  const p = (rows.rows as any[])[0];
  if (!p) { res.status(404).json({ error: "Plan not found" }); return; }

  const emptyMap = new Map<number, number>();
  audit({ event: "plan_edited", userId: adminId, ip, detail: { planId: id, changes: Object.keys(d) } });
  res.json(serializePlan(p, emptyMap, emptyMap));
});

router.post("/plans/:id/toggle-featured", async (req, res) => {
  const adminId = (req as any).user.userId;
  const id = parseInt(req.params.id);
  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${id}`);
  const plan = (rows.rows as any[])[0];
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  const newFeatured = plan.is_featured === 1 ? 0 : 1;
  await db.execute(sql`UPDATE shipments SET is_featured = ${newFeatured} WHERE id = ${id}`);
  audit({ event: "plan_featured_toggled", userId: adminId, detail: { planId: id, isFeatured: newFeatured === 1 } });
  res.json({ success: true, isFeatured: newFeatured === 1 });
});

router.post("/plans/:id/activate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${parseInt(req.params.id)}`);
  const plan = (rows.rows as any[])[0];
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (plan.status === "delivered") { res.status(400).json({ error: "Cannot reactivate a delivered plan" }); return; }
  await db.execute(sql`UPDATE shipments SET status = 'open' WHERE id = ${parseInt(req.params.id)}`);
  audit({ event: "plan_activated", userId: adminId, detail: { planId: parseInt(req.params.id) } });
  res.json({ success: true, status: "open" });
});

router.post("/plans/:id/deactivate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${parseInt(req.params.id)}`);
  const plan = (rows.rows as any[])[0];
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (plan.status === "delivered") { res.status(400).json({ error: "Plan already delivered" }); return; }
  await db.execute(sql`UPDATE shipments SET status = 'funded' WHERE id = ${parseInt(req.params.id)}`);
  audit({ event: "plan_deactivated", userId: adminId, detail: { planId: parseInt(req.params.id) } });
  res.json({ success: true, status: "funded" });
});

router.post("/plans/:id/duplicate", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${id}`);
  const plan = (rows.rows as any[])[0];
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const newTitle = `Copy of ${plan.title}`;
  await db.execute(sql`
    INSERT INTO shipments (title, cargo_type, origin, destination, origin_coords, destination_coords,
      profit_percent, risk_grade, funding_goal, funding_raised, min_investment,
      departure_date, arrival_date, transit_days, status, freight_forwarder, vessel_name,
      hs_code, weight_tons, volume_cbm, description, is_featured, is_archived)
    VALUES (
      ${newTitle}, ${plan.cargo_type}, ${plan.origin}, ${plan.destination},
      ${plan.origin_coords}, ${plan.destination_coords},
      ${plan.profit_percent}, ${plan.risk_grade}, ${plan.funding_goal}, '0', ${plan.min_investment},
      ${plan.departure_date}, ${plan.arrival_date}, ${plan.transit_days}, 'open',
      ${plan.freight_forwarder}, ${plan.vessel_name},
      ${plan.hs_code}, ${plan.weight_tons}, ${plan.volume_cbm}, ${plan.description}, 0, 0
    )
  `);

  const newRows = await db.execute(sql`SELECT * FROM shipments WHERE title = ${newTitle} ORDER BY id DESC LIMIT 1`);
  const newPlan = (newRows.rows as any[])[0];
  const emptyMap = new Map<number, number>();

  audit({ event: "plan_duplicated", userId: adminId, ip, detail: { originalPlanId: id, newTitle } });
  res.json(serializePlan(newPlan, emptyMap, emptyMap));
});

router.post("/plans/:id/archive", async (req, res) => {
  const adminId = (req as any).user.userId;
  const ip = getClientIp(req);
  const id = parseInt(req.params.id);
  const rows = await db.execute(sql`SELECT * FROM shipments WHERE id = ${id}`);
  const plan = (rows.rows as any[])[0];
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  const isCurrentlyArchived = plan.is_archived === 1;
  await db.execute(sql`UPDATE shipments SET is_archived = ${isCurrentlyArchived ? 0 : 1} WHERE id = ${id}`);
  audit({
    event: isCurrentlyArchived ? "plan_unarchived" : "plan_archived",
    userId: adminId, ip,
    detail: { planId: id }
  });
  res.json({ success: true, isArchived: !isCurrentlyArchived });
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

const AnnouncementBody = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default("banner"),
  targetAudience: z.string().default("all"),
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
  const stats = getAnnouncementStats(a.id);
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
    views: stats.views,
    dismissals: stats.dismissals,
    openRate: stats.views > 0 ? Math.round(((stats.views - stats.dismissals) / stats.views) * 100) : 0,
  };
}

// ── AUDIT LOG VIEWER ──────────────────────────────────────────────────────────

router.get("/audit-logs", async (req, res) => {
  const { search, action, startDate, endDate } = req.query as Record<string, string>;
  let logs = getAuditLog();

  if (action) logs = logs.filter(l => l.event === action);
  if (search) {
    const s = search.toLowerCase();
    logs = logs.filter(l =>
      l.event.toLowerCase().includes(s) ||
      (l.targetUser ?? "").toLowerCase().includes(s) ||
      (l.ip ?? "").toLowerCase().includes(s) ||
      (l.adminTraderId ?? "").toLowerCase().includes(s)
    );
  }
  if (startDate) {
    const start = new Date(startDate);
    logs = logs.filter(l => new Date(l.timestamp) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    logs = logs.filter(l => new Date(l.timestamp) <= end);
  }

  const adminIds = [...new Set(logs.filter(l => l.adminId).map(l => l.adminId!))];
  const adminMap = new Map<number, string>();
  if (adminIds.length > 0) {
    const admins = await db.select({ id: usersTable.id, traderId: usersTable.traderId })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(adminIds.map(id => sql`${id}`), sql`, `)}])`);
    for (const a of admins) adminMap.set(a.id, a.traderId);
  }

  res.json(logs.map(l => ({
    ...l,
    adminTraderId: l.adminId ? adminMap.get(l.adminId) ?? `Admin#${l.adminId}` : null,
  })));
});

// ── ENHANCED STATS ────────────────────────────────────────────────────────────

router.get("/analytics", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const allUsers = await db.select().from(usersTable);
  const allTxs = await db.select().from(transactionsTable);
  const allShipments = await db.execute(sql`SELECT status FROM shipments`);
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

  const shipmentRows = allShipments.rows as any[];
  const activeShipments = shipmentRows.filter((s: any) => ["open", "funded", "in_transit"].includes(s.status)).length;
  const openPlans = shipmentRows.filter((s: any) => s.status === "open").length;

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
