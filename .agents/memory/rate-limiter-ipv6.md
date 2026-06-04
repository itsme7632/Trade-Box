---
name: express-rate-limit IPv6 keyGenerator
description: How to suppress ERR_ERL_KEY_GEN_IPV6 ValidationError in express-rate-limit v8
---

## Rule
When writing a custom keyGenerator that extracts IP from x-forwarded-for, always wrap it with `ipKeyGenerator()` and add `validate: { xForwardedForHeader: false }`.

## Pattern
```typescript
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

rateLimit({
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip ?? "unknown";
    return ipKeyGenerator(rawIp);
  },
  validate: { xForwardedForHeader: false },
});
```

## Why
express-rate-limit v8 validates that custom keyGenerators call ipKeyGenerator() for IPv6 normalisation. Without it, throws a non-fatal ValidationError on every startup that pollutes logs.
