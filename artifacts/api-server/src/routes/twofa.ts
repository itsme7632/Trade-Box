import { Router } from "express";
import { generateSecret, generate as totpGenerate, verify as totpVerify } from "otplib";
import QRCode from "qrcode";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../lib/auth";
import { audit, getClientIp } from "../lib/audit";
import { twoFaLimiter } from "../lib/rate-limiters";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET env var is required in production");
  return "dev-fallback-secret-DO-NOT-USE-IN-PROD";
})();
const APP_NAME = "TradeBox";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encrypt(text: string): string {
  const key = deriveKey(JWT_SECRET);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(data: string): string {
  const key = deriveKey(JWT_SECRET);
  const [ivHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function buildOtpAuthURI(account: string, issuer: string, secret: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const part1 = randomBytes(4).toString("hex").toUpperCase();
    const part2 = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

router.post("/setup", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.twoFactorEnabled) { res.status(400).json({ error: "2FA already enabled" }); return; }

  const secret = generateSecret();
  const otpauth = buildOtpAuthURI(user.email, APP_NAME, secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  res.json({ secret, otpauth, qrCode });
});

router.post("/verify", requireAuth, twoFaLimiter, async (req, res) => {
  const userId = (req as any).user.userId;
  const ip = getClientIp(req);
  const { secret, token } = req.body;

  if (!secret || !token) {
    res.status(400).json({ error: "secret and token are required" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const verifyResult = await totpVerify({ token: String(token), secret });
  const valid = verifyResult?.valid === true;
  if (!valid) {
    audit({ event: "2fa_login_failure", userId, traderId: user.traderId, ip, detail: { stage: "verify_setup" } });
    res.status(400).json({ error: "Invalid OTP code" }); return;
  }

  const encryptedSecret = encrypt(secret);
  const recoveryCodes = generateRecoveryCodes();
  const encryptedCodes = encrypt(JSON.stringify(recoveryCodes));

  await db.update(usersTable)
    .set({ twoFactorEnabled: true, twoFactorSecret: encryptedSecret, twoFactorRecoveryCodes: encryptedCodes })
    .where(eq(usersTable.id, userId));

  audit({ event: "2fa_enabled", userId, traderId: user.traderId, ip });
  res.json({ success: true, recoveryCodes });
});

router.post("/disable", requireAuth, twoFaLimiter, async (req, res) => {
  const userId = (req as any).user.userId;
  const ip = getClientIp(req);
  const { token } = req.body;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!user.twoFactorEnabled) { res.status(400).json({ error: "2FA is not enabled" }); return; }

  let valid = false;
  if (user.twoFactorSecret) {
    try {
      const decSecret = decrypt(user.twoFactorSecret);
      const verifyResult = await totpVerify({ token: String(token), secret: decSecret });
      valid = verifyResult?.valid === true;
    } catch {}
  }

  let usedRecoveryCode = false;
  if (!valid && user.twoFactorRecoveryCodes) {
    try {
      const codes: string[] = JSON.parse(decrypt(user.twoFactorRecoveryCodes));
      const input = String(token).toUpperCase().trim();
      const idx = codes.findIndex(c => c.toUpperCase() === input);
      if (idx !== -1) { valid = true; usedRecoveryCode = true; codes.splice(idx, 1); }
      if (valid) {
        const updatedCodes = encrypt(JSON.stringify(codes));
        await db.update(usersTable).set({ twoFactorRecoveryCodes: updatedCodes }).where(eq(usersTable.id, userId));
      }
    } catch {}
  }

  if (!valid) {
    audit({ event: "2fa_login_failure", userId, traderId: user.traderId, ip, detail: { stage: "disable" } });
    res.status(400).json({ error: "Invalid OTP or recovery code" }); return;
  }

  await db.update(usersTable)
    .set({ twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: null })
    .where(eq(usersTable.id, userId));

  audit({ event: "2fa_disabled", userId, traderId: user.traderId, ip, detail: { used_recovery_code: usedRecoveryCode } });
  res.json({ success: true, usedRecoveryCode });
});

router.post("/complete", twoFaLimiter, async (req, res) => {
  const ip = getClientIp(req);
  const { tempToken, token } = req.body;
  if (!tempToken || !token) { res.status(400).json({ error: "tempToken and token are required" }); return; }

  let payload: any;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET + ":2fa");
  } catch {
    res.status(401).json({ error: "Invalid or expired temp token" }); return;
  }

  const userId: number = payload.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let valid = false;
  if (user.twoFactorSecret) {
    try {
      const decSecret = decrypt(user.twoFactorSecret);
      const verifyResult = await totpVerify({ token: String(token), secret: decSecret });
      valid = verifyResult?.valid === true;
    } catch {}
  }
  if (!valid && user.twoFactorRecoveryCodes) {
    try {
      const codes: string[] = JSON.parse(decrypt(user.twoFactorRecoveryCodes));
      const input = String(token).toUpperCase().trim();
      const idx = codes.findIndex(c => c.toUpperCase() === input);
      if (idx !== -1) {
        valid = true;
        codes.splice(idx, 1);
        const updatedCodes = encrypt(JSON.stringify(codes));
        await db.update(usersTable).set({ twoFactorRecoveryCodes: updatedCodes }).where(eq(usersTable.id, userId));
      }
    } catch {}
  }

  if (!valid) {
    audit({ event: "2fa_login_failure", userId, traderId: user.traderId, ip, detail: { stage: "complete" } });
    res.status(400).json({ error: "Invalid OTP code" }); return;
  }

  audit({ event: "2fa_login_complete", userId, traderId: user.traderId, ip });
  const fullToken = signToken(user.id, user.role);
  res.json({
    token: fullToken,
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

export default router;
