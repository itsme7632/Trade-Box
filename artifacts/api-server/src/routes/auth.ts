import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { createDecipheriv, createHash } from "crypto";

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

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
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
    res.status(400).json({ error: "You must agree to the Terms and confirm you are 18 or older" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  if (username) {
    const usernameCheck = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (usernameCheck.length > 0) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }

  let referredBy: string | null = null;
  if (referralCode) {
    const referrer = await db.select().from(usersTable).where(eq(usersTable.guildCode, referralCode)).limit(1);
    if (referrer.length > 0) referredBy = referralCode;
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

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = jwt.sign({ userId: user.id }, JWT_SECRET + ":2fa", { expiresIn: "5m" });
    res.json({ requiresOtp: true, tempToken });
    return;
  }

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

router.post("/change-password", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: number } }).user.userId;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;
