# Code Audit — THOR

**Date**: 2026-05-08
**Project type**: Next.js 15 multi-tenant CRM (App Router, React 19, Supabase, Tailwind v4, SWR, Zod, Radix)
**Audit depth**: Standard — manifests, all entry points and config read in full; representative sampling (~30–60%) of source weighted toward shared modules and API routes; conflicting Explore-agent findings ground-truthed against the actual code before being recorded
**Scope**: Full breadth across all seven dimensions

---

## Executive Summary

THOR is in genuinely good shape. The architecture is consistent, the documentation is unusually strong (CLAUDE.md is exemplary), tenant isolation is enforced both in RLS and at the API layer, atomic-write helpers are in place for the riskiest paths (job creation, line-item totals, reference allocation), and `strict: true` TypeScript is honoured (~40 `any` casts across the codebase, every one explicitly suppressed). The folder layout matches the documented description exactly.

The fixable issues cluster in four areas: (1) one tenant-isolation gap in the Xero webhook delete path, (2) one drift from the documented soft-delete rule (`tenant_licenses` has a hard DELETE), (3) systematic frontend drift — inline `<h1>` page titles co-existing with `usePageTitle()`, and Lucide icons in shell despite a Tabler-only rule, and (4) a thin test surface (7 test files for a ~181k-LOC codebase) leaving the most load-bearing helpers (`withAuth`, `tenantListQuery`, `recalcQuoteTotal`, middleware tenant resolution) untested.

**Severity counts**: 🔴 2 critical · 🟡 11 major · 🟢 9 minor

## Top Priorities

1. 🔴 **Xero webhook deletes `invoice_line_items` without an explicit tenant filter** — [app/api/integrations/xero/webhook/route.ts:209-212](app/api/integrations/xero/webhook/route.ts:209). Cascade-protected via the earlier mapping lookup (which is tenant-scoped), but violates the explicit defense-in-depth rule in [CLAUDE.md](CLAUDE.md). Add `.eq("tenant_id", tenantId)` to the delete and to the surrounding update at line 198-205.
2. 🔴 **Hard `DELETE` endpoint on `tenant_licenses`** — [app/api/licenses/route.ts:54-69](app/api/licenses/route.ts:54). The codebase rule (CLAUDE.md, "No hard deletes") forbids DELETE for business entities. Replace with a PATCH to an archived state.
3. 🟡 **`withAuth` PATCH on jobs assignees is non-atomic** — [app/api/jobs/route.ts:137-143](app/api/jobs/route.ts:137). `delete()` then `insert()` outside a transaction; failure between calls leaves the job with no assignees. Wrap in a Postgres function (mirror `create_job_with_assignees`).
4. 🟡 **Critical-path test gap** — `withAuth`, `tenantListQuery`, `recalcQuoteTotal`, `recalcPurchaseOrderTotal`, middleware tenant resolution, and RLS enforcement have **zero** tests. Vitest is configured; only 7 test files exist project-wide. One invariant per helper would close most of the gap.

---

## 1. Best Practices

### 🟡 Inline `NextResponse.json({ error })` violations
CLAUDE.md says "**never** use inline `NextResponse.json({ error: ... })` for error responses." Three offenders:
- [app/api/purchase-orders/route.ts:49-51](app/api/purchase-orders/route.ts:49) — three 404 responses; should use `notFoundError()`.
- [app/api/quote-line-items/route.ts:53](app/api/quote-line-items/route.ts:53) and [:88](app/api/quote-line-items/route.ts:88) — should use `validationError()`.

The `withAuth` and `withPlatformAuth` wrappers themselves correctly use the helper functions ([app/api/_lib/handler.ts:31-44](app/api/_lib/handler.ts:31)).

### 🟡 Quote totals computed in JS instead of via RPC
[app/api/quotes/route.ts:50-58](app/api/quotes/route.ts:50) sums material + labour in a JS loop and writes the result on insert. This works, but every other money-handling path goes through `recalc_quote_total` / `recalc_purchase_order_total` ([CLAUDE.md atomic-write helpers section](CLAUDE.md)). Drift here means a future refactor will silently miss this path. Either call `recalcQuoteTotal()` after the items insert, or move the math entirely into a `create_quote_with_items` RPC.

### 🟡 Unbounded list reads
GET routes that don't honour `parsePagination()` and have no other limit:
- [app/api/licenses/route.ts:6-15](app/api/licenses/route.ts:6) — `tenant_licenses` selected with no limit.
- `notes`, `status-config`, `modules`, `users`, `activity` — small in practice today, but unbounded in shape.

`quote-line-items` and `quote-sections` are bounded by parent quote — acceptable.

### 🟡 Manual rollback pattern in `purchase-orders` POST
[app/api/purchase-orders/route.ts:99-100](app/api/purchase-orders/route.ts:99) does `supabase.from("purchase_orders").delete().eq("id", po.id)` to roll back when line-item insert fails. This is correct logic for a non-transactional client, but is a code smell — it duplicates the atomic-write pattern (`create_job_with_assignees`) in app code. Consider a `create_po_with_items` RPC for symmetry.

### 🟡 Stale CLAUDE.md claim
[CLAUDE.md:420](CLAUDE.md) — "Stripe integration is stubbed". Stripe is now fully implemented across `app/api/stripe/{checkout,seats,portal}/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/stripe.ts`, `lib/stripe-seats.ts`, and the subscription page. Update the doc.

### 🟢 `console.error` in success paths
Several routes log on error — that's fine — but a couple log on what is effectively expected upstream behaviour:
- [app/api/invoices/route.ts:110](app/api/invoices/route.ts:110), [app/api/quotes/route.ts:183](app/api/quotes/route.ts:183) — Xero sync failures `console.error`'d but not surfaced to the caller. Consider an `xero_sync_log` insert (you already have one) or a structured-logging helper. Not urgent.

### 🟢 Webhook signature verification
Stripe and Xero webhooks both verify signatures before processing — ✅. No issues here.

---

## 2. Modularity

### 🟡 `JobDetailView.tsx` is a god component
[components/jobs/JobDetailView.tsx](components/jobs/JobDetailView.tsx) — 617 lines, 14 `useState` hooks, 7 SWR calls, 6 modals managed inline. The seven-tab content (details, quotes, invoices, reports, appointments, files, expenses) should split into per-tab components in `components/jobs/tabs/` (which already exists as a folder). This file shows up frequently in the git log; splitting it would meaningfully reduce merge friction. (Note: I checked, this component does **not** contain direct `supabase.from()` writes — earlier audit guesses suggested otherwise; `grep -c` returned 0.)

### 🟢 Other large-but-coherent files
| File | Lines | Verdict |
|---|---|---|
| `lib/validation.ts` | 596 | Schema warehouse — appropriate |
| `app/dashboard/settings/company/subscription/page.tsx` | 573 | Coherent (subscription UI + plan cards + portal) |
| `components/modals/EditQuoteModal.tsx` | 536 | Tabbed edit; could split if it grows |
| `app/dashboard/overview/page.tsx` | 512 | Dashboard composition — fine as a single page |
| `components/reports/PhotoUploadField.tsx` | 499 | File upload + UI — acceptable |
| `components/sheets/ReportSideSheet.tsx` | 488 | Tabbed sheet; tab extraction would help |
| `app/onboarding/OnboardingFlow.tsx` | 467 | Multi-step flow; coherent |
| `app/dashboard/jobs/page.tsx` | 467 | Kanban + list view; acceptable |

None of these are urgent. `JobDetailView` is the only one that's actively fighting its own size.

### 🟢 `features/` vs `components/` boundary
Functional but slightly blurry. `features/{shell, side-sheets, line-items, assistant}` and `components/{dashboard, modals, sheets, ui, jobs, …}` overlap conceptually. Documented well in CLAUDE.md, so not a blocker, but if the project keeps growing a per-folder README in `features/` clarifying the intent would future-proof it.

---

## 3. Code Quality & Cleanliness

### Strengths
- `tsconfig.json` has `strict: true`. No proliferation of implicit `any`.
- ~40 `any` casts in the entire codebase, every one explicitly suppressed (e.g. `// eslint-disable-next-line` on the spot or wrapped in `as unknown as ...` for known polymorphic Supabase return shapes). No silent escape hatches.
- Zero `@ts-ignore` / `@ts-expect-error` in source.
- Zero `TODO`/`FIXME`/`HACK` markers in tracked source. (Two hits in `lib/report-templates/presets.ts` are domain-data placeholders, not code TODOs; `.claude/worktrees/` matches are scratch worktrees.)
- `cn()` from `lib/utils` used 145+ times for conditional classes. Inline ternary `className`s are rare.
- Soft-delete rule honoured across **all** business entities except `tenant_licenses` (see Top Priority #2).

### 🟡 SWR hooks don't standardise error handling
[lib/swr.ts](lib/swr.ts) returns the raw SWR shape `{ data, error, isLoading, mutate }`, but consumers consistently check `isLoading` and skeleton-render on `!data`, then silently render an empty/zero state if `error` is set. SWR exposes `error` — pages just don't use it. A thin wrapper that toasts on error, or a documented convention to read `error` and surface it, would close a real UX gap (see §4).

### 🟢 `console.*` audit
20+ `console.error` calls in `app/api/**`. These are intentional server logs in error branches, not debug noise. No `console.log` left in production paths. The `console.error` in [app/api/_lib/errors.ts:23](app/api/_lib/errors.ts:23) is the centralised `serverError` log — that's the right shape.

### 🟢 ESLint config is thin
[eslint.config.mjs](eslint.config.mjs) extends `next/core-web-vitals` + `next/typescript` and that's it. No custom rules, no react-hooks/exhaustive-deps escalation. The codebase passes anyway, but adding `@typescript-eslint/no-floating-promises`, `react-hooks/exhaustive-deps: error`, and `no-console: ["error", { allow: ["error", "warn"] }]` would catch a class of issues automatically.

### 🟢 Missing scripts
[package.json](package.json) has `dev`, `build`, `start`, `lint` only. No `typecheck` (just `tsc --noEmit`) and no `test`. Both are one-line additions; they'd let an agent (or new dev) run the right command without spelunking through `vitest.config.ts`.

---

## 4. User Experience

### 🟡 Silent fetch failures
SWR returns `error` but pages don't render it. Spot-checked five list pages — none surface fetch errors to the user. If the API 500s, the user sees a perpetual skeleton or an empty state. Pattern fix: add an `error` branch in [components/dashboard/DataTable.tsx](components/dashboard/DataTable.tsx) (it already handles loading and empty), and standardise on consumers passing `error` through.

### 🟡 Inline `<h1>` page titles co-render with `usePageTitle()`
CLAUDE.md and DESIGN_SYSTEM.md both say "do **not** render page titles in the page body." Found in:
- [app/dashboard/jobs/page.tsx:219](app/dashboard/jobs/page.tsx:219)
- [app/dashboard/quotes/page.tsx:106](app/dashboard/quotes/page.tsx:106)
- [app/dashboard/contacts/page.tsx:86](app/dashboard/contacts/page.tsx:86)
- [app/dashboard/invoices/page.tsx:121](app/dashboard/invoices/page.tsx:121)

Each calls `usePageTitle("…")` *and* renders an inline `<h1 className="font-statement text-2xl font-extrabold tracking-tight">…</h1>`. The result is a duplicate title (sticky header + page body). Single-PR cleanup.

### 🟡 Accessibility gaps
- Icon-only buttons in [app/dashboard/DashboardShell.tsx](app/dashboard/DashboardShell.tsx) (notifications bell, inbox, etc.) lack `aria-label`. `aria-label` appears 16 times across the app — coverage is partial.
- `<img>` tags missing `alt` in:
  - `components/reports/PhotoUploadField.tsx` (preview)
  - `components/quotes/QuoteHeader.tsx` (logo)
  - `components/modals/CreateReceiptModal.tsx` (preview)
- Most form modals do use semantic `<label>` correctly — that part is solid.

### 🟢 Empty states
`DataTable` ([components/dashboard/DataTable.tsx](components/dashboard/DataTable.tsx)) handles empty cleanly via `emptyMessage`. Skeleton rows on `loading=true`. Good.

### 🟢 Dark mode
Intentionally not supported per design-system spec; no dark-mode tokens in `globals.css`. Don't change this — it's a design call.

---

## 5. Code Structure

### Strengths
- [lib/routes.ts](lib/routes.ts) exists with named constants; used in 9 places. Path strings don't sprawl.
- Zero `../../../` deep-relative imports across the codebase.
- No circular-dependency signals during sampling.
- Folder layout matches CLAUDE.md exactly: `app/{(auth), actions, api, dashboard, platform-admin, onboarding}`, `components/{dashboard, modals, sheets, ui, …}`, `features/`, `lib/`, `supabase/`.
- Server-actions vs API split is documented and honoured (auth flows in `actions/`, CRUD in `api/`).

### 🟢 Middleware tenant resolution is well-designed
[middleware.ts](middleware.ts) — three-strategy resolution (custom domain → subdomain → JWT) with 60s in-memory cache, 500-entry LRU eviction. Documented in CLAUDE.md. The only gap is that **none of this is tested** (see §3 / Top Priority #4).

### 🟢 Server actions
Live in `app/actions/`. Pattern is consistent: `"use server"` + try/catch + `{ success: bool, error?: string }`. Used for auth flows; CRUD goes through API routes.

---

## 6. Agent Friendliness

### Strengths (this section is genuinely a standout)
- [CLAUDE.md](CLAUDE.md) (640 lines) covers: auth wrapper, validation, soft-delete rule, atomic-write helpers, middleware caching strategy, tenant-isolation invariants, plan/audit conventions, design system, "creating a new entity" 7-step checklist, known issues. An incoming agent or developer can act with high confidence after reading it once.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) covers tokens, radius scale, typography, spacing, primitives. Self-contained.
- [DATABASE.md](DATABASE.md) — schema overview present.
- File and folder names are self-describing (`withAuth`, `tenantListQuery`, `recalcQuoteTotal`, `useFormSubmit`, etc.).
- `docs/plans/` and `docs/audits/` folders are populated with structured templates.
- `.env.example` exists.

### 🟢 Plans hygiene
- **In-progress (potentially stalled):** `stripe-integration_2026-04-25` — ~14 days in-progress. Either still actively shipping (per recent commits: yes) or worth a status update.
- **Approved but untouched:** `permissions-revamp_2026-04-23` — approved 15 days ago, no movement. Either start, defer, or close.
- **In-progress (recent, fine):** `ai-assistant_2026-05-04`, `expenses_2026-05-07`, `files_2026-05-07`.
- **Audit hygiene:** [docs/audits/code-review_2026-03-26_incomplete/](docs/audits/code-review_2026-03-26_incomplete/) — close it or supersede with `full-code-review_2026-03-28_complete`.

### 🟢 README and scripts
[README.md](README.md) is accurate (port `8005` matches `scripts/dev.mjs` and CLAUDE.md), but thin. It points to CLAUDE.md and that's enough for an agent. For human onboarding, a 2-3 line "what is THOR / who is it for" paragraph would help.

[package.json](package.json) `scripts` is missing `typecheck` and `test` aliases — see §3.

### 🟢 `lucide-react` redundancy
Single overlap with the standardised `@tabler/icons-react`. `lucide-react` is imported only in:
- [app/dashboard/DashboardShell.tsx](app/dashboard/DashboardShell.tsx)
- [features/shell/nav-config.ts](features/shell/nav-config.ts)
- [features/assistant/AssistantPanel.tsx](features/assistant/AssistantPanel.tsx)
- [features/assistant/AssistantTrigger.tsx](features/assistant/AssistantTrigger.tsx)

These are all part of the shell/assistant. Either swap them to Tabler equivalents (small mechanical PR) or update the rule in CLAUDE.md to acknowledge the shell exception. Drift either way, but the doc says Tabler-only, so the doc wins by default.

### 🟢 Stale claim in CLAUDE.md
Already noted in §1 — line 420 says Stripe is stubbed; it isn't.

---

## 7. Design System Integrity

### Strengths
- Tokens centralised in [lib/design-system.ts](lib/design-system.ts) (status colours, table styles, avatar surfaces, heading classes) and `globals.css` `@theme` block.
- Tabler is the dominant icon source (one Lucide overlap noted above).
- Filter pattern (Radix `Select`) used consistently. No pill-button filter regressions found.
- Modal pattern consistent across `Create*Modal.tsx` (Radix Dialog + form + Zod + `sonner` + `onCreated`). Edit modals diverge in shape (expected — different flow).
- `useFormSubmit` ([lib/hooks/use-form-submit.ts](lib/hooks/use-form-submit.ts)) exists. Some modals use it; others still inline `setSaving` + `fetch`. Migrating the holdouts is a slow-cook cleanup, not urgent.

### 🟡 Inline `<h1>` page titles
See §4. Same finding, design-system flavour: pages render the title in body and via `usePageTitle()`, and the body version uses a `font-statement` class that isn't in `DESIGN_SYSTEM.md`'s typography spec.

### 🟢 Hex literals in UI
Genuinely scoped. The hex literals that exist are defensible:
- [components/Kanban.tsx:21-34](components/Kanban.tsx:21) — Tailwind-name → hex map for board card colour. Fine.
- [components/pdf/PdfLetterhead.tsx](components/pdf/PdfLetterhead.tsx) and other `components/pdf/*` files — `@react-pdf/renderer` doesn't read Tailwind classes. Hex is necessary.
- [app/dashboard/settings/company/branding/page.tsx](app/dashboard/settings/company/branding/page.tsx) — fallback for tenant brand colour. Fine.
- [app/dashboard/settings/company/integrations/page.tsx:228-230](app/dashboard/settings/company/integrations/page.tsx:228) — Xero brand `#13B5EA`. Fine (third-party brand colour).

No `#7b819a` or platform-admin colour drift found despite earlier scan suggesting otherwise.

### 🟢 Radius scale
The 2/4/6px tight scale is honoured. Spot-checking turned up zero arbitrary `rounded-[Npx]` violations in dashboard/ pages. Compliant.

---

## Recommended Next Steps

### Quick wins (each ≤30 min)

1. Add `.eq("tenant_id", tenantId)` to the Xero webhook delete + update — [app/api/integrations/xero/webhook/route.ts:198-212](app/api/integrations/xero/webhook/route.ts:198). 🔴
2. Replace `licenses` DELETE with PATCH-to-archived — [app/api/licenses/route.ts:54-69](app/api/licenses/route.ts:54). 🔴
3. Replace 4 inline error responses with helpers — [purchase-orders/route.ts:49-51](app/api/purchase-orders/route.ts:49), [quote-line-items/route.ts:53,88](app/api/quote-line-items/route.ts:53). 🟡
4. Update [CLAUDE.md:420](CLAUDE.md) — Stripe is no longer stubbed. 🟡
5. Add `typecheck` and `test` scripts to [package.json](package.json). 🟢
6. Add `parsePagination()` to `licenses` GET (and notes/users/etc.). 🟡
7. Add `aria-label` to icon-only buttons in [DashboardShell](app/dashboard/DashboardShell.tsx) and `alt` to the three flagged `<img>` tags. 🟡
8. Close `docs/audits/code-review_2026-03-26_incomplete/`. 🟢
9. Status-update on `permissions-revamp_2026-04-23` (15-day-old approved plan). 🟢

### Single-PR cleanups (≤2 hours)

10. Remove inline `<h1>` from [jobs](app/dashboard/jobs/page.tsx:219), [quotes](app/dashboard/quotes/page.tsx:106), [contacts](app/dashboard/contacts/page.tsx:86), [invoices](app/dashboard/invoices/page.tsx:121) (and any other pages found via `grep -rn "font-statement" app/dashboard`). 🟡
11. Swap Lucide imports to Tabler in `DashboardShell`, `nav-config`, `AssistantPanel`, `AssistantTrigger` (or update the doc). 🟡
12. Convert `quotes` POST total math to a `recalcQuoteTotal()` call after items insert — [app/api/quotes/route.ts:50-58](app/api/quotes/route.ts:50). 🟡
13. Add `error` rendering to `DataTable` and standardise on SWR consumers passing it through. 🟡

### Larger refactors

14. Wrap jobs PATCH `assignee_ids` update in a Postgres function (mirror `create_job_with_assignees`) — [app/api/jobs/route.ts:137-143](app/api/jobs/route.ts:137). 🟡
15. Establish a test baseline for the load-bearing helpers: `withAuth`, `withPlatformAuth`, `tenantListQuery`, `recalcQuoteTotal`, `recalcPurchaseOrderTotal`, middleware tenant resolution, RLS spot-checks per table. One invariant test per helper, not coverage chasing. 🟡
16. Decompose [JobDetailView.tsx](components/jobs/JobDetailView.tsx) into per-tab components in `components/jobs/tabs/`. Mechanical, satisfying, reduces merge churn. 🟡
17. Tighten `eslint.config.mjs`: enable `react-hooks/exhaustive-deps`, `@typescript-eslint/no-floating-promises`, `no-console` (allow `error`/`warn`). 🟢

### Out-of-scope (called out for visibility)

- A separate security review of Stripe + Xero token storage and webhook idempotency would be valuable but is its own audit.
- A focused review of `lib/swr.ts` patterns (caching keys, mutation strategies, optimistic updates) was not in this audit's scope — flag if you want one.
