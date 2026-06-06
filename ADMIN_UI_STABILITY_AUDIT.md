# Admin UI Stability Audit
**Date:** June 2026  
**Scope:** All admin page components in `artifacts/tradebox/src/pages/`

---

## Summary

All admin pages were audited for null/undefined access risks, unsafe `.toLocaleString()` calls, date formatting errors, and unsafe type coercions. One crash was found and fixed.

---

## Pages Audited

| File | Risk Level | Issues Found | Status |
|------|-----------|--------------|--------|
| `admin.tsx` | Low | None — uses `stats?.field || 0` pattern | ✅ Safe |
| `admin-plans.tsx` | **Medium** | `fundingRaised.toLocaleString()` crash on null | ✅ Fixed |
| `admin-users.tsx` | Low | Uses optional chaining throughout | ✅ Safe |
| `admin-announcements.tsx` | Low | Null guards on all date/string fields | ✅ Safe |
| `admin-shipment-overrides.tsx` | Low | Uses `?? 0` defaults on all numeric fields | ✅ Safe |
| `admin-audit-log.tsx` | Low | Stable — reads string data only | ✅ Safe |
| `admin-settings.tsx` | Low | Form reset uses `?? ""` fallbacks | ✅ Safe |
| `admin-news.tsx` | Low | New — all fields use null-safe defaults | ✅ Safe |

---

## Fix Applied

### `admin-plans.tsx` — Line 275
**Error:** `Cannot read properties of null (reading 'toLocaleString')`

**Root Cause:**  
The `fundingRaised` and `fundingGoal` fields on the `AdminPlan` type are declared as `number`, but the API can return `null` when a shipment has just been created without funding data populated yet. Calling `.toLocaleString()` directly on `null` causes a runtime crash.

**Fix:**
```tsx
// Before (crashes on null):
`${p.fundingRaised.toLocaleString()} / ${p.fundingGoal.toLocaleString()} USDT`

// After (null-safe):
`${(p.fundingRaised ?? 0).toLocaleString()} / ${(p.fundingGoal ?? 0).toLocaleString()} USDT`
```

---

## General Patterns Enforced

1. **Numeric display** — All `.toLocaleString()` calls must be wrapped: `(value ?? 0).toLocaleString()`
2. **Date formatting** — All `parseISO()` / `format()` calls must be guarded: `date ? format(parseISO(date), ...) : "—"`
3. **Array mapping** — All list renders must use `(data ?? []).filter(...)` to avoid map-on-undefined
4. **Dictionary lookups** — Color/config maps must use fallback: `statusColors[x] ?? defaultStyle`
5. **Form resets** — All form fields initialized with `?? ""` or `?? 0` to prevent uncontrolled input warnings

---

## Recommendations

- Add Zod response validation on the client side for admin data fetches to catch type mismatches at runtime
- Consider adding a global error boundary around each admin tab to prevent one crashing tab from taking down the whole admin panel
