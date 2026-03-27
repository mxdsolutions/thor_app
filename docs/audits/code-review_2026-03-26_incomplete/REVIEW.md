# Code Review Audit — MXD Admin

**Date:** 2026-03-26
**Type:** Code Review
**Status:** Incomplete
**Scope:** Full codebase — structure, modularity, performance, security, redundancy

---

## 1. Security Issues

### Critical

- **`/api/stats/route.ts` — No authentication.** Uses `createClient` from `@supabase/supabase-js` with the service role key instead of the SSR auth client. Anyone can hit this endpoint and retrieve business metrics without being logged in.
- **No input validation on POST/PATCH endpoints.** 10 of 12 API routes accept `...body` and pass it directly to Supabase inserts/updates. Only `/api/profile` uses Zod validation. This allows injection of arbitrary fields (e.g. `created_by`, `id`, `role`).
- **Demo credentials hardcoded** in `app/actions/auth.ts` (`demo@mxdsolutions.com.au` / `demo123456`). Should be environment variables or removed for production.

### High

- **Raw Supabase error messages returned to client** across all API routes — could leak table names, column names, or constraint details to end users.
- **`/api/products` PATCH missing ID validation** — unlike `/api/leads` and `/api/opportunities` which check `if (!id)`, the products route does not validate before attempting an update.

---

## 2. Performance & Load Speed

### Every page is `"use client"` — no SSR at all

This is the single biggest performance issue. Every dashboard page uses `useEffect` + `fetch` on mount:

- No server-side data fetching — users see a blank/loading state on every navigation.
- No streaming or Suspense boundaries.
- No benefit from Next.js 15's server component model.
- No skeleton screens or meaningful loading placeholders (just "Loading..." text).

### No pagination

All list endpoints (`/api/leads`, `/api/companies`, `/api/contacts`, etc.) return every record. The Supabase queries have no `.range()` or `.limit()`. As data grows, response times and render times will degrade.

### No data caching or deduplication

- Every page mount triggers a fresh fetch — navigating away and back refetches everything.
- No SWR, React Query, or even simple in-memory cache.
- Modals and side sheets don't refetch parent data after mutations, resulting in stale UI.

### Heavy dependencies for minimal use

| Dependency | Size Impact | Usage |
|---|---|---|
| `recharts` | ~40KB | Only a "Coming soon" placeholder in operations overview |
| `framer-motion` | ~30KB | Simple fade/stagger animations that CSS `@keyframes` could handle |
| `lucide-react` | ~15-20KB | Imported alongside `@heroicons/react` — two icon libraries for one app |

---

## 3. Redundant / Unnecessary Code

### Duplicate pages

`/dashboard/settings/users/page.tsx` and `/dashboard/operations/users/page.tsx` are nearly identical — same fetch call, same table structure, same modal and side sheet usage. Only the breadcrumb context differs. Should be a single shared component.

### Duplicate utility functions

| Function | Defined In | Occurrences |
|---|---|---|
| `getInitials()` | leads page, opportunities page, users page | 3 |
| `formatLastActive()` | both user pages | 2 |
| `getDisplayName()` | both user pages | 2 |
| `timeAgo()` | NotesPanel, ActivityTimeline | 2 |
| `formatCurrency()` | ProductSideSheet, products page | 2 |

All should be extracted to `lib/utils.ts`.

### Cookie-cutter modals and side sheets

The 5 create modals (`CreateCompanyModal`, `CreateLeadModal`, `CreateContactModal`, `CreateOpportunityModal`, `CreateProductModal`) and 5 side sheets follow identical patterns with only field configurations differing. Approximately 1,500 lines of code that could be reduced to ~300 with generic `<EntityModal>` and `<EntitySheet>` components driven by config objects.

### Unused design system tokens

`lib/design-system.ts` exports many tokens (`pageHeaderClass`, `navLinkBase`, `navLinkActive`, `navSectionLabel`, etc.) that are not referenced anywhere in the codebase. Dead code that should be audited and pruned.

### Metadata-only layouts

9 layout files exist solely to set `metadata.title`. These could be replaced with `generateMetadata()` in the page files themselves, eliminating 9 unnecessary files.

### Hardcoded content data

`/dashboard/operations/content/page.tsx` renders 5 hardcoded items instead of fetching from an API. Appears to be a leftover mock.

---

## 4. Structural / Architectural Issues

### No API client layer

Every component does raw `fetch("/api/...")` with inline error handling. A typed API client (`lib/api.ts`) would centralise error handling, add type safety, and make it trivial to add auth headers, retry logic, or caching later.

### Auth check duplicated in every API route

All 12 API routes repeat the same 4-line authentication check:

```typescript
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

A shared `withAuth` higher-order function or middleware-level auth would eliminate this duplication.

### Notes & Activity have duplicate profile resolution

Both `/api/notes/route.ts` and `/api/activity/route.ts` independently fetch profiles to resolve user names with identical code blocks. Should be a shared utility function.

### No custom hooks

No `hooks/` directory exists. Patterns like `useNotes()`, `useActivity()`, `useFetchList()` would significantly reduce component complexity in the side sheets and page components.

### Dashboard layout is 320 lines

The sidebar, mobile menu, workspace detection, navigation items, and user profile are all in a single component (`app/dashboard/layout.tsx`). Should be decomposed into `Sidebar`, `MobileNav`, `WorkspaceNav`, and `UserMenu` components.

### No URL-persisted filters

Search and filter state is held in React state only. Navigating away and back loses all filter context. Filters should be synced to URL search params.

---

## 5. Incomplete Features

- **Projects & Jobs pages** — "Add" buttons have no `onClick` handlers.
- **Opportunity side sheet** — updates don't trigger parent list refetch.
- **Performance chart** — placeholder "Coming soon" in operations overview.
- **Content management** — hardcoded data, no real CRUD implementation.

---

## 6. Positive Observations

- Consistent use of `cn()` for Tailwind class merging across all components.
- Design tokens centralised in `design-system.ts` (good intent, needs cleanup).
- Generic `Kanban.tsx` component is well-typed and reusable.
- Compound sheet pattern (`DetailFields`, `NotesPanel`, `ActivityTimeline`) is a solid abstraction.
- Zod validation schemas centralised in `lib/validation.ts`.
- Middleware auth gating with admin role check is well implemented.
- Supabase client/server split is clean.
