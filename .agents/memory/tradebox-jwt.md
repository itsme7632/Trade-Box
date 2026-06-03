---
name: TradeBox JWT secret pattern
description: How JWT_SECRET must be handled — no hardcoded fallback in production
---
JWT_SECRET must never have a plain string fallback. Use an IIFE that throws in production and logs a warning in development:

```typescript
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET env var is required in production");
  return "dev-fallback-secret-DO-NOT-USE-IN-PROD";
})();
```

**Why:** Security requirement — a hardcoded fallback means any deployment without JWT_SECRET set would silently use a known secret, allowing token forgery.

**How to apply:** Both `auth.ts` and `twofa.ts` use this pattern. Any new file that signs/verifies JWTs must follow the same pattern.
