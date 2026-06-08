---
name: TradeBox file upload pattern
description: How file uploads work (proof of payment, avatar) — backend route, storage, and DB migration approach.
---

## Upload routes
- `POST /api/upload/proof` — saves to `artifacts/uploads/proofs/`
- `POST /api/upload/avatar` — saves to `artifacts/uploads/avatars/`
- Both accept `{ data: base64string, ext: "jpg"|"png"|... }` JSON body
- Both require `requireAuth` middleware
- Response: `{ url: "/api/uploads/proofs/filename.ext" }`
- Registered in `routes/index.ts` at `/api/upload`

## Frontend pattern
```ts
const res = await fetch(`${BASE}/api/upload/proof`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ data: base64, ext }),
});
const { url } = await res.json();
```

## DB migration — DO NOT use drizzle-kit push interactively
- `pnpm --filter @workspace/db push` is interactive and will fail in CI/non-TTY
- `pnpm --filter @workspace/db push-force` risks data loss (pre-existing schema drift: `is_archived` on shipments)
- **Safe approach**: use `executeSql` via code_execution sandbox for additive ALTER TABLE changes
- Example: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`

**Why:** The shipments table has `is_archived` in DB but not in Drizzle schema — push always detects this as a drop and requires interactive confirmation.
