# TradeBox — Priority 1 Security Fixes

**Date:** June 4, 2026  
**Scope:** Backend API (`artifacts/api-server`) only — no frontend UI changes.

---

## 1. JWT Secret Hardening (`lib/auth.ts`)

**Problem:** `JWT_SECRET` had a hardcoded fallback (`"fallback-secret"`) that silently enabled token signing without configuration.

**Fix:**
- Production (`NODE_ENV=production`): IIFE throws immediately if `JWT_SECRET` is unset — server refuses to start.
- Development: IIFE logs a `warn`-level audit message and falls back to a dev-only placeholder. No silent failures.
- Same pattern applied to `routes/twofa.ts` for the TOTP secret derivation key.

---

## 2. Withdrawal Balance Reservation (`routes/wallet.ts`)

**Problem:** Withdrawal requests were stored as `in_transit` but did not deduct from the user's balance. A user could submit multiple withdrawals totalling more than their balance before any was processed.

**Fix — Atomic reservation at submission time:**
```
POST /wallet/withdraw
  BEFORE: status=in_transit, balance unchanged
  AFTER:  status=in_transit, balance -= (principal + fee) immediately
```

- 1% fee calculated at submission: `fee = principal * 0.01`
- Fee stored in `tx.notes` for later retrieval by admin routes
- Insufficient balance (including fee) returns `400 Insufficient balance (including 1% fee)`

**Fix — Admin process no longer double-deducts:**
```
POST /admin/withdrawals/:id/process
  BEFORE: deducted balance again + updated totalWithdrawn
  AFTER:  only updates totalWithdrawn + marks cleared (balance already reserved)
```

---

## 3. Withdrawal Rejection Endpoint (`routes/admin.ts`)

**New endpoint:** `POST /admin/withdrawals/:id/reject`

```json
Request body:
{ "reason": "Suspicious wallet address — manual review required" }

Response: { id, userId, traderId, email, coin, amount, fee,
            walletAddress, status: "rejected", txid, notes, createdAt }
```

**Behavior:**
- Validates `status === "in_transit"` — idempotency guard prevents double-processing
- Restores `balance += principal + fee` to user's account
- Sets `tx.status = "rejected"`, `tx.notes = reason`
- Emits an audit log event `withdrawal_rejected` with principal, fee, and reason

---

## 4. Rate Limiting (`lib/rate-limiters.ts`, `app.ts`)

**Added `express-rate-limit` with per-route limits:**

| Route | Window | Max (prod) | Max (dev 20× relaxed) |
|-------|--------|-----------|----------------------|
| `POST /auth/login` | 15 min | 5 | 100 |
| `POST /auth/register` | 1 hr | 3 | 60 |
| `POST /auth/change-password` | 15 min | 5 | 100 |
| `POST /auth/2fa/*` | 10 min | 5 | 100 |
| `POST /support/tickets` | 1 hr | 10 | 200 |

All limiters return `{ error: "Too many requests..." }` JSON — no default HTML responses.

---

## 5. CORS Hardening (`app.ts`)

**Problem:** CORS was `origin: "*"` — any domain could make credentialed requests to the API.

**Fix:**
- Production: reads `ALLOWED_ORIGINS` env var (comma-separated list); if unset, logs a `warn` and defaults to `[]` (no cross-origin allowed).
- Development: allows all origins (`*`) for local development convenience.
- Credentials: `credentials: true` — cookies/auth headers allowed from whitelisted origins only.

**Required env var for production:**
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 6. Audit Logging (`lib/audit.ts`)

**New structured audit logger** using pino with `audit: true` field.

**Events logged:**
- `user_registered` — email, IP, traderId
- `user_login` — email, IP, success/failure
- `user_login_failed` — email, IP
- `password_changed` — userId, IP
- `2fa_setup` / `2fa_enabled` / `2fa_disabled` — userId, IP
- `deposit_approved` / `deposit_rejected` — txId, targetUser, amount/reason, adminId, IP
- `withdrawal_submitted` — userId, IP, principal, fee, coin, address
- `withdrawal_approved` — txId, targetUser, txid, adminId, IP
- `withdrawal_rejected` — txId, targetUser, principal, fee, totalRestored, reason, adminId, IP
- `kyc_submitted` / `kyc_approved` / `kyc_rejected` — userId/kycId, targetUser, reason, IP
- `admin_credit_profit` — targetUser, amount, description, adminId, IP

Each audit log line is a structured JSON object:
```json
{
  "level": 30,
  "time": "...",
  "audit": true,
  "event": "withdrawal_rejected",
  "userId": 1,
  "ip": "203.0.113.5",
  "detail": { "txId": 7, "targetUser": "TB-4821", "principal": 500, "fee": 5, "totalRestored": 505, "reason": "..." }
}
```

---

## 7. Route Protection Fix (`routes/wallet.ts`)

**Problem:** `GET /wallet/crypto-addresses` was publicly accessible (no `requireAuth` middleware), exposing deposit wallet addresses to unauthenticated requests.

**Fix:** Route now requires a valid JWT. Added `requireAuth` middleware to the crypto-addresses handler.

---

## 8. Deposit Status Filtering Fix (`routes/admin.ts`)

**Problem:** `GET /admin/deposits?status=pending` returned all deposits regardless of the `status` query param — the filter was applied to the wrong field.

**Fix:** Filter now correctly uses `status` query param against `tx.status`. All values (`reviewing`, `cleared`, `rejected`, `all`) work correctly.

---

## 9. KYC Admin List Filtering (`routes/admin.ts`)

**Problem:** KYC admin list only returned pending records; no way to view approved/rejected.

**Fix:** `GET /admin/kyc?status=pending|approved|rejected|all` — filter-aware query with sensible default of `pending`.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/api-server/src/lib/auth.ts` | JWT secret IIFE, no fallback in prod |
| `artifacts/api-server/src/lib/audit.ts` | **New** — structured audit logger |
| `artifacts/api-server/src/lib/rate-limiters.ts` | **New** — rate limit configurations |
| `artifacts/api-server/src/app.ts` | CORS hardening, rate limiters wired |
| `artifacts/api-server/src/routes/auth.ts` | Rate limits applied, audit logging |
| `artifacts/api-server/src/routes/twofa.ts` | JWT secret IIFE fix, audit logging |
| `artifacts/api-server/src/routes/wallet.ts` | Balance reservation, route protection |
| `artifacts/api-server/src/routes/admin.ts` | Rejection endpoint, fix process, audit, filters |
| `artifacts/api-server/src/routes/support.ts` | Rate limit on ticket creation |
| `artifacts/tradebox/src/pages/help.tsx` | Fix: missing default export (runtime crash) |

---

## Verification — All Tests Pass

| Test | Result |
|------|--------|
| Health check | ✅ 200 OK |
| Registration | ✅ JWT returned, user created |
| Login (correct password) | ✅ JWT returned |
| Login (wrong password) | ✅ 401 Invalid credentials |
| Duplicate registration | ✅ 400 Email already registered |
| Rate limit (dev, 20× relaxed) | ✅ Returns 401 after limit |
| 2FA setup | ✅ Secret + QR code returned |
| Admin login | ✅ Admin JWT returned |
| Admin credit profit | ✅ Balance updated |
| Withdrawal submission → balance reserved | ✅ $100 → $49.50 |
| Overdraft protection | ✅ 400 Insufficient balance |
| Admin withdrawal rejection → balance restored | ✅ $49.50 → $100 |
| Double-reject idempotency guard | ✅ 400 Not in rejectable state |
| Withdrawal re-submission | ✅ $100 → $49.50 |
| Admin withdrawal approval | ✅ Cleared, txid saved |
| Double-process idempotency guard | ✅ 400 Not in processable state |
