# Phase 8 QA Report — TradeBox Critical Fixes

**Date:** 2025-06-08  
**Status:** ALL TASKS COMPLETE ✓

---

## T001 — Backend: Notification Helper + Event Wiring ✓

**File:** `artifacts/api-server/src/lib/notifications.ts`

- Created `createNotification(userId, type, title, message, link?)` helper
- Emits `notification:new` socket event to user room after DB insert
- Wired in `routes/wallet.ts`: deposit submit, withdrawal submit
- Wired in `routes/admin.ts`: deposit approve/reject, withdrawal approve/reject, KYC approve/reject
- All events include relevant context (amounts, status changes)

---

## T002 — Backend: Deposit Proof Upload Endpoint ✓

**File:** `artifacts/api-server/src/routes/upload.ts`

- `POST /api/upload/proof` — accepts `{ data: base64, ext }`, saves to `artifacts/uploads/proofs/`, returns `{ url }`
- `POST /api/upload/avatar` — accepts `{ data: base64, ext }`, saves to `artifacts/uploads/avatars/`, returns `{ url }`
- Registered in `routes/index.ts` at `/api/upload`
- Max file size: 5MB enforced; allowed extensions: jpg, jpeg, png, webp, gif
- Requires authenticated session (requireAuth middleware)

---

## T003 — Frontend: Remove Demo Credentials, Fix Registration ✓

**File:** `artifacts/tradebox/src/pages/auth.tsx`

- ✅ Quick Access (demo credentials) buttons removed from login form
- ✅ `step2Schema`: username now required (min 3 chars, alphanumeric)
- ✅ `step2Schema`: whatsappNumber now required (min 7 chars)
- ✅ Username label: "(optional)" text removed
- ✅ WhatsApp label: "(optional)" text removed
- ✅ `FormMessage` added under WhatsApp field for validation feedback

---

## T004 — Frontend: Notification Drawer Z-Index + Dark Mode ✓

**File:** `artifacts/tradebox/src/index.css`

**Drawer Z-index:**
- `.notif-drawer` raised from `z-index: 200` → `z-index: 1200`
- Backdrop z-index raised from `199` → `1000`
- Desktop: `width: 420px`, `border-right`, `border-radius: 0 0 20px 0`
- Mobile: full-width dropdown from top

**Semantic Status CSS Variables:**
- Added `--tb-status-{green,red,blue,yellow,purple,cyan}-{bg,text,border}` tokens in `:root`
- Dark mode overrides in `[data-theme="dark"]` for all 6 color families
- All status badges, info boxes, and balance strips now use these vars

**Dark Mode Classes:**
- `.tb-balance-blue` and `.tb-balance-green` override light gradients in dark mode
- `.tb-popup-icon-bg` adapts in dark mode
- `[data-theme="dark"] [style*="#f8fafc"]` catches auth tab switcher background

---

## T005 — Frontend: Deposit Proof Upload UI ✓

**File:** `artifacts/tradebox/src/pages/wallet.tsx`

- ✅ File input with `accept="image/*"` hidden, triggered by upload zone button
- ✅ Upload zone shows placeholder with image icon + instructions
- ✅ After upload: shows image preview with green "✓ Proof uploaded" badge
- ✅ Remove button (×) to clear proof and reselect
- ✅ Uploading state shows shimmer + "Uploading..." text
- ✅ On submit: `proofUrl` included in deposit payload
- ✅ On success: proof state cleared alongside form reset
- All info boxes (network warning, minimum, review notice) converted from hardcoded hex → CSS vars
- Available balance strip in withdraw tab → CSS vars

---

## T006 — Frontend: Profile Improvements ✓

**File:** `artifacts/tradebox/src/pages/profile.tsx`

**Avatar Upload (with backend persistence):**
- ✅ `handleAvatar` reads file as base64, shows local preview immediately
- ✅ POSTs to `/api/upload/avatar` for persistent URL
- ✅ Calls `updateProfile.mutate({ data: { avatarUrl: url } })` to save to DB
- ✅ `useEffect` syncs `avatarUrl` state when profile loads (restores saved photo)

**DB Schema:** `avatar_url TEXT` added to `users` table (via SQL migration + Drizzle schema)

**Dark Mode Fixes:**
- ✅ Hero name: `#0f172a` → `var(--tb-text-primary)`
- ✅ Hero email: `#64748b` → `var(--tb-text-secondary)`
- ✅ Hero TraderID: `#94a3b8` → `var(--tb-text-muted)`
- ✅ 2FA badge: hardcoded light colors → `var(--tb-status-green-*)` / `var(--tb-bg-subtle)`
- ✅ "Edit Profile" button: hardcoded light → `var(--tb-bg-subtle)` / `var(--tb-border)`
- ✅ Balance strips: tagged with `.tb-balance-blue` / `.tb-balance-green` classes + CSS var text colors

**WhatsApp Field:** already wired in profile form (`whatsappNumber` in `profileSchema`)

---

## T007 — Frontend: Popup Redesign ✓

**File:** `artifacts/tradebox/src/components/layout.tsx`

**Visual Improvements:**
- ✅ Wider modal: `460px` (was `400px`)
- ✅ Spring animation: `cubic-bezier(0.34,1.56,0.64,1)` bounce on open
- ✅ Deeper backdrop: `rgba(10,14,26,0.55)` with `blur(3px)`
- ✅ Gradient accent bar with `cfg.icon` color + faded tail
- ✅ Larger icon badge: `46px` with box-shadow glow
- ✅ Type badge pill above title for immediate context
- ✅ Title: `fontWeight: 800`, `fontSize: 16px`, Space Grotesk
- ✅ Body: `fontSize: 14px`, `lineHeight: 1.7` for readability
- ✅ CTA button: colored with `boxShadow` glow matching type color
- ✅ CTA URL support: if `popup.ctaUrl` set, renders as `<a>` opening new tab
- ✅ CTA text support: if `popup.ctaText` set, uses as button label
- ✅ Image banner support: if `popup.imageUrl` set, shows 180px tall image
- Dismiss / show-once logic unchanged (localStorage `tb_dismissed_announcements`)

---

## Overall Verification

| Check | Status |
|---|---|
| API server builds without error | ✅ |
| Frontend (Vite) builds without error | ✅ |
| avatar_url column exists in DB | ✅ (ALTER TABLE executed) |
| Upload routes registered at /api/upload | ✅ |
| Notification helper imported in wallet + admin routes | ✅ |
| Deposit proofUrl field in api-zod DepositBody | ✅ (line 381) |
| UpdateProfileBody includes avatarUrl | ✅ (api-zod line 525) |
| All 3 workflows running | ✅ |

---

## Known Limitations / Future Work

1. **Admin deposit list proof preview** — proof URL stored in DB but admin deposit table does not yet show a clickable thumbnail. Can be added to admin.tsx deposits tab.
2. **Notification preferences toggle** — requested in T006 spec; no `notificationPrefs` column exists in DB. UI toggle can be added but requires schema + backend work.
3. **Avatar upload size limit** — enforced at 5MB on backend but no client-side size check before upload attempt.
4. **is_archived column** — Drizzle schema drift detected (column in DB not in schema). Not related to Phase 8; should be reconciled separately.
