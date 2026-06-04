---
name: TradeBox session invalidation pattern
description: How sessionVersion works in JWTs to enable instant force-logout/ban/password-reset invalidation
---

## Rule
Every JWT embeds `sessionVersion` (integer, starts 0). On every authenticated request, `requireAuth` does a DB SELECT to check `user.status` and `user.sessionVersion` against the token payload. Mismatch → 401 "Session expired".

## When to increment sessionVersion
- Admin bans a user: `SET sessionVersion = sessionVersion + 1`
- Admin force-logout: `SET sessionVersion = sessionVersion + 1`
- Admin resets password: `SET sessionVersion = sessionVersion + 1`
- User changes own password: currently does NOT increment (by design — user initiated it, their own token stays valid)

**Why:** Drizzle's `sql` template is used: `sql\`${usersTable.sessionVersion} + 1\`` — not a raw numeric literal, to avoid SQL injection.

## How to apply
In `auth.ts` `signToken(userId, role, sessionVersion)` — always pass the current DB value.
In `auth.ts` `requireAuth` — always SELECT `{ id, role, status, sessionVersion }` and compare.

**Performance note:** One extra SELECT per request. Acceptable; add Redis if throughput demands it.
