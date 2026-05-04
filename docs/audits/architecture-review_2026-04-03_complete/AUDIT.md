# Architecture & Code Review — 2026-04-03

**Scope:** Modularity, scalability, readability, structuring, documentation, agent-friendliness
**Status:** Complete

---

## Summary

The project has **strong architectural foundations**: consistent API patterns, clean module boundaries, good tenant isolation, and excellent CLAUDE.md documentation. The main areas for improvement are: inconsistent data-fetching patterns in components, API response shape inconsistency, code duplication across Kanban pages and side sheets, missing database-level RLS enforcement, and documentation gaps that hurt agent autonomy.

**Scores:**

| Category | Grade | Notes |
|----------|-------|-------|
| Modularity | B+ | Clean separation; some leaky abstractions in modals/sheets |
| Scalability | B- | SWR + client-filtering won't scale; stats endpoint is N+1; no RLS |
| Readability | B | Consistent patterns; weak typing (`any`); sparse inline docs |
| Structuring | A- | Excellent file org; API `_lib/` pattern is great |
| Documentation | B | CLAUDE.md is strong; README is boilerplate; missing DB schema |
| Agent-friendliness | B- | Good patterns guide; conventions need more explicit documentation |

---

## Critical Findings

### C1. No Supabase RLS enforcement — tenant isolation is application-only

All API routes manually filter by `tenant_id` via application code. If a route omits this filter, or a direct Supabase client call bypasses the API, data from other tenants is accessible. There is no evidence of Row Level Security policies as a safety net.

**Impact:** A single missed `.eq('tenant_id', tenantId)` = cross-tenant data leakage.
**Fix:** Enable RLS on all tenant-scoped tables with `tenant_id = auth.jwt()->>'active_tenant_id'` policies. Keep application-level filtering as defense-in-depth.

### C2. API response shape inconsistency

List endpoints use different response keys:
- `/api/leads` returns `{ leads, total }`
- `/api/opportunities` returns `{ opportunities, total }`
- `/api/invoices` returns `{ items, total }`
- `/api/quotes` returns `{ items, total }`

Create/update endpoints similarly vary (`{ lead }` vs `{ item }`).

**Impact:** SWR hooks and components must know each endpoint's unique shape. New entity creation is error-prone. Generic data-fetching utilities are impossible.
**Fix:** Standardize all endpoints to `{ items: T[], total: number }` for lists and `{ item: T }` for single entities. Migrate existing SWR consumers.

---

## High Findings

### H1. Untyped error handling throughout

20+ instances of `catch (err: any)` across server actions and components. All return generic "An unexpected error occurred" messages with no structured logging.

**Key files:**
- `app/actions/auth.ts` — 6 instances
- `app/actions/tenantSignup.ts`, `inviteUser.ts`, `onboarding.ts`
- `app/api/email/messages/send/route.ts`
- `components/sheets/EmailSideSheet.tsx`

**Fix:** Replace with `catch (err: unknown)`, use `err instanceof Error` guards, add structured logging (`console.error('[route] context:', error)`).

### H2. Stats endpoint runs 17+ parallel queries

`app/api/stats/route.ts` executes 17 separate `count(*)` queries in `Promise.all()`, plus 12 chart queries (2 per month). Total: ~29 queries per stats request.

**Impact:** Slow response under load; each query is a separate PostgREST round-trip.
**Fix:** Create a PostgreSQL view or function that calculates all metrics in a single query. Cache the result with a 5-minute TTL.

### H3. Client-side list filtering doesn't scale

Dashboard pages (leads, opportunities, jobs) fetch all records via SWR, then filter client-side with `.filter()`. No server-side search/filter delegation beyond the initial `search` param.

**Key files:**
- `app/dashboard/crm/leads/page.tsx`
- `app/dashboard/crm/opportunities/page.tsx`
- `app/dashboard/operations/jobs/page.tsx`

**Fix:** Push filtering to the API (status, priority, date range params). Use server-side pagination for large datasets.

### H4. Kanban page duplication

Three Kanban pages (leads, opportunities, jobs) repeat the same ~250-line pattern:
- useState for search, selected item, modals
- SWR hook + client filter
- Identical move handler with optimistic mutate
- Same card rendering with formatters

**Fix:** Extract a `useKanbanPage<T>()` hook or create a `KanbanPageTemplate` component with pluggable column config and card renderer.

### H5. Side sheet complexity and duplication

5+ side sheets (Lead, Opportunity, Job, Quote, Invoice) each re-implement:
- Tab state management
- Direct Supabase data fetching in `useEffect`
- User list fetching (duplicated across sheets)
- Save handler pattern

Most are 200-280 lines mixing data fetching, editing, and rendering.

**Fix:** Extract a `useUsers()` SWR hook for the shared user-list fetch. Consider a `BaseSideSheet<T>` component with pluggable field definitions and tabs.

---

## Medium Findings

### M1. Modal data fetching bypasses SWR

4+ modals fetch related data (companies, leads) directly via `fetch()` in `useEffect` with silent error swallowing:

```typescript
useEffect(() => {
  if (open) {
    fetch("/api/companies")
      .then(r => r.json())
      .then(d => setCompanies(d.companies || []))
      .catch(() => { });  // Silent failure
  }
}, [open]);
```

**Key files:** `CreateLeadModal`, `CreateContactModal`, `CreateJobModal`, `CreateOpportunityModal`
**Fix:** Create SWR hooks like `useCompaniesForSelection()` that share cache with list pages.

### M2. `any` types in SWR mutate callbacks and modal props

- Kanban pages use `mutate((current: any) => ...)` for optimistic updates — no type safety
- Modal `onCreated` callbacks typed as `(entity: any) => void`
- `Kanban.tsx` uses `[key: string]: any` for item types
- `app/api/stats/route.ts:90` has `supabase: any` parameter

**Fix:** Create typed SWR response interfaces. Type modal callbacks with entity-specific types.

### M3. Missing SWR hooks for sub-entities

No SWR hooks exist for line items (quote, job, opportunity). Side sheets query Supabase directly, bypassing the caching layer.

**Fix:** Add `useQuoteLineItems(id)`, `useJobLineItems(id)`, `useOpportunityLineItems(id)` to `lib/swr.ts`.

### M4. `xero-sync.ts` is monolithic (22KB, 786 lines)

Handles both contact and invoice sync mapping in a single file.

**Fix:** Split into `lib/xero-sync-contacts.ts` and `lib/xero-sync-invoices.ts`.

### M5. No error boundaries

No React error boundaries protect side sheets, modals, or page content. A component error crashes the entire page.

**Fix:** Add error boundaries around `DashboardShell` children and within side sheets.

### M6. Middleware has mixed concerns (220 lines)

Tenant resolution, auth routing, platform admin gating, and header injection are all in one file.

**Fix:** Extract into composable middleware functions: `resolveTenant()`, `handleAuthRouting()`, `gatePlatformAdmin()`.

---

## Low Findings

### L1. README.md is boilerplate create-next-app

Doesn't describe the project, links to Vercel docs, references Geist font (not used).

**Fix:** Replace with a 3-paragraph summary: what THOR is, tech stack, link to CLAUDE.md.

### L2. Missing DATABASE.md

No documentation of tables, relationships, or RLS policies. Agents must reverse-engineer schema from Zod schemas and API code.

**Fix:** Create `DATABASE.md` with table list, key relationships, and tenant_id propagation strategy.

### L3. CLAUDE.md gaps

Missing sections:
- Server actions pattern (`app/actions/`)
- Middleware deep dive (caching, domain resolution)
- Form handling pattern in modals
- Testing examples
- Environment variables reference
- When to use `withAuth` vs `withPlatformAuth` decision tree

### L4. Sparse inline documentation

~40% of files have no JSDoc or comments. Critical areas lacking docs:
- Component props and usage
- Config objects (statusColumns, priority mappings)
- Integration logic (Xero, Outlook)

### L5. No route constants

Navigation relies on string matching (`pathname.startsWith('/dashboard/crm')`). Route paths are scattered as string literals.

**Fix:** Define `const ROUTES = { CRM_LEADS: '/dashboard/crm/leads', ... }` for type-safe routing.

### L6. In-memory tenant cache doesn't scale across workers

Middleware's 500-item LRU cache is per-process. Multiple Node workers each maintain separate caches with no shared invalidation.

**Fix:** Acceptable for current scale. Move to Redis if deploying multi-worker.

### L7. No code splitting for heavy dependencies

All dashboard pages bundle with the same dependencies (recharts, framer-motion, etc.). Loading a simple page may pull in charting libraries.

**Fix:** Use `next/dynamic` for heavy components (charts, PDF renderer).

---

## Documentation Recommendations (Agent-Friendliness)

These changes would raise agent-friendliness from ~6.5/10 to ~8.5/10:

| Change | Impact | Effort |
|--------|--------|--------|
| Replace README.md with project summary | Medium | 10 min |
| Create DATABASE.md with schema reference | High | 45 min |
| Add "Form Patterns" section to CLAUDE.md | High | 30 min |
| Add "Server Actions" section to CLAUDE.md | Medium | 15 min |
| Add "Middleware Deep Dive" to CLAUDE.md | High | 20 min |
| Create TESTING.md with example tests | Medium | 30 min |
| Add JSDoc to all modal/sheet components | Medium | 30 min |
| Document env vars reference | Low | 15 min |
