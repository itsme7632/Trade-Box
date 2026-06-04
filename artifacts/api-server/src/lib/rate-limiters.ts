import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

function makeLimit(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max: isDev ? max * 20 : max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const forwarded = req.headers["x-forwarded-for"];
      const rawIp = typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.ip ?? "unknown";
      return ipKeyGenerator(rawIp);
    },
    validate: { xForwardedForHeader: false },
  });
}

export const loginLimiter = makeLimit(
  15 * 60 * 1000,
  5,
  "Too many login attempts. Please try again in 15 minutes."
);

export const registerLimiter = makeLimit(
  60 * 60 * 1000,
  3,
  "Too many accounts created from this IP. Please try again in 1 hour."
);

export const passwordLimiter = makeLimit(
  15 * 60 * 1000,
  5,
  "Too many password change attempts. Please try again in 15 minutes."
);

export const twoFaLimiter = makeLimit(
  10 * 60 * 1000,
  5,
  "Too many 2FA attempts. Please try again in 10 minutes."
);

export const supportTicketLimiter = makeLimit(
  60 * 60 * 1000,
  10,
  "Too many support tickets submitted. Please try again in 1 hour."
);
