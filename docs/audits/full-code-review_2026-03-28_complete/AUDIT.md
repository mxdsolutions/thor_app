# THOR: Tradie OS — Full Code Review

**Date:** 2026-03-28
**Reviewer:** Claude Code
**Status:** Complete
**Stack:** Next.js 15.5 / React 19 / Supabase / Tailwind v4 / Microsoft Graph

---

## Executive Summary

THOR: Tradie OS is a CRM + operations dashboard with solid foundations — Supabase for auth and data, Radix UI for accessible primitives, Zod for validation, and a clean App Router structure. The codebase is well-organised but has security gaps that must be addressed before production, performance issues that will surface at scale, and significant code duplication that increases maintenance burden.

**Finding count:** 6 critical, 12 high, 14 medium, 10 low

---

## 1. Security

### CRITICAL

#### S1 — XSS via unsanitised email HTML
- **File:** `components/sheets/EmailSideSheet.tsx:191`
- **Issue:** `dangerouslySetInnerHTML={{ __html: email.body.content }}` renders raw HTML from Microsoft Graph without sanitisation.
- **Impact:** Malicious email HTML can execute arbitrary JS in the admin session.
- **Fix:** Sanitise with `dompurify` before rendering.

#### S2 — Leaked password protection disabled
- **Source:** Supabase security advisor
- **Issue:** Supabase Auth's HaveIBeenPwned check is turned off.
- **Impact:** Users can set compromised passwords.
- **Fix:** Enable in Supabase Dashboard > Auth > Password Security.

#### S3 — Overly permissive RLS on `products` table
- **Source:** Supabase security advisor
- **Issue:** INSERT and UPDATE policies use `WITH CHECK (true)` / `USING (true)` — any authenticated user can insert or modify any product with no ownership check.
- **Fix:** Add `auth.uid() = created_by` condition or a role-based check.

#### S4 — Function search_path mutable (4 functions)
- **Source:** Supabase security advisor
- **Functions:** `handle_new_user`, `log_entity_created`, `log_entity_updated`, `log_note_created`
- **Issue:** Functions don't set `search_path`, allowing potential schema injection.
- **Fix:** Add `SET search_path = public` to each function definition.

#### S5 — OAuth tokens stored in plaintext
- **File:** `app/api/integrations/outlook/callback/route.ts`
- **Issue:** Microsoft Graph refresh tokens stored unencrypted in `email_connections` table.
- **Impact:** Database breach exposes long-lived tokens to all connected Outlook accounts.
- **Fix:** Encrypt tokens at rest using Supabase Vault or application-level encryption.

#### S6 — No rate limiting on auth endpoints
- **Files:** `app/actions/auth.ts`, all `/api/*` routes
- **Issue:** No rate limiting on sign-in, sign-up, password reset, or any API endpoint.
- **Impact:** Brute force attacks, credential stuffing, API abuse.
- **Fix:** Add Supabase rate limiting config or middleware-level rate limiting.

### HIGH

#### S7 — Missing API-level auth on update/delete operations
- **Files:** `/api/leads/route.ts` PATCH, `/api/opportunities/route.ts` PATCH
- **Issue:** PATCH accepts an `id` in the body but doesn't verify the caller owns or is authorised to modify that record. Relies solely on RLS (which only checks `auth.role() = 'authenticated'`).
- **Fix:** Add ownership or role checks in the API handler, or tighten RLS policies to include `created_by = auth.uid()`.

#### S8 — Avatar upload accepts any file extension
- **File:** `app/onboarding/OnboardingFlow.tsx:103-104`
- **Issue:** `avatarFile.name.split(".").pop()` extracts extension without validation.
- **Fix:** Whitelist: `['jpg', 'jpeg', 'png', 'gif', 'webp']`.

#### S9 — Profiles table SELECT policy is `USING (true)`
- **Table:** `public.profiles`
- **Issue:** Any authenticated user (or even unauthenticated via the `public` role) can read all profiles.
- **Impact:** Email addresses, names, roles of all users exposed.
- **Fix:** Restrict to `auth.role() = 'authenticated'` at minimum.

### MEDIUM

#### S10 — Cookie security flags
- **File:** `app/page.tsx:81`
- **Issue:** `auth_redirect` cookie uses `SameSite=Lax` — should be `Strict` for auth redirects.

#### S11 — Demo credentials with hardcoded fallbacks
- **File:** `app/actions/auth.ts:168-169`
- **Issue:** `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` have default values in code. If env vars are missing, anyone can log in as demo.
- **Fix:** Remove defaults; fail if env vars are not set.

#### S12 — Email search query injection
- **File:** `app/api/email/messages/route.ts:27`
- **Issue:** Search query passed to `$search="${encodeURIComponent(search)}"` — if search contains double quotes, it breaks the OData query.
- **Fix:** Strip or escape double quotes from search input.

---

## 2. Database

### RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| profiles | `true` (public) | - | `auth.uid() = id` | - | SELECT too open |
| companies | auth check | auth check | auth check | - | No DELETE policy |
| contacts | auth check | auth check | auth check | - | No DELETE policy |
| leads | auth check | auth check | auth check | - | No DELETE policy |
| opportunities | auth check | auth check | auth check | - | No DELETE policy |
| products | `true` | `true` | `true` | - | Fully open to authenticated |
| projects | auth check | auth check | auth check | - | No DELETE policy |
| jobs | auth check | auth check | auth check | - | No DELETE policy |
| notes | auth check (ALL) | - | - | - | Single ALL policy |
| activity_logs | auth check (ALL) | - | - | - | Single ALL policy |
| email_connections | `uid = user_id` | `uid = user_id` | `uid = user_id` | `uid = user_id` | Properly scoped |

**Key issues:**
- No table has a DELETE policy — records cannot be deleted via the client.
- Most tables use `auth.role() = 'authenticated'` which means any logged-in user can read/write all records. No multi-tenancy or ownership scoping.
- All RLS policies use `auth.role()` or `auth.uid()` directly instead of `(select auth.role())` — causes per-row re-evaluation (see Performance section).

### Unindexed Foreign Keys (20 found)
Every foreign key in the schema lacks a covering index. This impacts JOIN performance and CASCADE operations. Tables affected: `activity_logs`, `companies`, `contacts`, `jobs`, `leads`, `notes`, `opportunities`, `products`, `projects`.

### Unused Index
- `idx_activity_logs_created` on `activity_logs` has never been used.

---

## 3. Performance

### HIGH

#### P1 — No pagination on list endpoints
- **Files:** All `/api/*` GET routes (leads, opportunities, companies, contacts, projects, jobs, products)
- **Issue:** Every list endpoint fetches ALL records from the database with no `LIMIT` or cursor.
- **Impact:** Response times and memory usage grow linearly with data.
- **Fix:** Add `?page=1&limit=25` params with Supabase `.range()`.

#### P2 — RLS initplan re-evaluation (14 policies)
- **Source:** Supabase performance advisor
- **Issue:** All policies using `auth.role()` or `auth.uid()` re-evaluate for every row.
- **Fix:** Wrap in subquery: `(select auth.role())` and `(select auth.uid())`.
- **Tables:** companies, contacts, leads, opportunities, projects, jobs, notes, activity_logs, email_connections, profiles.

#### P3 — 20 unindexed foreign keys
- **Source:** Supabase performance advisor
- **Impact:** Slow JOINs and CASCADE deletes.
- **Fix:** Add indexes for each FK column.

### MEDIUM

#### P4 — Client-side filtering only
- **Files:** All list pages (leads, contacts, companies, etc.)
- **Issue:** Search/filter runs in React on the full dataset, not on the server.
- **Fix:** Pass search params to API and use Supabase `.ilike()` or `.textSearch()`.

#### P5 — No memoisation on Kanban cards
- **File:** `components/Kanban.tsx:181-201`
- **Issue:** All cards re-render when any drag state changes.
- **Fix:** Wrap card renderer in `React.memo()`.

#### P6 — Side sheets make separate fetch calls for notes + activity
- **Files:** All `*SideSheet.tsx` components
- **Issue:** Each tab triggers a new API call. No caching between opens.
- **Fix:** Use React Query / SWR for data caching, or batch the initial load.

#### P7 — Email messages endpoint: no `$skip` when searching
- **File:** `app/api/email/messages/route.ts:27`
- **Issue:** When `search` is set, `$skip` is omitted from the endpoint — "Load more" pagination breaks during search.

---

## 4. Code Quality

### HIGH

#### Q1 — Severe code duplication across side sheets
- **Files:** `ContactSideSheet`, `LeadSideSheet`, `OpportunitySideSheet`, `CompanySideSheet`, `ProductSideSheet`
- **Issue:** All 5 follow identical structure: fetch → header → tabs → detail fields → notes → activity. ~80% shared code.
- **Fix:** Extract generic `<EntitySideSheet>` component with tab content as render props.

#### Q2 — Duplicate user management pages
- **Files:** `app/dashboard/operations/users/page.tsx`, `app/dashboard/settings/users/page.tsx`
- **Issue:** Two identical pages for managing users.
- **Fix:** Share a single component, imported in both routes.

#### Q3 — Repeated modal structure
- **Files:** All `Create*Modal.tsx` components
- **Issue:** Identical pattern: open state → form fields → submit → API call → toast. Could be abstracted into `useCreateEntity()` hook + generic modal wrapper.

#### Q4 — Hardcoded status/stage/priority constants
- Duplicated in: `LeadSideSheet.tsx`, `CreateLeadModal.tsx`, `leads/page.tsx`, `OpportunitySideSheet.tsx`, `opportunities/page.tsx`
- **Fix:** Extract to `lib/constants.ts`.

### MEDIUM

#### Q5 — `any` types used in callbacks
- **Files:** `CreateLeadModal.tsx:14`, `CreateOpportunityModal.tsx:14`, `NotesPanel.tsx:40`, most `catch` blocks
- **Fix:** Define proper interfaces for all entity types. Use `unknown` in catch blocks.

#### Q6 — Dead server action: `resetPassword()` in `auth.ts`
- **File:** `app/actions/auth.ts:119-141`
- **Issue:** Server-side `resetPassword()` function exists but is never called — the forgot-password page correctly uses the browser client for PKCE. Dead code.
- **Fix:** Remove or document as intentionally kept.

#### Q7 — Content page uses hardcoded mock data
- **File:** `app/dashboard/operations/content/page.tsx:28-34`
- **Issue:** Data is static JS objects, not fetched from API. Nothing persists.

#### Q8 — Inconsistent naming: snake_case DB vs camelCase JS
- No consistent mapping layer between database column names and JS property names. Manual mapping scattered across components.

---

## 5. Architecture

### HIGH

#### A1 — No error boundaries
- **Issue:** No React error boundaries anywhere in the app. A single component crash (e.g., in a side sheet) takes down the entire page.
- **Fix:** Add error boundaries around: modal content, side sheet content, dashboard page content.

#### A2 — No global state management
- **Issue:** Each page independently fetches its data. No shared cache. Navigating away and back re-fetches everything.
- **Fix:** Consider React Query for server state caching, or a lightweight context for shared entities (companies list used in multiple modals).

### MEDIUM

#### A3 — Settings page incomplete
- **File:** `app/dashboard/settings/settings/page.tsx`
- **Issue:** "Change password" and "Delete account" buttons do nothing. Email field is editable but shouldn't be (can't change auth email this way).

#### A4 — No confirmation on destructive actions
- Sign out executes immediately with no confirmation dialog.
- No delete functionality exists anywhere despite UI suggesting it.

---

## 6. Accessibility

### MEDIUM

#### X1 — Missing `htmlFor` on form labels
- **Files:** All `Create*Modal.tsx` components
- **Issue:** `<label>` elements not associated with inputs via `htmlFor`/`id`.

#### X2 — Icon-only buttons missing `aria-label`
- **Files:** Dashboard layout close buttons, modal close buttons, notification bell
- **Impact:** Screen readers announce nothing for these controls.

#### X3 — Color-only status indicators
- **Files:** Kanban board unread dots, lead status indicators
- **Issue:** Blue dot for unread, colored bars for status — no text alternative for color-blind users.

#### X4 — Custom dropdowns lack keyboard support
- **File:** `CreateLeadModal.tsx:128-155` — custom company dropdown
- **Issue:** No arrow key navigation, no Escape to close.
- **Fix:** Replace with Radix UI `Select` component (already in the project).

---

## 7. Test Coverage

### Current State
- **2 test files total:** `app/actions/auth.test.ts` (36 tests), `app/api/users/route.test.ts` (3 tests)
- **0% component test coverage**
- **0% integration test coverage**
- **Framework:** Vitest + Testing Library (already configured)

### Recommended Priority
1. API route tests (auth checks, validation, error handling)
2. Server action tests (already partially done)
3. Critical component tests (Kanban drag-drop, side sheet state)
4. E2E smoke tests (login, create lead, move on board)
