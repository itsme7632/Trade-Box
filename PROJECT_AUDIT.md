# TradeBox Platform — Project Audit
**Date:** June 4, 2026  
**Stack:** Node.js 24 / Express 5 / PostgreSQL / Drizzle ORM / React / Vite / TanStack Query / Wouter  
**Architecture:** pnpm monorepo — `artifacts/api-server` (backend), `artifacts/tradebox` (frontend), `lib/db` (schema), `lib/api-spec` (OpenAPI), `lib/api-client-react` (generated hooks), `lib/api-zod` (generated Zod schemas)

---

## COMPLETED FEATURES

### Authentication System
- JWT-based stateless auth (`jsonwebtoken`, 30-day expiry)
- Password hashing with `bcryptjs` (cost factor 12)
- `POST /api/auth/register` — full registration with Zod validation
- `POST /api/auth/login` — returns JWT or 2FA temp token
- `GET /api/auth/me` — current user info
- `POST /api/auth/check-availability` — real-time email/username uniqueness check
- `POST /api/auth/change-password` — authenticated password change
- `requireAuth` and `requireAdmin` middleware
- Token stored in `localStorage` (`tradebox_token`); `AuthContext` provides app-wide auth state

### Two-Factor Authentication (2FA)
- TOTP via `otplib` (generateSecret, verify)
- QR code generation via `qrcode` library
- `POST /api/auth/2fa/setup` — returns secret + QR code URI
- `POST /api/auth/2fa/verify` — validates first code, enables 2FA, generates 8 recovery codes
- `POST /api/auth/2fa/complete` — completes login after OTP entry (consumes short-lived temp token)
- `POST /api/auth/2fa/disable` — disables 2FA with valid OTP or recovery code
- TOTP secrets and recovery codes encrypted at rest using AES-256-CBC (key derived from `JWT_SECRET`)
- Recovery codes consumed on use (removed from encrypted store)
- Frontend: Security page (`/security/2fa`) with QR display, recovery code reveal, enable/disable flow

### Registration Flow
- 4-step frontend wizard (`auth.tsx`):
  - Step 1: First name, last name, email (with real-time availability check)
  - Step 2: Username (with availability check), country, Telegram handle, WhatsApp number
  - Step 3: Password with strength meter + confirmation
  - Step 4: Referral code entry, Terms of Service agreement, 18+ age confirmation
- Backend validates: unique email, unique username, valid referral code, Terms/age acknowledgement
- Generates unique `traderId` (format: `TB-XXXX`, up to 10 collision retries) and `guildCode`
- New users default to `role: "user"` and `kycStatus: "none"`

### Referral System (Trade Guild)
- 3-tier commission network:
  - Tier 1 (direct referrals): 7% of profit on delivery
  - Tier 2 (referrals of referrals): 2% of profit on delivery
  - Tier 3 (third-degree): 1% of profit on delivery
- Guild commissions credited instantly at shipment delivery (`guild_commission` transaction type)
- Rank progression based on user's own funded volume:
  - Merchant: $0+, Trader: $5,000+, Broker: $25,000+, Magnate: $100,000+
- `GET /api/guild/stats` — guild code, tier counts, total earnings, rank, next rank threshold
- `GET /api/guild/referrals` — tree of Tier 1 and Tier 2 referrals with masked emails and volume
- `GET /api/guild/commissions` — commission transaction history
- Frontend: Guild page (`/guild`) with stats, referral tree, shareable guild code

### Shipments & Investment System (Cargo)
- `GET /api/shipments` — filterable list (category, riskGrade, status)
- `GET /api/shipments/:id` — full shipment detail
- `POST /api/shipments/:id/fund` — invest in a shipment; deducts balance, records investment, updates `fundingRaised`
- `GET /api/investments` — user's cargo (filterable by status: active/delivered/all)
- `GET /api/investments/:id` — single investment detail
- Investment schema: principal amount, profit %, expected profit, actual profit, status lifecycle (active → delivered)
- Shipment schema: cargo types (electronics, cocoa, lithium, textiles, pharma, minerals), risk grades (A–D), origin/destination coords, vessel name, freight forwarder, HS code, weight/volume

### Wallet System
- `GET /api/wallet/balance` — balance, total deposited, total withdrawn, total profits, total invested (computed from active investments)
- `GET /api/wallet/ledger` — filterable transaction history (type + status)
- `POST /api/wallet/deposit` — submits deposit proof (coin, amount, txid, proofUrl); status: `reviewing`
- `POST /api/wallet/withdraw` — withdrawal request with 1% fee check; status: `in_transit`
- `GET /api/wallet/crypto-addresses` — platform deposit addresses (public endpoint)
- Transaction types: `deposit`, `withdrawal`, `delivery_profit`, `guild_commission`
- Transaction statuses: `cleared`, `in_transit`, `reviewing`, `rejected`
- Frontend: Wallet page with balance cards, deposit/withdraw modals, filterable ledger table

### Market & Dashboard
- `GET /api/market/summary` — portfolio value, active investments, total profit, featured shipment
- `GET /api/market/commodity-prices` — simulated live commodity price feed (Coffee, Cocoa, Lithium, Cotton, Electronics Index, Steel) with random micro-fluctuations per call
- `GET /api/market/delivery-feed` — last 20 delivered investment events (trader ID, amount, profit)
- `GET /api/market/closing-soon` — shipments with ≥70% funding progress
- Frontend: Market page with summary KPIs, featured shipment card, commodity ticker, delivery feed

### Tracker System
- `GET /api/tracker/my-shipments` — active investments with origin/destination coords, progress % (time-based), ETA days
- `GET /api/tracker/port-activity` — global port events (arrivals/departures)
- Progress calculation: `(elapsed / total_duration) * 100`, capped at 99% until delivered
- Stage visualization on frontend: Booked → Loaded → Departed → At Sea → Customs → Arrived → Delivered
- WebSocket infrastructure exists (`socket.ts`) with `use-socket` hook in frontend
- Frontend: Map tracker page, tracker shipment detail page

### Admin Dashboard
- Platform stats: total users, deposits, withdrawals, profits paid, active shipments, pending queue counts
- **Deposits**: list all, approve (credits balance), reject with reason
- **Withdrawals**: list all, process with TXID (debits balance, updates `totalWithdrawn`)
- **KYC**: list pending submissions, approve (sets `kycStatus: approved`), reject with reason
- **Users**: search by email/trader ID, filter by KYC status; view detail; manually credit profit
- **Shipments**: create new, update (title, profit %, risk grade, status, arrival date, description), trigger manual delivery with full profit + guild commission distribution
- **Crypto Wallets**: view and update platform deposit addresses (BTC, ETH, USDT, BNB, TRX)
- **Support**: view all tickets, reply to tickets, update ticket status (open/in_progress/closed)
- **Support Settings**: configure Telegram, WhatsApp, email support links + group/community URLs
- All admin routes protected by `requireAuth + requireAdmin` middleware

### Support System
- `GET /api/support/settings` — public support contact settings (Telegram, WhatsApp, email)
- `GET /api/support/tickets` — user sees own tickets; admin sees all
- `POST /api/support/tickets` — create ticket with subject + message
- `GET /api/support/tickets/:id` — ticket detail with replies (access-controlled)
- `PATCH /api/support/tickets/:id` — admin updates status
- `POST /api/support/tickets/:id/replies` — user or admin adds reply
- Frontend: Help page with FAQ accordion, live contact card, full ticket management UI

### KYC System
- `POST /api/profile/kyc` — submit ID document URL, selfie URL, proof of address URL
- Admin approve/reject flow updates both `kyc_submissions` table and `users.kycStatus`
- Status states: `none → pending → approved | rejected`

### Profile Management
- `GET /api/profile` — full profile with trader stats (total shipped, total profit, countries traded, active/delivered investments)
- `PATCH /api/profile` — update first/last name, username (unique-checked), country, Telegram, WhatsApp
- `PATCH /api/profile/wallet-addresses` — update BTC, ETH, USDT, BNB payout addresses

### Automated Cron Jobs
- **Midnight daily**: Auto-deliver `in_transit` shipments past their `arrivalDate` — credits profit to investors
- **Every 30 minutes**: Transition `funded` shipments past `departureDate` to `in_transit`

### OpenAPI & Code Generation
- Full OpenAPI 3.1 spec at `lib/api-spec/openapi.yaml` (~60+ endpoints documented)
- Orval-based codegen generating React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`)
- Drizzle ORM schema push (`pnpm --filter db push`) for database sync

### Frontend Pages & Navigation
| Route | Page | Access |
|---|---|---|
| `/login` | AuthPage (login tab) | Public |
| `/register` | AuthPage (register wizard) | Public |
| `/market` | Market dashboard | Auth |
| `/market/shipments` | Shipments list | Auth |
| `/market/shipments/:id` | Shipment detail + fund | Auth |
| `/cargo` | My investments | Auth |
| `/wallet` | Wallet + ledger | Auth |
| `/tracker` | Live tracker map | Auth |
| `/tracker/shipment/:id` | Tracker shipment detail | Auth |
| `/guild` | Referral network | Auth |
| `/profile` | Profile + KYC | Auth |
| `/security/2fa` | 2FA settings | Auth |
| `/help` | Support + tickets | Auth |
| `/admin` | Admin terminal | Admin only |

---

## PARTIALLY COMPLETED FEATURES

### Guild Tier Earnings Breakdown
- `GET /api/guild/stats` always returns `tier1Earnings: 0`, `tier2Earnings: 0`, `tier3Earnings: 0` — these values are hardcoded to `0` in the response despite being in the schema contract
- `totalEarnings` is correctly computed; individual tier breakdowns are not

### Withdrawal Balance Deduction Timing
- On `POST /api/wallet/withdraw`, balance is **not immediately deducted** — only deducted when admin calls `/admin/withdrawals/:id/process`
- This creates a window where a user with insufficient funds after a later deposit/depletion could have a pending withdrawal that cannot actually be fulfilled
- The 1% fee check runs at submission time but balance isn't locked/reserved

### Admin User List `totalInvested`
- `GET /admin/users` (list view) returns `totalInvested: 0` hardcoded for every user
- `GET /admin/users/:id` (detail view) correctly computes `totalInvested` from the investments table
- The list view skips the join for performance reasons but the field is misleading

### Cron Auto-Delivery Missing Guild Commissions
- The cron job (`cron.ts`) auto-delivers shipments and credits investor profits
- It does **not** calculate or pay guild (referral) commissions — only the manual admin `/deliver` endpoint does
- Users whose investments are auto-delivered by cron will not generate commission income for their referrers

### Tracker WebSocket Integration
- `use-socket.ts` hook and `socket.ts` server-side infrastructure exist
- The tracker REST endpoints provide position data but no real-time push — the WebSocket is not used for live shipment position updates in the current implementation
- Port activity is ordered by `timestamp` **ascending** (oldest first) rather than descending (most recent first)

### KYC Document Submission
- The KYC endpoint accepts URL strings (e.g., hosted image URLs) — there is no file upload endpoint
- Users must host documents externally and provide URLs, which is not a user-friendly or secure flow
- No file size/type validation is enforced

### Admin KYC View
- `GET /admin/kyc` only returns `status = "pending"` submissions — no way to view approved or rejected KYC history through the admin panel

### Support Settings Duplication
- Support settings are accessible via both `/api/support/settings` and `/api/admin/support-settings` with a `PATCH` on both — the admin route and support route both handle updates to the same table, creating a redundant surface

---

## MISSING FEATURES

### Password Reset / Forgot Password
- No forgot password flow, reset email, or token-based reset endpoint exists
- Users who forget their password have no recovery path except direct DB intervention

### Email Notification System
- No email integration at all (no SMTP, SendGrid, Resend, etc.)
- No transactional emails for: registration welcome, deposit approval/rejection, KYC decision, withdrawal processed, delivery credited, 2FA enable/disable

### Token Revocation / Session Logout
- JWT-based auth is stateless — logout only clears `localStorage` on the client
- No server-side token blacklist or refresh token mechanism
- A stolen token remains valid for up to 30 days with no way to invalidate it

### Rate Limiting & Brute Force Protection
- No rate limiting on any endpoint
- Login, 2FA complete, and password change endpoints are fully open to brute force
- No account lockout after failed attempts

### Shipment Cancellation / Investment Exit
- No endpoint to cancel an active investment or withdraw from a shipment
- No partial exit or secondary market mechanism

### Admin: Reject/Withdraw Withdrawal (Admin Side)
- Only `process` (approve + pay) is available for withdrawals — there is no admin endpoint to reject a withdrawal request and return the funds to the user's balance

### Admin: User Management Actions
- No endpoint to ban, suspend, or delete a user
- No endpoint to change a user's role (e.g., promote to admin)
- No endpoint to force-reset a user's password

### Admin: Deposit Status Filtering
- `GET /admin/deposits` returns all deposits regardless of status; the OpenAPI spec implies `status` filtering should be available but the route handler returns all records without filtering

### `is_featured` Shipment Flag
- The `shipmentsTable` has an `is_featured` boolean column
- No API endpoint exposes this field; the admin create/update shipment routes don't include it; the market summary uses funding amount to determine the featured shipment rather than this flag

### Real-Time Price Feed
- Commodity prices are simulated via random micro-fluctuations in-memory — they reset on server restart and are not connected to any real or mock external price source
- No WebSocket push for live price updates; clients must poll

### Withdrawal Rejection by Admin
- There is no `POST /admin/withdrawals/:id/reject` endpoint — if a withdrawal needs to be rejected, there is no mechanism to do so and return funds

### Admin Bulk Operations
- No bulk approve deposits, bulk deliver shipments, or bulk KYC operations

### Tier 3 Referrals Hidden from `/guild/referrals`
- The `/guild/referrals` endpoint returns Tier 1 and Tier 2 only — Tier 3 referrals (which earn 1% commission) are tracked in `/guild/stats` counts but never returned in the referral tree listing

---

## DATABASE SCHEMA

### Tables

| Table | Key Fields |
|---|---|
| `users` | id, email, password_hash, trader_id, guild_code, referred_by, role (user/admin), kyc_status (none/pending/approved/rejected), balance, total_deposited, total_withdrawn, total_profits, first_name, last_name, username, country, telegram_handle, whatsapp_number, two_factor_enabled, two_factor_secret (encrypted), two_factor_recovery_codes (encrypted), wallet_address_btc/eth/usdt/bnb |
| `shipments` | id, title, cargo_type, origin, destination, origin_coords, destination_coords, profit_percent, risk_grade (A-D), funding_goal, funding_raised, min_investment, departure_date, arrival_date, transit_days, status (open/funded/in_transit/delivered), vessel_name, freight_forwarder, hs_code, weight_tons, volume_cbm, description, is_featured |
| `investments` | id, user_id (FK), shipment_id (FK), amount, profit_percent, expected_profit, actual_profit, status (active/delivered/cancelled), delivered_at |
| `transactions` | id, user_id (FK), type (deposit/withdrawal/delivery_profit/guild_commission), amount, status (cleared/in_transit/reviewing/rejected), txid, coin, wallet_address, proof_url, related_user_id, shipment_id (FK), description, notes |
| `kyc_submissions` | id, user_id (FK), id_document_url, selfie_url, proof_of_address_url, status (pending/approved/rejected), rejection_reason, submitted_at, reviewed_at |
| `crypto_wallets` | id, coin (unique), address, network |
| `port_activity` | id, port_name, country, event_type (arrival/departure), vessel_name, cargo_type, timestamp |
| `support_settings` | id, telegram_support, whatsapp_support, support_email, telegram_group, whatsapp_community, announcement_channel |
| `support_tickets` | id, user_id (FK), subject, message, status (open/in_progress/closed), created_at |
| `ticket_replies` | id, ticket_id (FK), user_id (FK), message, is_admin, created_at |

### Pending Database Changes Needed
- None currently blocking — schema is consistent with the implemented routes
- Consider adding: `failed_login_attempts` + `locked_until` columns on `users` for brute force protection
- Consider adding: `password_reset_tokens` table for forgot-password flow
- Consider adding: `refresh_tokens` table for token revocation
- The `transactions.notes` column is used in deposit reject flow but may need verification it exists in the Drizzle schema definition

---

## API ENDPOINTS

### Auth (`/api/auth/`)
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/register` | Public | 4-field registration with referral code |
| POST | `/login` | Public | Returns JWT or `{requiresOtp, tempToken}` |
| GET | `/me` | Required | Current user basic info |
| POST | `/check-availability` | Public | email or username uniqueness |
| POST | `/change-password` | Required | Current + new password |
| POST | `/2fa/setup` | Required | Returns secret + QR |
| POST | `/2fa/verify` | Required | Enables 2FA, returns recovery codes |
| POST | `/2fa/complete` | Public (tempToken) | Completes 2FA login |
| POST | `/2fa/disable` | Required | OTP or recovery code |

### Shipments & Investments
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/shipments` | Required | Filter: category, riskGrade, status |
| GET | `/shipments/:id` | Required | Full detail |
| POST | `/shipments/:id/fund` | Required | Invest; checks balance + min |
| GET | `/investments` | Required | Filter: active/delivered/all |
| GET | `/investments/:id` | Required | Single investment detail |

### Wallet
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/wallet/balance` | Required | With computed `totalInvested` |
| GET | `/wallet/ledger` | Required | Filter: type + status |
| POST | `/wallet/deposit` | Required | Coin, amount, txid, proofUrl |
| POST | `/wallet/withdraw` | Required | 1% fee, balance check at submission |
| GET | `/wallet/crypto-addresses` | **None** | Platform deposit addresses (public) |

### Market
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/market/summary` | Required | Portfolio stats + featured shipment |
| GET | `/market/commodity-prices` | None | Simulated live prices |
| GET | `/market/delivery-feed` | None | Last 20 delivered investments |
| GET | `/market/closing-soon` | None | Shipments ≥70% funded |

### Tracker
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/tracker/my-shipments` | Required | Active investments with progress % |
| GET | `/tracker/port-activity` | None | Port events (ordered ascending — bug) |

### Guild
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/guild/stats` | Required | Tier counts, earnings, rank |
| GET | `/guild/referrals` | Required | Tier 1+2 referral tree (not Tier 3) |
| GET | `/guild/commissions` | Required | Commission transaction history |

### Profile
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/profile` | Required | Full profile with trader stats |
| PATCH | `/profile` | Required | Name, username, country, contacts |
| POST | `/profile/kyc` | Required | Submit KYC (URL-based) |
| PATCH | `/profile/wallet-addresses` | Required | BTC, ETH, USDT, BNB |

### Admin (all require `admin` role)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/admin/stats` | Platform-wide KPIs |
| GET | `/admin/deposits` | All deposits (no status filter in impl) |
| POST | `/admin/deposits/:id/approve` | Credits balance |
| POST | `/admin/deposits/:id/reject` | With reason |
| GET | `/admin/withdrawals` | All withdrawals |
| POST | `/admin/withdrawals/:id/process` | Marks cleared, debits balance |
| GET | `/admin/users` | Search + KYC status filter |
| GET | `/admin/users/:id` | User detail with computed totalInvested |
| POST | `/admin/users/:id/credit-profit` | Manual profit credit |
| GET | `/admin/kyc` | Pending KYC only |
| POST | `/admin/kyc/:id/approve` | Approves, updates user kycStatus |
| POST | `/admin/kyc/:id/reject` | With reason |
| GET | `/admin/shipments` | All shipments |
| POST | `/admin/shipments` | Create new shipment |
| PATCH | `/admin/shipments/:id` | Update fields |
| POST | `/admin/shipments/:id/deliver` | Trigger delivery + commissions |
| GET | `/admin/crypto-wallets` | Platform wallet addresses |
| PATCH | `/admin/crypto-wallets` | Update addresses |
| GET | `/admin/support-settings` | Support contact config |
| PATCH | `/admin/support-settings` | Update support config |

### Support
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/support/settings` | None | Public support contacts |
| PATCH | `/support/settings` | Admin | Duplicate of admin route |
| GET | `/support/tickets` | Required | Own tickets (admin sees all) |
| POST | `/support/tickets` | Required | Create ticket |
| GET | `/support/tickets/:id` | Required | Detail + replies |
| PATCH | `/support/tickets/:id` | Admin | Update status |
| POST | `/support/tickets/:id/replies` | Required | Add reply |

---

## FRONTEND PAGES

| Page | File | Status | Notes |
|---|---|---|---|
| Auth (Login + Register) | `auth.tsx` | Complete | 4-step register wizard, OTP screen, availability checks |
| Market Dashboard | `market.tsx` | Complete | KPI strip, featured shipment, commodity feed, delivery feed |
| Shipments List | `shipments.tsx` | Complete | Filter by category/risk, search |
| Shipment Detail | `shipment-detail.tsx` | Complete | Fund modal, progress bar, investor info |
| Cargo (My Investments) | `cargo.tsx` | Complete | Active/delivered tabs, profit display |
| Wallet | `wallet.tsx` | Complete | Balance cards, deposit/withdraw modals, ledger |
| Tracker | `tracker.tsx` | Complete | Stage progress, KPI strip, list view |
| Tracker Shipment Detail | `tracker-shipment.tsx` | Complete | Detailed tracking stages |
| Guild | `guild.tsx` | Complete | Stats, referral tree, commission history |
| Profile | `profile.tsx` | Complete | Edit info, wallet addresses, KYC submission |
| Security (2FA) | `security.tsx` | Complete | QR code, enable/disable, recovery codes |
| Help | `help.tsx` | Complete | FAQ, contact card, ticket list + create + reply |
| Admin Dashboard | `admin.tsx` | Complete | All admin tabs in single page |
| 404 | `not-found.tsx` | Complete | — |

---

## SECURITY FEATURES

### Implemented
- Password hashing: bcryptjs with cost factor 12
- JWT with 30-day expiry, signed with `JWT_SECRET`
- 2FA: TOTP (RFC 6238) via `otplib`, 8 recovery codes
- 2FA secrets encrypted at rest: AES-256-CBC, key derived from `JWT_SECRET` via SHA-256
- 2FA login: short-lived (5-minute) temp token on separate secret (`JWT_SECRET + ":2fa"`)
- Recovery codes: consumed on use, removed from encrypted store
- Admin middleware: role check on every admin route
- Input validation: Zod schemas on all write endpoints
- Registration: ToS agreement + age (18+) confirmation enforced server-side

### Not Implemented
- Rate limiting (brute force on login, 2FA, password change)
- CSRF protection
- Token revocation / session invalidation
- Refresh token rotation
- Account lockout after failed login attempts
- Content Security Policy headers
- `httpOnly` cookie-based token storage (currently `localStorage` — XSS risk)

---

## KNOWN ISSUES

| # | Severity | Location | Description |
|---|---|---|---|
| 1 | **High** | `lib/auth.ts` line 4 | `JWT_SECRET` uses `"fallback-secret"` hardcoded default — no production safety check. The route files (`auth.ts`, `twofa.ts`) have the proper IIFE safety check; the middleware lib does not |
| 2 | **High** | `wallet.ts` POST `/withdraw` | Withdrawal balance is not immediately reserved — balance is only deducted when admin processes the withdrawal. A user could have multiple in-flight withdrawal requests totalling more than their balance |
| 3 | **Medium** | `guild.ts` GET `/stats` | `tier1Earnings`, `tier2Earnings`, `tier3Earnings` hardcoded to `0` in response despite being in the API contract |
| 4 | **Medium** | `admin.ts` GET `/users` | `totalInvested` hardcoded to `0` for all users in list view |
| 5 | **Medium** | `cron.ts` | Auto-delivery cron does not pay guild commissions — only the manual admin deliver endpoint does. Referrers lose commission when a shipment auto-delivers |
| 6 | **Medium** | `tracker.ts` GET `/port-activity` | Port activity ordered by `timestamp` ascending — most recent events appear last |
| 7 | **Medium** | CORS | `app.use(cors())` accepts all origins (`*`) — no origin whitelist configured |
| 8 | **Low** | `wallet.ts` GET `/crypto-addresses` | Platform deposit addresses exposed without authentication — could expose internal wallet info |
| 9 | **Low** | `guild.ts` GET `/referrals` | Tier 3 referrals not included in referral tree response despite earning 1% commission |
| 10 | **Low** | `admin.ts` GET `/deposits` | No status filtering implemented in the route handler despite the OpenAPI spec and admin UI implying it |
| 11 | **Low** | `admin.ts` GET `/kyc` | Only `pending` KYC submissions returned — no way to review approved/rejected history |
| 12 | **Low** | N+1 queries | Multiple routes iterate over arrays and make per-row DB queries (deposits, withdrawals, guild referrals, delivery feed, tracker). These should be replaced with joins or batch queries at scale |

---

## NEXT DEVELOPMENT PRIORITIES

### Priority 1 — Critical Security & Data Integrity
1. **Fix JWT_SECRET fallback** in `lib/auth.ts` — match the production-safe IIFE pattern already used in route files
2. **Reserve balance on withdrawal submission** — deduct from available balance (or add a `reserved_balance` field) when a withdrawal is submitted, not just when processed
3. **Add rate limiting** — protect `/auth/login`, `/auth/2fa/complete`, `/auth/change-password` with express-rate-limit (e.g., 10 req/min per IP)

### Priority 2 — Business Logic Bugs
4. **Guild commissions in cron** — add the full 3-tier commission logic to `cron.ts` auto-delivery (duplicate the logic from the admin deliver endpoint)
5. **Fix tier earnings breakdown** — compute and return `tier1Earnings`, `tier2Earnings`, `tier3Earnings` in `GET /guild/stats`
6. **Fix `totalInvested` in admin user list** — join with investments table or use a subquery

### Priority 3 — Missing Core Features
7. **Withdrawal rejection endpoint** — `POST /admin/withdrawals/:id/reject` that marks rejected, returns funds to user balance
8. **Password reset flow** — forgot-password endpoint that generates a time-limited token; integrate an email service (Resend, SendGrid, etc.) for delivery
9. **Tier 3 referrals in `/guild/referrals`** — extend the referral tree to include Tier 3 entries

### Priority 4 — Quality & UX Improvements
10. **Port activity ordering** — change `orderBy(portActivityTable.timestamp)` to `desc(portActivityTable.timestamp)`
11. **`is_featured` shipment flag** — expose in admin create/update, use it for the featured shipment in market summary
12. **KYC file upload** — add a `POST /api/profile/kyc/upload` endpoint (object storage) so users can upload directly rather than supplying external URLs
13. **Admin withdrawal status filter** — implement query-param filtering on `GET /admin/deposits` and expose withdrawal status filter
14. **Admin KYC history** — support `status` query param on `GET /admin/kyc` (all/pending/approved/rejected)

### Priority 5 — Infrastructure & Scale
15. **Replace N+1 queries** — refactor deposit, withdrawal, guild, delivery-feed, and tracker routes to use joins or batch selects
16. **WebSocket live tracker** — wire socket.io to push position updates when shipment progress changes
17. **Email notifications** — triggered on: deposit approved/rejected, KYC decision, withdrawal processed, delivery credited
18. **Token refresh / revocation** — implement refresh tokens with a `refresh_tokens` DB table; provide `/auth/refresh` and `/auth/logout` (server-side) endpoints
