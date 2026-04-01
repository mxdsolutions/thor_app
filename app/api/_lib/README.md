# API Utilities

Shared utilities for all API route handlers. Eliminates boilerplate auth checks, pagination parsing, and error formatting.

## Files

- **`handler.ts`** — `withAuth()` wrapper that provides `{ supabase, user, tenantId }` to route handlers
- **`pagination.ts`** — `parsePagination()` extracts limit/offset/search from request URL
- **`errors.ts`** — Standardized error responses: `validationError()`, `serverError()`, `notFoundError()`, `missingParamError()`
- **`line-items.ts`** — `recalcJobAmount()` / `recalcOpportunityValue()` — generic line item total recalculation

## Usage Pattern

```ts
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase, user, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);
    // ... business logic only
});
```
