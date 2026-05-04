# THOR: Tradie OS — Audit Task List

**Source:** [AUDIT.md](./AUDIT.md)
**Date:** 2026-03-28

---

## Priority 1 — Critical (Security)

- [ ] **S1** — Sanitise email HTML with DOMPurify before `dangerouslySetInnerHTML` in `EmailSideSheet.tsx:191`
- [ ] **S2** — Enable leaked password protection in Supabase Dashboard → Auth → Password Security
- [ ] **S3** — Tighten RLS on `products` table — replace `WITH CHECK (true)` / `USING (true)` with ownership or role check
- [ ] **S4** — Add `SET search_path = public` to functions: `handle_new_user`, `log_entity_created`, `log_entity_updated`, `log_note_created`
- [ ] **S5** — Encrypt OAuth tokens at rest in `email_connections` table (Supabase Vault or app-level encryption)
- [ ] **S6** — Add rate limiting to auth endpoints and API routes (middleware or Supabase config)

---

## Priority 2 — High (Security + Performance + Code Quality)

### Security
- [ ] **S7** — Add ownership/role checks in PATCH handlers for `/api/leads` and `/api/opportunities` (don't rely solely on permissive RLS)
- [ ] **S8** — Whitelist avatar upload extensions to `['jpg', 'jpeg', 'png', 'gif', 'webp']` in `OnboardingFlow.tsx`
- [ ] **S9** — Restrict `profiles` SELECT RLS policy from `USING (true)` to at least `auth.role() = 'authenticated'`

### Performance
- [ ] **P1** — Add pagination (`?page=&limit=`) to all `/api/*` GET routes using Supabase `.range()`
- [ ] **P2** — Fix RLS initplan re-evaluation: wrap `auth.role()` → `(select auth.role())` and `auth.uid()` → `(select auth.uid())` in all 14 policies
- [ ] **P3** — Add indexes for all 20 unindexed foreign key columns across `activity_logs`, `companies`, `contacts`, `jobs`, `leads`, `notes`, `opportunities`, `products`, `projects`

### Code Quality
- [ ] **Q1** — Extract generic `<EntitySideSheet>` component to deduplicate 5 side sheet files (~80% shared code)
- [ ] **Q2** — Consolidate duplicate user management pages (`operations/users` and `settings/users`) into a shared component
- [ ] **Q3** — Abstract repeated modal pattern into `useCreateEntity()` hook + generic modal wrapper
- [ ] **Q4** — Extract hardcoded status/stage/priority constants to `lib/constants.ts`

### Architecture
- [ ] **A1** — Add React error boundaries around side sheets, modals, and dashboard page content
- [ ] **A2** — Add React Query or SWR for server state caching (companies list used across multiple modals, navigation re-fetches)

---

## Priority 3 — Medium

### Security
- [ ] **S10** — Change `auth_redirect` cookie `SameSite` from `Lax` to `Strict` in `app/page.tsx`
- [ ] **S11** — Remove default values for `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in `app/actions/auth.ts` — fail if env vars missing
- [ ] **S12** — Strip or escape double quotes from email search input before OData `$search` query

### Performance
- [ ] **P4** — Move search/filter logic server-side using Supabase `.ilike()` or `.textSearch()` instead of client-side filtering
- [ ] **P5** — Wrap Kanban card renderer in `React.memo()` to prevent re-renders on drag state changes
- [ ] **P6** — Add data caching (React Query/SWR) for notes and activity in side sheets
- [ ] **P7** — Include `$skip` in email messages endpoint when `search` param is set

### Code Quality
- [ ] **Q5** — Replace `any` types with proper interfaces; use `unknown` in catch blocks
- [ ] **Q6** — Remove dead `resetPassword()` server action from `app/actions/auth.ts`
- [ ] **Q7** — Replace hardcoded mock data in `operations/content/page.tsx` with API-backed data
- [ ] **Q8** — Add a consistent DB→JS naming mapping layer (snake_case → camelCase)

### Architecture
- [ ] **A3** — Implement "Change password" and "Delete account" in settings page, make email field read-only
- [ ] **A4** — Add confirmation dialogs for destructive actions (sign out, future delete operations)

### Accessibility
- [ ] **X1** — Add `htmlFor`/`id` pairs to all form labels in `Create*Modal` components
- [ ] **X2** — Add `aria-label` to all icon-only buttons (close buttons, notification bell, etc.)
- [ ] **X3** — Add text alternatives for color-only status indicators (Kanban unread dots, lead status bars)
- [ ] **X4** — Replace custom company dropdown in `CreateLeadModal` with Radix UI `Select` (already in project)

---

## Priority 4 — Low / Housekeeping

- [ ] Remove unused index `idx_activity_logs_created` on `activity_logs`
- [ ] Add DELETE RLS policies to all tables that need delete support
- [ ] Add multi-tenancy / ownership scoping to RLS policies (most currently allow any authenticated user full access)
- [ ] Increase test coverage — API route tests, component tests, E2E smoke tests (currently 2 test files, 0% component coverage)

---

## Suggested Order of Execution

1. **S1–S6** (critical security) — do these before any production deployment
2. **P2 + P3** (database) — single migration, large impact
3. **S7–S9** (high security) — tighten access controls
4. **P1** (pagination) — prevents scaling issues
5. **Q1–Q4** (deduplication) — reduces maintenance surface before adding features
6. **A1–A2** (error boundaries + caching) — improves resilience and UX
7. Everything else by priority
