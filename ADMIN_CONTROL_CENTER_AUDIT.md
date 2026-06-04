# Admin Control Center — Audit Document
**Phase 4 | TradeBox Platform**

---

## 1. Scope

Phase 4 converts the existing admin dashboard into a full platform management system (Super Admin Control Center). The following areas were explicitly **not touched**: referral logic, wallet calculations, commission engine, shipment processing.

---

## 2. Database Changes

### 2.1 `users` table — new columns

| Column            | Type      | Default | Purpose |
|-------------------|-----------|---------|---------|
| `status`          | text      | active  | Account state: active / suspended / banned |
| `registration_ip` | text      | null    | IP captured at signup |
| `last_login_ip`   | text      | null    | IP updated on every successful login |
| `session_version` | integer   | 0       | Incremented on ban / force-logout / password-reset to invalidate existing JWTs |

### 2.2 `platform_settings` table (singleton)

One row; created on first GET if absent. Fields: siteName, logoUrl, faviconUrl, supportEmail, telegramLink, whatsappLink, registrationEnabled, requireKyc, referralsEnabled, minDeposit, minWithdrawal, withdrawalFeePercent, tier1Rate, tier2Rate, tier3Rate, maintenanceMode, sessionTimeoutDays, maxLoginAttempts, updatedAt.

### 2.3 `announcements` table

Fields: id, title, message, type (popup | banner), targetAudience (all | kyc_approved | kyc_pending | no_kyc), isActive, scheduledAt, expiresAt, createdBy (FK users), createdAt, updatedAt.

---

## 3. Auth Changes (`lib/auth.ts`)

### 3.1 `signToken`
Now embeds `sessionVersion` in the JWT payload alongside `userId` and `role`.

### 3.2 `verifyToken`
Returns `{ userId, role, sessionVersion }`.

### 3.3 `requireAuth` (now async)
Every authenticated request performs a DB lookup to:
1. Verify the user still exists.
2. Check `user.status !== 'banned'` and `!== 'suspended'` → 403 if violated.
3. Verify `user.sessionVersion === token.sessionVersion` → 401 if mismatch (force-logout / password-reset).

**Performance note:** One additional SELECT per request. Acceptable for the user base; add Redis caching if throughput becomes a concern.

### 3.4 Auth routes (`routes/auth.ts`)
- `POST /auth/register`: writes `registrationIp` and `sessionVersion: 0`; signs token with sessionVersion.
- `POST /auth/login`: rejects banned/suspended accounts before password check; writes `lastLoginIp`; signs token with current sessionVersion. Checks status before 2FA flow.

---

## 4. New Backend Endpoints (`routes/admin-control.ts`)

All routes require `requireAuth` + `requireAdmin` middleware.

### 4.1 User Management

| Method | Path | Action |
|--------|------|--------|
| GET    | /admin/users | Enhanced user list with totalInvested, totalCommissions; filterable by search/status/kycStatus/role |
| GET    | /admin/users/:id | Full user detail with referral chain, investment history |
| POST   | /admin/users/:id/suspend | Sets status=suspended |
| POST   | /admin/users/:id/unsuspend | Sets status=active |
| POST   | /admin/users/:id/ban | Sets status=banned, increments sessionVersion |
| POST   | /admin/users/:id/reset-password | Bcrypt-hashes new password, increments sessionVersion |
| POST   | /admin/users/:id/force-logout | Increments sessionVersion (invalidates all JWTs) |
| POST   | /admin/users/:id/promote | Sets role=admin |
| POST   | /admin/users/:id/demote | Sets role=user (cannot demote self) |
| POST   | /admin/users/:id/add-balance | Credits balance, inserts deposit transaction |
| POST   | /admin/users/:id/deduct-balance | Debits balance, inserts withdrawal transaction |
| POST   | /admin/users/:id/add-commission | Credits balance, inserts guild_commission transaction |

**Safeguards:**
- Cannot suspend/ban admin accounts.
- Cannot demote the currently logged-in admin (prevents lockout).
- Balance deduction checks for sufficient funds.

### 4.2 Platform Settings

| Method | Path | Action |
|--------|------|--------|
| GET    | /admin/settings | Returns singleton settings row (auto-creates with defaults if absent) |
| PATCH  | /admin/settings | Partial update; upserts if no row exists |

### 4.3 Plan Management

| Method | Path | Action |
|--------|------|--------|
| GET    | /admin/plans | All shipments + investorCount + investorVolume |
| POST   | /admin/plans/:id/toggle-featured | Toggles isFeatured flag |
| POST   | /admin/plans/:id/activate | Sets status=open |
| POST   | /admin/plans/:id/deactivate | Sets status=funded (paused) |

**Note:** Delivered plans cannot be reactivated.

### 4.4 Announcements

| Method | Path | Action |
|--------|------|--------|
| GET    | /admin/announcements | All announcements (admin view, no date filtering) |
| POST   | /admin/announcements | Create with schedule/expiry support |
| PATCH  | /admin/announcements/:id | Partial update |
| DELETE | /admin/announcements/:id | Hard delete |

### 4.5 Analytics

| Method | Path | Action |
|--------|------|--------|
| GET    | /admin/analytics | Comprehensive live stats: users (total/active/suspended/banned/today), KYC (pending/approved), financials (all-time + today), pending actions, shipment counts |

---

## 5. Public Endpoint (`routes/announcements-public.ts`)

| Method | Path | Auth | Action |
|--------|------|------|--------|
| GET    | /api/announcements | None | Returns active, non-expired, non-future-scheduled announcements |

Used by the user-facing dashboard to show banners/popups.

---

## 6. Frontend

### 6.1 New Tabs Added to `/admin`

| Tab | Component | Purpose |
|-----|-----------|---------|
| Users V2 | `admin-users.tsx` | Full user management with search/filter, expandable rows, all action dialogs |
| Platform Settings | `admin-settings.tsx` | General / Registration / Financial / Security form |
| Investment Plans | `admin-plans.tsx` | Plan list with feature/activate/deactivate + new plan creation |
| Announcements | `admin-announcements.tsx` | Full CRUD with scheduling, expiry, audience targeting |
| Analytics | Inline in `admin.tsx` | Enhanced metrics grid (users today, financials today, KYC, pending queue) |

### 6.2 New Hooks (`lib/api-client-react/src/extra-hooks.ts`)

Added: `useAdminListUsersV2`, `useAdminGetUserDetail`, `useAdminSuspendUser`, `useAdminUnsuspendUser`, `useAdminBanUser`, `useAdminResetPassword`, `useAdminForceLogout`, `useAdminPromoteUser`, `useAdminDemoteUser`, `useAdminAddBalance`, `useAdminDeductBalance`, `useAdminAddCommission`, `useAdminGetSettings`, `useAdminUpdateSettings`, `useAdminGetPlans`, `useAdminTogglePlanFeatured`, `useAdminActivatePlan`, `useAdminDeactivatePlan`, `useAdminGetAnnouncements`, `useAdminCreateAnnouncement`, `useAdminUpdateAnnouncement`, `useAdminDeleteAnnouncement`, `useAdminAnalytics`, `usePublicAnnouncements`.

---

## 7. Security Notes

1. **Session invalidation** is immediate and cryptographic — incrementing `sessionVersion` ensures even valid-signature JWTs are rejected on next API call.
2. **Audit trail** — all admin actions are logged via the existing `audit()` utility with adminId, targetUser, action, and IP.
3. **Admin-on-admin protection** — suspension/ban/demote of admin accounts is blocked server-side; self-demote is blocked.
4. **IP capture** is passive (no enforcement); used for audit/forensic purposes only.
5. The **public announcements** endpoint has no auth — filtered server-side to show only active, non-expired, non-future-scheduled items.

---

## 8. What Was NOT Changed

- `commission.ts` / guild commission calculation logic — untouched
- `wallet.ts` / deposit/withdrawal flow — untouched  
- `shipments.ts` / investments.ts / freight processing — untouched
- `referral chain` validation logic in `auth.ts` register — untouched
- All existing admin routes in `routes/admin.ts` — untouched (new router mounted alongside)
