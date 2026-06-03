---
name: TradeBox API/Zod codegen pattern
description: How orval codegen works and when to hand-edit generated files vs running orval
---
orval codegen is configured in the monorepo and can be run via `pnpm orval`. However, the generated file `lib/api-zod/src/generated/api.ts` can be hand-edited when orval's output is not expected to change other things. New schemas should be added to both `lib/api-spec/openapi.yaml` (as the source of truth) and `lib/api-zod/src/generated/api.ts` (as the Zod mirror).

**Why:** The orval codegen runs with `clean: true`, which means it wipes and regenerates the file. If orval is not re-run after editing openapi.yaml, the generated file must be manually updated to stay in sync.

**How to apply:** When adding new endpoints/schemas, update both files together. If orval is re-run later, it may overwrite manual additions — so prefer running orval when possible.
