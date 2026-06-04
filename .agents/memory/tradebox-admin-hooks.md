---
name: TradeBox admin hooks split
description: Two sources of admin hooks — generated orval file vs hand-written extra-hooks.ts
---

## Rule
- **Orval-generated hooks** (from OpenAPI spec): `lib/api-client-react/src/generated/api.ts` — imported as `from "@workspace/api-client-react"` (via index re-export). Use for: useAdminListShipments, useAdminCreateShipment, useAdminDeliverShipment, useAdminUpdateShipment, useAdminListDeposits, useAdminApproveDeposit, useAdminRejectDeposit, useAdminListWithdrawals, useAdminProcessWithdrawal, useAdminListKyc, useAdminApproveKyc, useAdminRejectKyc, useAdminListUsers, useAdminGetStats.
- **Hand-written hooks**: `lib/api-client-react/src/extra-hooks.ts` — imported as `from "@workspace/api-client-react/src/extra-hooks"`. Use for: all Phase 4 admin control center hooks (useAdminListUsersV2, useAdminSuspendUser, useAdminBanUser, useAdminGetSettings, useAdminGetPlans, useAdminGetAnnouncements, useAdminAnalytics, etc.) plus 2FA and support ticket hooks.

**Why:** Orval regenerates the generated file on `pnpm orval`; hand-written additions would be wiped. Extra-hooks.ts is the stable home for anything not in the OpenAPI spec.
