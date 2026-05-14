# Code Audit — THOR (Tradie OS)

**Date**: 2026-05-11
**Project type**: Multi-tenant Next.js 15 / React 19 / Supabase web app
**Audit depth**: Delta refresh from 2026-05-07 audit (spine + role-gate refactor surface + verification of prior findings)

## Executive Summary

The four-day delta is the strongest single iteration the codebase has had. **Almost every prior finding shipped a fix:** the reference-id race, atomic job/assignee writes, atomic quote/PO totals, the JobDetailView decomposition, the `withAuth` error-helper inconsistency, `serverError()` log-on-cause, the README port/`.env.example` drift — all resolved. Test coverage went from one file to eleven, with the load-bearing helpers (`handler`, `archive`, `list-query`, `line-items`, `errors`, `pagination`) now under unit test. Two new SQL migrations close real holes: 041 adds RLS role gates on `tenant_memberships`/`tenant_invites`/`tenant_licenses`, and 042 patches a cross-tenant write hole in `recalc_quote_total` / `recalc_purchase_order_total`.

The new-work surface introduces one notable gap: the API-layer role gate is **incomplete**. `requirePermission` is wired through ~20 routes (clients/jobs/quotes/invoices/files/etc.) but four tenant-write endpoints — `schedule`, `tasks`, `quote-sections`, and `notes` — still go through `withAuth` only. RLS isn't gating them either (041 only covers membership/invites/licenses), so a Viewer with a valid JWT can directly call those endpoints to create or modify schedule entries and tasks. The other notable new findings are an info-disclosure quirk in the role-gate denial messages, two non-atomic write paths in `quotes` POST (title race) and `invoices` POST (line items insert without error-check), and a 2-roundtrip cost on every gated write that's worth memoizing.

**Severity counts**: 🔴 1 critical · 🟡 7 major · 🟢 7 minor (down from 🔴 3 / 🟡 6 / 🟢 5 on 2026-05-07; most prior criticals shipped fixes)

## Top Priorities

1. 🔴 **Close the role-gate gap on the four ungated write routes.** [app/api/schedule/route.ts](app/api/schedule/route.ts), [tasks/route.ts](app/api/tasks/route.ts), [quote-sections/route.ts](app/api/quote-sections/route.ts), and [notes/route.ts](app/api/notes/route.ts) all run POST/PATCH/DELETE through `withAuth` only — no `requirePermission` call. The corresponding `RESOURCES` keys (`ops.schedule`, `finance.quotes`, …) exist in [lib/permissions.ts](lib/permissions.ts), so this is a wiring miss, not a design gap. Add the gate using the pattern at [contacts/route.ts:42-44](app/api/contacts/route.ts:42).
2. 🟡 **Memoize `requirePermission` per request and short-circuit owners earlier.** [app/api/_lib/permissions.ts:46-86](app/api/_lib/permissions.ts:46) does two sequential SELECTs (`tenant_memberships`, then `tenant_roles`) on every gated write. A typical PATCH path now spends ~2 round-trips on permissions before any business logic. The owner short-circuit at [permissions.ts:33](app/api/_lib/permissions.ts:33) only happens *after* both queries — read the role from the first row and exit early. [app/api/users/route.ts:122-127](app/api/users/route.ts:122) is exhibit A: it does its *own* membership lookup right after `requirePermission` already did one.
3. 🟡 **Wrap `POST /api/invoices` in an RPC.** [invoices/route.ts:80-93](app/api/invoices/route.ts:80) inserts the invoice with a computed `total`, then inserts line items in a separate call **with no error check** — `await supabase.from("invoice_line_items").insert(...)` ignores the result. Same class of bug the prior audit's #2 fixed for jobs+assignees. If line items fail, the invoice exists with the right totals and zero items.

---

## Δ Since 2026-05-07

### ✅ Resolved
- **Reference-id race fixed** — [jobs/route.ts:79-82](app/api/jobs/route.ts:79) now uses `allocate_tenant_reference` RPC. (was 🔴)
- **Job + assignees insert is atomic** — [jobs/route.ts:91-97](app/api/jobs/route.ts:91) and [jobs/route.ts:151-157](app/api/jobs/route.ts:151) use `create_job_with_assignees` / `replace_job_assignees` RPCs. (was 🟡)
- **Line-item totals are atomic** — [recalcQuoteTotal / recalcPurchaseOrderTotal](app/api/_lib/line-items.ts:9) now wrap the Postgres RPCs and are called from quote/PO routes. (was 🔴 in CLAUDE.md known-issues, was 🔴 in audit)
- **`JobDetailView.tsx` decomposed** — 1036 lines → 419 lines (60% reduction). Split into [JobDetailHeader.tsx](components/jobs/JobDetailHeader.tsx), [JobDetailModals.tsx](components/jobs/JobDetailModals.tsx), [JobTasksPanel.tsx](components/jobs/JobTasksPanel.tsx), and [tabs/](components/jobs/tabs/) folder. The direct `supabase.from("jobs").update(...)` is gone — `handleSave` at [JobDetailView.tsx:139-149](components/jobs/JobDetailView.tsx:139) now calls `PATCH /api/jobs`. (was 🟡)
- **`TenantSideSheet.tsx`** — 772 → 199 lines (74% reduction). [QuoteSideSheet.tsx](components/sheets/QuoteSideSheet.tsx) — 719 → 438 (39%, still the largest sheet but no longer a god component). [SignupFlow.tsx](app/(auth)/signup/SignupFlow.tsx) — 685 → 296 (57%). (was 🟡)
- **`withAuth` uses error helpers** — [handler.ts:32](app/api/_lib/handler.ts:32) returns `unauthorizedError()`, [handler.ts:42](app/api/_lib/handler.ts:42) `forbiddenError(...)`, [handler.ts:44](app/api/_lib/handler.ts:44) `serverError(err, "withAuth")`. Same shape in `withPlatformAuth`. (was 🟡)
- **`serverError()` logs the cause** — [errors.ts:21-29](app/api/_lib/errors.ts:21) now `console.error(context, cause)` before returning the opaque 500. Mystery prod 500s are over. (was 🟢)
- **README port + `.env.example` drift fixed** — [README.md:11-12](README.md:11) says `localhost:8005` and references `.env.example`, which now exists at the project root. (was 🟢)
- **Test baseline established** — 11 test files (was 1). Coverage now includes [handler.test.ts](app/api/_lib/handler.test.ts), [archive.test.ts](app/api/_lib/archive.test.ts), [line-items.test.ts](app/api/_lib/line-items.test.ts), [list-query.test.ts](app/api/_lib/list-query.test.ts), [errors.test.ts](app/api/_lib/errors.test.ts), [pagination.test.ts](app/api/_lib/pagination.test.ts), plus [xero.test.ts](lib/xero.test.ts), [share-tokens.test.ts](lib/reports/share-tokens.test.ts), [validate-submission.test.ts](lib/reports/validate-submission.test.ts), [tools.test.ts](lib/ai/tools.test.ts). The "highest-leverage targets first" list from the prior audit's Recommended Next Steps is largely covered. (was 🔴)

### 🆕 New
- **API-layer role gate is incomplete on 4 write routes** (see Top Priority #1). 🔴
- **`requirePermission` 2-roundtrip cost** + missed owner early-exit (see Top Priority #2). 🟡
- **Info-disclosure in role-gate denial messages** — [permissions.ts:117-132](app/api/_lib/permissions.ts:117) returns distinct messages for "no_membership" vs "denied". A probing caller can distinguish "I'm not a member" from "I am, but lack permission" — leaks tenant-membership existence. Collapse to one generic 403. 🟡
- **Quote title race** — [quotes/route.ts:57-62](app/api/quotes/route.ts:57) does `count(*)` then sets title `Quote #${count+1}`. Two concurrent quote creations get the same number. Same shape as the (now-fixed) reference-id race; lower stakes since it's a display title, not a unique reference. 🟡
- **Invoice line-items insert silently ignores error** (see Top Priority #3). 🟡
- **`POST /api/files` inlines NextResponse.json error responses** — [files/route.ts:44-65](app/api/files/route.ts:44) has 5 inline `NextResponse.json({ error: ... })` calls where the `validationError` / helper pattern would apply. CLAUDE.md explicitly prohibits this and other routes uphold it. 🟢
- **Migration 042 fixes a real cross-tenant write hole** — `recalc_quote_total` / `recalc_purchase_order_total` were SECURITY DEFINER with no tenant guard. Any authenticated user knowing a UUID could trigger a recalc on any tenant's quote/PO. Now gated on `tenant_id = get_user_tenant_id()`. (Resolved before this audit landed — calling it out for the activity log.) ✅
- **Migration 041 adds RLS role gates** for `tenant_memberships`, `tenant_invites`, `tenant_licenses`. Server actions use the admin client (RLS-bypass), but a raw PostgREST call from a Viewer can no longer self-promote or revoke invites. ✅

### ⚠️ Regressed
- None observed.

---

## 1. Best Practices

**Strengths** (carried + reinforced)
- TypeScript `strict: true`. `any` casts remain rare (~1 file outside test mocks per `grep ": any\b\|<any>\|as any"` in app/lib/components/features).
- Zod validation consistent at every gated POST/PATCH I sampled (jobs, contacts, companies, quotes, invoices, files, tasks, schedule, notes, quote-sections, users).
- Atomic helpers (`allocate_tenant_reference`, `create_job_with_assignees`, `replace_job_assignees`, `claim_seat`, `recalc_*`) are now first-class — the codebase has internalised "concurrency-sensitive write → RPC".
- New: defense-in-depth at the database layer for the most sensitive tables (migration 041).
- New: `serverError(cause, context)` makes prod 500s diagnosable.

**New / still open**
- 🔴 **Role gate not applied on 4 write routes** ([schedule](app/api/schedule/route.ts), [tasks](app/api/tasks/route.ts), [quote-sections](app/api/quote-sections/route.ts), [notes](app/api/notes/route.ts)) — see Top Priority #1.
- 🟡 **`requirePermission` perf + owner early-exit** — see Top Priority #2.
- 🟡 **`POST /api/invoices` line-items insert is non-atomic and unchecked** — see Top Priority #3.
- 🟡 **Information-disclosing 403 reasons** — see Δ section.
- 🟡 **Quote title race** — see Δ section.
_(`isRoleAtLeast` at [permissions.ts:22-25](app/api/_lib/permissions.ts:22) has one consumer at [timesheets/route.ts:44](app/api/timesheets/route.ts:44) — Manager+ gate for cross-user timesheet visibility. Useful when a route needs ordinal comparison rather than the resource/action grid.)_
- 🟢 **`POST /api/files` doesn't use error helpers** — see Δ section.
- 🟢 **`console.log` count grew from 3 → 82**, but **most are legitimate**: `console.error` for fire-and-forget Xero sync (e.g. [companies/route.ts:40](app/api/companies/route.ts:40), [contacts/route.ts:69](app/api/contacts/route.ts:69)) and a handful of deliberate audit-trail `console.log`s in platform-admin tenant CRUD ([app/api/platform-admin/tenants/route.ts:154](app/api/platform-admin/tenants/route.ts:154)). Worth grepping once before shipping a structured logger, but not a blocker.

## 2. Modularity

**Strengths**
- The `_lib` helper set (`handler`, `errors`, `pagination`, `list-query`, `archive`, `permissions`, `line-items`) is the cleanest expression of "shared API spine" the codebase has had. New routes drop in mechanically. The route → SWR → modal → sheet recipe in CLAUDE.md still matches what the code does.
- `JobDetailView` decomposition is exemplary — the new layout (header, modals, tabs/, tasks panel) is the recipe for the remaining large sheets.
- `buildArchiveHandler` ([archive.ts:62](app/api/_lib/archive.ts:62)) is a genuine win: every entity's `[id]/archive/route.ts` is now ~3 lines (e.g. [jobs/[id]/archive/route.ts](app/api/jobs/[id]/archive/route.ts)).

**Findings**
- 🟡 **Direct supabase reads from components, persisting** — [UserSideSheet.tsx:45-100](components/dashboard/UserSideSheet.tsx:45) still pulls `projects`, `job_assignees`, `activity_logs` directly from the client. Same pattern in [features/shell/use-user-profile.ts:4](features/shell/use-user-profile.ts:4), [SignOutDialog.tsx:14](features/shell/SignOutDialog.tsx:14), [NotesPanel.tsx:6](components/sheets/NotesPanel.tsx:6), [ReportSideSheet.tsx:9](components/sheets/ReportSideSheet.tsx:9). RLS protects tenant isolation on reads, so this is lower-stakes than the (now-fixed) `JobDetailView.handleSave` write was — but it skips the SWR cache, can't be unit-tested via the API contract, and grows the surface that needs to know schema names. Worth migrating reads to `useSWR` hooks as those files get touched.
- 🟢 **Largest remaining single files**: [SignupFlow.tsx](app/(auth)/signup/SignupFlow.tsx) (685 — unchanged), [components/modals/EditQuoteModal.tsx](components/modals/EditQuoteModal.tsx) (536), [app/dashboard/settings/company/subscription/page.tsx](app/dashboard/settings/company/subscription/page.tsx) (578), [app/dashboard/overview/page.tsx](app/dashboard/overview/page.tsx) (555 — three render functions inline; see Code Structure). [lib/validation.ts](lib/validation.ts) at 622 lines is fine — it's an aggregation point and the schemas are short. Apply the JobDetailView recipe as you touch these.

## 3. Code Quality & Cleanliness

**Strengths**
- Test baseline is in place (11 files vs. 1). The scaffold pattern in [handler.test.ts](app/api/_lib/handler.test.ts) (hoisted mocks for `createClient` / `getTenantId`) is the template for testing future routes.
- Function bodies stay short. The largest route handlers (`POST /api/quotes`, `POST /api/invoices`) are still ~150 lines and decompose linearly.
- Comments still tend to explain *why*, not *what*. Examples worth keeping in mind: the lazy-fetch comment in [JobDetailView.tsx:96-99](components/jobs/JobDetailView.tsx:96), the auth-bypass comment for inquiry honeypot in [inquiry/route.ts:58-60](app/api/inquiry/route.ts:58), the seat-claim concurrency note in [inviteUser.ts:64-66](app/actions/inviteUser.ts:64).

**Findings**
- 🟡 **Test coverage doesn't yet hit the spine in `permissions.ts`** — `requirePermission` / `requireOwner` / `checkPermission` have no unit tests despite being called from ~36 routes/actions. With this many call sites, a regression here breaks the entire role gate silently. Highest-leverage next test to add.
- 🟢 **Two parallel reads in `POST /api/notes`** ([notes/route.ts:47-58](app/api/notes/route.ts:47)) — clean use of `Promise.all` for the note + author profile, good pattern. Worth lifting into a helper if other routes adopt the same shape.

## 4. User Experience

**Strengths**
- Permission-aware UI: [overview/page.tsx:70-71](app/dashboard/overview/page.tsx:70) reads `usePermissionOptional("dashboard.financials", "read", false)` and skips both the metric cards *and* the API call when the caller can't see them. That's the right shape — the server endpoint enforces the same gate, so client-side hiding is purely a render optimisation.
- Toast feedback, optimistic updates via SWR, `keepPreviousData` on paginated lists — all unchanged and good.
- New: archive flow (active/archived/all scope) is consistent across every entity that has it, and the SWR helpers (`useFiles`, `useTimesheets`, etc.) expose a clean `archive` arg.

**Findings**
- 🟢 **Inquiry endpoint silently accepts honeypot-triggered submissions** ([inquiry/route.ts:58-61](app/api/inquiry/route.ts:58)) — that's intentional anti-bot UX (don't tip them off) but worth a one-line metric/log if you want to know how often it fires.
- 🟢 **Role-gate denials lump distinct cases under one toast** in the UI — the server now distinguishes them (see Best Practices info-disclosure note), so when you collapse the server messages, also pick a consistent client toast like "You don't have permission to do that."

## 5. Code Structure

**Strengths**
- `_lib` helper layout still the strongest part of the codebase. Migrations are sequentially numbered with descriptive filenames ([041_role_gate_tenant_writes.sql](supabase/migrations/041_role_gate_tenant_writes.sql), [042_recalc_tenant_guards.sql](supabase/migrations/042_recalc_tenant_guards.sql), [043_add_dashboard_files_resources.sql](supabase/migrations/043_add_dashboard_files_resources.sql)) and each one has a header explaining *why*, not just *what* — these are unusually high-quality migration files.
- `lib/routes.ts`, `lib/design-system.ts`, the per-feature `features/` modules — all carry over.

**Findings**
- 🟢 **`overview/page.tsx` (555 lines) inlines three large render functions** (`renderJobsTable`, `renderTasksTable`, `renderActiveJobsCompact`, `renderAppointments`). They close over component state and aren't reused, but they're the single biggest contributor to that file's size and would each be a clean sibling component. Apply when next touched.
_(No new structural findings — `components/` vs `features/` boundary observation from prior audit unchanged and not urgent.)_

## 6. Agent Friendliness

Still the project's strongest dimension. CLAUDE.md is up-to-date with the role gate, atomic-helper, and CLAUDE.md "Token storage" / "Email sending" sections — accurately describes the new shape. Migration headers are dense with intent.

**Findings**
- 🟢 **CLAUDE.md "Known Issues" still says "_None at this time._"** ([CLAUDE.md](CLAUDE.md)) — the prior known issues (line-item recalc race) are resolved, so this is correct! Worth adding the four ungated routes here once they're either fixed or scheduled, so future agents don't reintroduce the pattern by copying `tasks/route.ts`.
_(`docs/audits/` is also available if you want a versioned history of these reports rather than overwriting the project-root copy each refresh.)_

## 7. Design System Integrity

**Strengths**
- Tokens centralised, radius scale tight, status-dot/table styles consistent — unchanged from prior audit.
- New: pages added since the prior audit (overview refresh, files dashboard) use existing design tokens (`tableBase`, `getJobStatusDot`, `priorityDotClass`, `formatCurrency`) — no new raw-hex regressions in the files I sampled.

**Findings**
- 🟡 **Platform-admin nav colour `#7b819a` finding from prior audit not yet addressed** — still 🟡 from before. Tokenise as a one-line fix.

---

## Recommended Next Steps

**Quick wins** (single PR, hours of work)
1. **Add `requirePermission` to the four ungated routes** — `schedule` (`ops.schedule`), `tasks` (probably `ops.jobs`, or add an `ops.tasks` resource), `quote-sections` (`finance.quotes`), `notes` (decide whether notes should be member-or-better or any-member). Pattern is one line at the top of each handler — see [contacts/route.ts:42-44](app/api/contacts/route.ts:42).
2. **Memoize `requirePermission` per request and short-circuit owners** from the membership row. Add a tiny per-`AuthContext` cache; the implementation could live in [permissions.ts](app/api/_lib/permissions.ts) or as a `WeakMap` keyed on the supabase client.
3. **Collapse the role-gate denial messages** to one generic 403 string in [permissions.ts:117-132](app/api/_lib/permissions.ts:117).
4. **Convert the 5 inline error responses in [files/route.ts:44-65](app/api/files/route.ts:44)** to `validationError` / `missingParamError` calls.
5. **Tokenise `#7b819a`** in [PlatformAdminShell.tsx](app/platform-admin/PlatformAdminShell.tsx).

**Larger refactors** (worth scheduling)
1. **Wrap `POST /api/invoices` in an atomic RPC** — invoice + line items in one transaction. Mirror the `create_job_with_assignees` shape. Same applies to `POST /api/quotes` (sections + line items + recalc) which currently does sections insert → items insert → recalc as three separate steps.
2. **Fix the `Quote #N` title race** — either an atomic `nextval`-on-tenant-sequence (same shape as `allocate_tenant_reference`) or accept duplicates and let the user override.
3. **Add unit tests for `permissions.ts`** — `checkPermission`, `requirePermission`, `requireOwner`, `getCallerRole`. Highest leverage of the remaining test gaps given how many call sites depend on them.
4. **Migrate component-level supabase reads to SWR hooks** as those files are touched: `UserSideSheet`, `NotesPanel`, `ReportSideSheet`, `use-user-profile`. Lower priority than the writes (which are gone), but eliminates the last off-spine data path.
5. **Decompose `app/dashboard/overview/page.tsx`** — pull `renderJobsTable`/`renderTasksTable`/`renderActiveJobsCompact`/`renderAppointments` into sibling files. ~30 min, drops the file from 555 → ~150 lines.
