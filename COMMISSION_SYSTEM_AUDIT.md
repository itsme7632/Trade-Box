# TradeBox — Commission & Guild System Audit

**Date:** June 4, 2026  
**Phase:** 2 — Referral, Guild & Earnings System Completion  
**Scope:** Backend only — financial accuracy and referral logic. No UI changes.

---

## 1. Commission Structure

### 1.1 Referral Hierarchy (3 levels)

```
Root (A)
 └─ Tier 1 referral (B)  ← B used A's guild code on registration
     └─ Tier 2 referral (C)  ← C used B's guild code
         └─ Tier 3 referral (D)  ← D used C's guild code
```

When D earns investment profit, commissions flow **upward**:

| Relationship to Investor D | Recipient | Rate | Basis |
|---|---|---|---|
| D's direct referrer | C | **7%** | D's profit |
| C's referrer | B | **2%** | D's profit |
| B's referrer | A | **1%** | D's profit |

### 1.2 Formula

```
commission_tier_N = investor_profit × rate_N

Where:
  investor_profit = expectedProfit (set at investment time)
  rate_1 = 0.07  (7%)
  rate_2 = 0.02  (2%)
  rate_3 = 0.01  (1%)
```

**Important:** Commissions are based on **profit only**, not principal.

---

## 2. Rank System

| Rank | Own Investment Volume |
|---|---|
| Merchant | $0 – $4,999 |
| Trader | $5,000 – $24,999 |
| Broker | $25,000 – $99,999 |
| Magnate | $100,000+ |

---

## 3. System Architecture

### 3.1 Shared Commission Library: `artifacts/api-server/src/lib/commission.ts`

**`processGuildCommissions(investorId, investorTraderId, profit, shipmentId, shipmentTitle, triggeredBy)`**

- Walks up the referral chain 3 levels via `referredBy → guildCode` linkage
- Credits each referrer's `balance` via atomic SQL increment
- Inserts a `guild_commission` transaction with:
  - `notes: "1" | "2" | "3"` — tier number for programmatic parsing
  - `relatedUserId` — the investor who generated the commission
  - `shipmentId` — the shipment that was delivered
- Emits an audit log entry per commission paid
- Returns `CommissionResult[]` for confirmation/testing

**`parseTier(notes, description)`**

- Primary: reads `notes` field ("1", "2", "3")
- Fallback: parses `description` prefix ("Tier N commission from …")
- Handles legacy records (pre-Phase 2) that have `notes: null`

### 3.2 Trigger Points

| Trigger | Route/Location | Notes |
|---|---|---|
| Manual admin delivery | `POST /admin/shipments/:id/deliver` | Admin marks shipment delivered |
| Cron auto-delivery | `socket.ts` — hourly interval | Picks up `in_transit` shipments past `arrivalDate` |

Both call `processGuildCommissions()` from the shared library — identical logic.

### 3.3 Database Fields

**`transactions` table** — guild_commission records:
```
type:          "guild_commission"
amount:        commission amount (string decimal)
notes:         "1" | "2" | "3"  ← tier number
relatedUserId: investor's user ID
shipmentId:    the delivered shipment
description:   "Tier N commission from TB-XXXX"
status:        "cleared"
```

**`users` table** — referral linkage:
```
guildCode:   unique code for this user ("TB-GUILD-XXXXX")
referredBy:  guildCode of the user who referred this user (null if no referrer)
```

---

## 4. API Routes

### 4.1 User-Facing Guild Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/guild/stats` | Summary: tier counts, earnings by tier, rank, network volume |
| `GET` | `/api/guild/referrals` | All 3-tier referrals with volume, KYC, parent info |
| `GET` | `/api/guild/commissions` | Raw commission transaction history with tier annotation |
| `GET` | `/api/guild/earnings` | Earnings grouped by tier + detailed history |
| `GET` | `/api/guild/performance` | Dashboard view: tier breakdown, volume, earnings |

### 4.2 Admin Guild Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/guild/commissions` | Full network commission audit trail (optional `?userId=N`) |
| `GET` | `/api/admin/guild/stats` | Network-wide stats: referral rates, top earners, top referrers |
| `POST` | `/api/admin/test/setup-referral-chain` | Dev/staging only — creates A→B→C→D test chain |

### 4.3 Fixes to Existing Routes

| Route | Fix |
|---|---|
| `GET /admin/users` | `totalInvested` was hardcoded `0` — now bulk-computed from investments table |
| `POST /admin/shipments/:id/deliver` | Replaced 40-line inline commission block with `processGuildCommissions()` |
| `POST /admin/test/setup-referral-chain` | New — creates test users and verifies commissions |

---

## 5. Security & Integrity Fixes

### 5.1 Self-Referral Prevention (`routes/auth.ts`)

- **Format validation**: referral code must match `/^TB-GUILD-[A-Z0-9]{5}$/` 
- **Existence check**: referral code must belong to a real user (400 if not found)
- **Same-email check**: referrer email must differ from registrant email (400 if same)
- **Chain depth limit**: if the referrer is already 3+ levels deep, the new user's `referredBy` is set to `null` (registration succeeds, referral not attached)

### 5.2 Idempotency (`routes/admin.ts` — deliver endpoint)

- Added `if (shipment.status === "delivered") → 400` guard to prevent double-processing

### 5.3 Auto-Deliver Cron (`lib/socket.ts`)

- Runs every hour
- Queries `status = 'in_transit' AND arrivalDate <= NOW()`
- Processes all active investments, credits profit + principal
- Calls `processGuildCommissions()` for each investor
- Emits `shipment:delivered` socket event to connected clients
- Full audit logging per investment

---

## 6. Investment Tracking — Where `totalInvested` is Computed

| Context | File | Method | Definition |
|---|---|---|---|
| User wallet/balance | `routes/wallet.ts` | Active only | `investments WHERE status='active'` |
| Admin user detail | `routes/admin.ts GET /users/:id` | Lifetime | All investments (any status) |
| Admin user list | `routes/admin.ts GET /users` | Lifetime | Bulk query, map by userId (was hardcoded 0) |
| Guild stats | `routes/guild.ts GET /stats` | Lifetime | User's own investments |
| Referral list volume | `routes/guild.ts GET /referrals` | Lifetime | Per-referral investment sum |

---

## 7. Test Results — Chain A → B → C → D

**Setup:**
- D invests $1,000 in a shipment with 10% profit → expected profit = $100
- Chain: A → B → C → D (D is the investor, C is D's referrer, B is C's referrer, A is B's referrer)

**Expected commissions:**

| Recipient | Tier | Rate | Calculation | Expected |
|---|---|---|---|---|
| C | 1 | 7% | $100 × 0.07 | **$7.00** |
| B | 2 | 2% | $100 × 0.02 | **$2.00** |
| A | 3 | 1% | $100 × 0.01 | **$1.00** |

**Actual results from live test:**

```json
{
  "commissionsGenerated": [
    { "tier": 1, "recipientTraderId": "TB-TESTC", "commission": 7 },
    { "tier": 2, "recipientTraderId": "TB-TESTB", "commission": 2 },
    { "tier": 3, "recipientTraderId": "TB-TESTA", "commission": 1 }
  ],
  "userBalances": {
    "A": { "traderId": "TB-TESTA", "balance": 1, "earned": 1 },
    "B": { "traderId": "TB-TESTB", "balance": 2, "earned": 2 },
    "C": { "traderId": "TB-TESTC", "balance": 7, "earned": 7 },
    "D": { "traderId": "TB-TESTD", "balance": 1100, "earned": 0 }
  }
}
```

**D's balance:** $1,000 principal + $100 profit = **$1,100** ✅  
**All commission amounts match expected values** ✅

---

## 8. Guild Stats Verification

**User A (`guild/stats`):**

```json
{
  "tier1Count": 1, "tier2Count": 1, "tier3Count": 1,
  "tier1Earnings": 0, "tier2Earnings": 0, "tier3Earnings": 1,
  "totalEarnings": 1, "networkVolume": 1000
}
```
→ A has 3 referrals across all tiers, earns $1 (tier 3 of D's profit) ✅

**User C (`guild/stats`):**

```json
{
  "tier1Count": 1, "tier2Count": 0, "tier3Count": 0,
  "tier1Earnings": 7, "tier2Earnings": 0, "tier3Earnings": 0,
  "totalEarnings": 7, "networkVolume": 1000
}
```
→ C has 1 direct referral (D), earns $7 (tier 1 of D's profit) ✅

**Referral list for A** — all 3 tiers present with correct parent attribution ✅

---

## 9. Verification Checklist

| Check | Result |
|---|---|
| Tier 1 commission (7%) calculated correctly | ✅ |
| Tier 2 commission (2%) calculated correctly | ✅ |
| Tier 3 commission (1%) calculated correctly | ✅ |
| Balances updated correctly for A, B, C | ✅ |
| D receives principal + profit ($1,100) | ✅ |
| `tier1Earnings` field correctly populated | ✅ |
| `tier2Earnings` field correctly populated | ✅ |
| `tier3Earnings` field correctly populated | ✅ |
| Tier 3 referrals appear in `/guild/referrals` | ✅ |
| Parent traderId correct for each tier | ✅ |
| `totalInvested` in admin user list correct | ✅ (was hardcoded 0) |
| Commission tier stored in `notes` field | ✅ |
| `relatedUserId` set on commission records | ✅ |
| `shipmentId` set on commission records | ✅ |
| Admin commission audit trail with tier | ✅ |
| Admin guild network stats | ✅ |
| Auto-deliver cron fires commissions | ✅ (code) |
| Self-referral prevention | ✅ |
| Chain depth guard (>3 levels) | ✅ |
| Deliver idempotency guard | ✅ |
| Rate-limiter IPv6 warning fixed | ✅ |
