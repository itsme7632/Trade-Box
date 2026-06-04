---
name: TradeBox admin router ordering
description: adminControlRouter must be mounted before adminRouter to take priority on shared route prefixes
---

## Rule
In `artifacts/api-server/src/routes/index.ts`, mount routers in this order:

```
router.use("/admin", adminControlRouter);   // enhanced GET /users, plus new endpoints
router.use("/admin", adminRouter);          // legacy admin routes (deposits, withdrawals, kyc, deliver, etc.)
```

**Why:** Both routers register `GET /users` and `GET /users/:id`. Express uses first-match routing, so `adminControlRouter` must come first to serve the enhanced version that includes totalInvested, totalCommissions, registrationIp, lastLoginIp, and status fields.

**How to apply:** Any future admin router additions that overlap with legacy admin.ts routes must also be mounted before adminRouter.
