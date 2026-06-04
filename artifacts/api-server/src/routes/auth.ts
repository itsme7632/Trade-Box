import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { createDecipheriv, createHash } from "crypto";
import { audit, getClientIp } from "../lib/audit";
import { loginLimiter, registerLimiter, passwordLimiter } from "../lib/rate-limiters";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET env var is required in production");
  console.warn("[WARN] JWT_SECRET not set — using insecure fallback. Set JWT_SECRET in production!");
  return "dev-fallback-secret-DO-NOT-USE-IN-PROD";
})();

function generateTraderId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `TB-${num}`;
}

function generateGuildCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TB-GUILD-";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function decrypt2faSecret(data: string): string {
  const key = deriveKey(JWT_SECRET);
  const [ivHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

router.post("/register", registerLimiter, async (req, res) => {
  const ip = getClientIp(req);
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    audit({ event: "register_failure", ip, detail: { reason: "validation_error" } });
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const {
    email, password, referralCode,
    firstName, lastName, username, country,
    telegramHandle, whatsappNumber,
    agreedToTerms, ageConfirmed,
  } = parsed.data;

  if (!agreedToTerms || !ageConfirmed) {
    audit({ event: "register_failure", ip, detail: { reason: "terms_not_accepted" } });
    res.status(400).json({ error: "You must agree to the Terms and confirm you are 18 or older" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    audit({ event: "register_failure", ip, detail: { reason: "email_taken", email } });
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  if (username) {
    const usernameCheck = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (usernameCheck.length > 0) {
      audit({ event: "register_failure", ip, detail: { reason: "username_taken", username } });
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }

  let referredBy: string | null = null;
  if (referralCode) {
    // Validate format — must look like a guild code
    if (!/^TB-GUILD-[A-Z0-9]{5}$/.test(referralCode)) {
      res.status(400).json({ error: "Invalid referral code format" });
      return;
    }
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.guildCode, referralCode)).limit(1);
    if (!referrer) {
      res.status(400).json({ error: "Referral code not found" });
      return;
    }
    // Prevent self-referral (same email across accounts)
    if (referrer.email.toLowerCase() === email.toLowerCase()) {
      res.status(400).json({ error: "You cannot refer yourself" });
      return;
    }
    // Prevent referral chains deeper than 3 levels:
    // Count how many hops from the referrer up to the root. If >= 3, adding a
    // 4th level (this new user) would exceed the commission depth and silently
    // generate no earnings for the deepest level, so we block it proactively.
    let depth = 0;
    let current: typeof referrer | null = referrer;
    while (current?.referredBy && depth < 4) {
      const [parent] = await db.select().from(usersTable).where(eq(usersTable.guildCode, current.referredBy)).limit(1);
      current = parent ?? null;
      depth++;
    }
    if (depth >= 3) {
      // Allow registration but don't attach referral (chain too deep for commissions)
      referredBy = null;
    } else {
      referredBy = referralCode;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let traderId = generateTraderId();
  const guildCode = generateGuildCode();

  let attempts = 0;
  while (attempts < 10) {
    const idCheck = await db.select().from(usersTable).where(eq(usersTable.traderId, traderId)).limit(1);
    if (idCheck.length === 0) break;
    traderId = generateTraderId();
    attempts++;
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    traderId,
    guildCode,
    referredBy,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    username: username ?? null,
    country: country ?? null,
    telegramHandle: telegramHandle ?? null,
    whatsappNumber: whatsappNumber ?? null,
    role: "user",
    kycStatus: "none",
  }).returning();

  audit({ event: "register_success", userId: user.id, traderId: user.traderId, ip });

  const token = signToken(user.id, user.role);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      traderId: user.traderId,
      balance: Number(user.balance),
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/login", loginLimiter, async (req, res) => {
  const ip = getClientIp(req);
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    audit({ event: "login_failure", ip, detail: { reason: "user_not_found", email } });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    audit({ event: "login_failure", ip, userId: user.id, traderId: user.traderId, detail: { reason: "wrong_password" } });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    audit({ event: "login_success", ip, userId: user.id, traderId: user.traderId, detail: { requires_2fa: true } });
    const tempToken = jwt.sign({ userId: user.id }, JWT_SECRET + ":2fa", { expiresIn: "5m" });
    res.json({ requiresOtp: true, tempToken });
    return;
  }

  audit({ event: "login_success", ip, userId: user.id, traderId: user.traderId, detail: { requires_2fa: false } });
  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      traderId: user.traderId,
      balance: Number(user.balance),
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({
    id: user.id,
    email: user.email,
    traderId: user.traderId,
    balance: Number(user.balance),
    role: user.role,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/check-availability", async (req, res) => {
  const { field, value } = req.body;
  if (!field || !value || typeof value !== "string") {
    res.status(400).json({ error: "field and value are required" }); return;
  }
  if (field === "email") {
    const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, value.toLowerCase().trim())).limit(1);
    res.json({ available: rows.length === 0 }); return;
  }
  if (field === "username") {
    const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, value.trim())).limit(1);
    res.json({ available: rows.length === 0 }); return;
  }
  res.status(400).json({ error: "field must be email or username" });
});

router.post("/change-password", requireAuth, passwordLimiter, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const ip = getClientIp(req);
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    audit({ event: "password_change_failure", userId, traderId: user.traderId, ip, detail: { reason: "wrong_current_password" } });
    res.status(400).json({ error: "Current password is incorrect" }); return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
  audit({ event: "password_change_success", userId, traderId: user.traderId, ip });
  res.json({ success: true });
});

export default router;
