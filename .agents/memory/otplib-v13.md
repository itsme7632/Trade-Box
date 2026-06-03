---
name: otplib v13 import and verify pattern
description: How to correctly import and use otplib v13 for TOTP in this project
---
In otplib v13, there is no `authenticator` named export. Use:

```typescript
import { generateSecret, generate, verify as totpVerify } from "otplib";
```

**Critical**: `totpVerify({ token, secret })` returns `{ valid: boolean }` (an object), NOT a boolean. An unchecked result is always truthy, creating an auth bypass. Always extract `.valid`:

```typescript
const result = await totpVerify({ token: String(token), secret });
const isValid = result?.valid === true;
```

Also: `generateSecret()` takes no arguments in v13 — calling `generateSecret(20)` causes a TS2559 type error.

**Why:** Discovered via code review rejection — object truthiness caused all OTP checks to pass regardless of token validity.

**How to apply:** Any time `totpVerify` is called (setup verify, disable, complete-login), always use `result?.valid === true` pattern.
