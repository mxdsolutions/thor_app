# Code Review Tasks — THOR: Tradie OS

**Date:** 2026-03-26
**Audit:** code-review_2026-03-26_incomplete
**Status:** Incomplete

---

## P0 — Critical (Security)

- [x] **Add authentication to `/api/stats/route.ts`** — Replace direct `createClient` from `@supabase/supabase-js` with the SSR `createClient` from `@/lib/supabase/server` and add the standard auth check.
- [x] **Add Zod validation to all POST/PATCH API routes** — Create schemas for companies, contacts, leads, opportunities, products, and notes. Validate request bodies before passing to Supabase.
- [x] **Add ID validation to `/api/products` PATCH** — Add `if (!id)` check matching the pattern in leads and opportunities routes. (Now handled via `productUpdateSchema` which requires `id`.)
- [x] **Move demo credentials to environment variables** — Extract hardcoded `demo@mxdsolutions.com.au` / `demo123456` from `app/actions/auth.ts` to `.env.local`.
- [x] **Sanitise error responses** — Replace raw `error.message` pass-through in all API routes with generic user-facing messages. Log the real error server-side only.

---

## P1 — High (Performance)

- [ ] **Convert list pages to server components** — Refactor dashboard pages to use server-side data fetching with Suspense boundaries and loading skeletons instead of `"use client"` + `useEffect` + `fetch`.
- [ ] **Add pagination to all list API endpoints** — Add `page` and `limit` query params to `/api/leads`, `/api/companies`, `/api/contacts`, `/api/opportunities`, `/api/products`, `/api/jobs`, `/api/projects`, `/api/users`. Use Supabase `.range()`.
- [ ] **Remove unused `recharts` dependency** — Uninstall until the performance chart feature is actually built.
- [x] **Remove `lucide-react` dependency** — Consolidate to `@heroicons/react` only. Replace any lucide icon usages with heroicon equivalents.
- [ ] **Evaluate `framer-motion` usage** — Replace simple fade/stagger animations with CSS `@keyframes` and remove the dependency, or keep only if complex animations justify the bundle cost.

---

## P2 — Medium (Modularity & Redundancy)

- [x] **Extract duplicate utility functions to `lib/utils.ts`** — Move `getInitials()`, `formatLastActive()`, `getDisplayName()`, `timeAgo()`, and `formatCurrency()` to a shared location. Remove all inline definitions.
- [ ] **Consolidate duplicate user pages** — Merge `/dashboard/settings/users/page.tsx` and `/dashboard/operations/users/page.tsx` into a single shared component, parameterised by workspace context.
- [ ] **Create generic `<EntityModal>` component** — Replace the 5 create modals (`CreateCompanyModal`, `CreateLeadModal`, `CreateContactModal`, `CreateOpportunityModal`, `CreateProductModal`) with a config-driven generic modal.
- [ ] **Create generic `<EntitySheet>` component** — Replace the 5 side sheets (`CompanySideSheet`, `LeadSideSheet`, `ContactSideSheet`, `OpportunitySideSheet`, `ProductSideSheet`) with a config-driven generic sheet.
- [ ] **Create typed API client (`lib/api.ts`)** — Centralise all `fetch("/api/...")` calls with typed request/response interfaces, shared error handling, and consistent patterns.
- [ ] **Create `withAuth` wrapper for API routes** — Extract the repeated 4-line auth check into a reusable higher-order function to wrap route handlers.
- [ ] **Extract shared profile resolution utility** — Consolidate the duplicate user-name resolution code from `/api/notes` and `/api/activity` into a shared function.
- [ ] **Decompose dashboard layout** — Break `app/dashboard/layout.tsx` (320 lines) into `Sidebar`, `MobileNav`, `WorkspaceNav`, and `UserMenu` components.

---

## P3 — Low (Cleanup & Polish)

- [x] **Audit and prune unused design system tokens** — Review `lib/design-system.ts` and remove exports not referenced anywhere in the codebase.
- [ ] **Remove metadata-only layout files** — Replace the 9 layout files that only set `metadata.title` with `generateMetadata()` in the corresponding page files.
- [ ] **Replace hardcoded content data** — Remove the 5 hardcoded items in `/dashboard/operations/content/page.tsx` and implement real API fetch or mark the feature as disabled.
- [ ] **Create custom hooks** — Extract `useNotes()`, `useActivity()`, and `useFetchList()` hooks to reduce component complexity in side sheets and pages.
- [ ] **Sync filters to URL search params** — Persist search and filter state in URL so it survives navigation.
- [ ] **Wire up incomplete features** — Add `onClick` handlers to Projects & Jobs "Add" buttons. Ensure opportunity side sheet updates trigger parent refetch.
- [ ] **Add loading skeletons** — Replace "Loading..." text with skeleton UI components across all list pages.

---

## Completion Criteria

When all tasks above are completed:
1. Rename this audit folder from `code-review_2026-03-26_incomplete` to `code-review_2026-03-26_complete`.
2. Update the status field at the top of both `REVIEW.md` and this file to **Complete**.
