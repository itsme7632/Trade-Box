import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

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

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { email, password, referralCode } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  let referredBy: string | null = null;
  if (referralCode) {
    const referrer = await db.select().from(usersTable).where(eq(usersTable.guildCode, referralCode)).limit(1);
    if (referrer.length > 0) referredBy = referralCode;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let traderId = generateTraderId();
  let guildCode = generateGuildCode();

  // ensure uniqueness
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
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
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
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
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

export default router;
