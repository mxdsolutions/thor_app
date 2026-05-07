# Code Audit — THOR (Tradie OS)

**Date**: 2026-05-07
**Project type**: Multi-tenant Next.js 15 / React 19 / Supabase web app
**Audit depth**: Quick (manifests, middleware, API spine, two large components, validation, design tokens — ~5% of source)

## Executive Summary

THOR is in **better-than-average shape** for its size. The architectural spine is genuinely well-thought-out: a `withAuth`/`withPlatformAuth` wrapper, a `tenantListQuery` helper that bakes in the tenant filter, defense-in-depth (RLS + explicit `.eq("tenant_id", …)`), middleware that resolves tenant by custom domain → subdomain → JWT with sensible caching, and a thorough `CLAUDE.md` that documents the patterns. New entities clearly have a clean slot to drop into.

The two things holding it back are **near-zero automated tests** (one test file outside `node_modules` for a codebase of this scope) and a handful of **god components** that have outgrown the patterns the docs describe — `JobDetailView.tsx` (1036 lines) in particular orchestrates 7 side-sheets and 6 modals, and bypasses the API/SWR layer to mutate Supabase directly. There are also two real concurrency hazards on the write path (already partially documented as known issues): non-atomic line-item totals and non-atomic reference-id allocation in `POST /api/jobs`.

**Severity counts**: 🔴 3 critical · 🟡 6 major · 🟢 5 minor

## Top Priorities

1. 🔴 **Add a real test baseline.** Only [app/api/webhooks/stripe/route.test.ts](app/api/webhooks/stripe/route.test.ts) exists for the entire user-code surface. At minimum cover `withAuth`/`withPlatformAuth`, `tenantListQuery`, and the recalc helpers — these are load-bearing and a regression in any of them breaks tenant isolation or money math.
2. 🔴 **Fix the reference-id allocator race in [app/api/jobs/route.ts:75-92](app/api/jobs/route.ts).** Read-then-update of `tenants.reference_next` is not atomic — two concurrent job creations will allocate the same number. Move to a Postgres function (`SELECT … FOR UPDATE` or `nextval` on a per-tenant sequence). Same class of bug as the documented line-items recalc issue in [app/api/_lib/line-items.ts](app/api/_lib/line-items.ts).
3. 🟡 **Decompose [components/jobs/JobDetailView.tsx](components/jobs/JobDetailView.tsx).** 1036 lines, ~14 `useState`s, 7 SWR hooks, and a direct `supabase.from("jobs").update(...)` call from the component (line 172) — that bypasses validation and is the only thing in the codebase doing it from a UI component for a tenant-scoped table. Split per-tab content into sub-components and route writes through `PATCH /api/jobs`.

---

## 1. Best Practices

**Strengths**
- TypeScript `strict: true` ([tsconfig.json:11](tsconfig.json)). Very few `any` casts in user code (~40 occurrences, mostly in 2–3 files).
- `next/core-web-vitals` + `next/typescript` ESLint base ([eslint.config.mjs](eslint.config.mjs)).
- Nearly zero `console.log` in user code (3 hits) and no committed `.env*` other than the (gitignored) `.env.local`.
- Zod validation is consistently applied at API boundaries ([lib/validation.ts](lib/validation.ts), and seen in every POST/PATCH I sampled).

**Findings**
- 🔴 **Race in reference-id allocation** — [app/api/jobs/route.ts:75-92](app/api/jobs/route.ts:75). Read-then-update of `tenants.reference_next` is not transactional. Two concurrent `POST /api/jobs` requests can allocate the same `reference_id`. Use a Postgres function or per-tenant sequence.
- 🔴 **Non-atomic line-item totals** — [app/api/_lib/line-items.ts](app/api/_lib/line-items.ts). Already self-documented in CLAUDE.md "Known Issues" — concurrent writes can leave totals wrong. Same fix shape: an `RPC` that recomputes inside one transaction.
- 🟡 **Job + assignees insert is not atomic** — [app/api/jobs/route.ts:97-115](app/api/jobs/route.ts:97). The job is inserted, then assignees inserted in a follow-up call. If the second call fails, you get a half-created job. PATCH has the same shape (lines 143-150). Wrap in an RPC or accept the second failure and roll back.
- 🟡 **`jobs` GET doesn't use `tenantListQuery`** — [app/api/jobs/route.ts:14-43](app/api/jobs/route.ts:14). Manual `.eq("tenant_id", tenantId)` is correct here, but the whole point of the helper is "can't forget the filter" — the more routes that opt out, the weaker that guarantee gets. Either extend the helper (it already supports a `select` string) or document why this route is special.
- 🟡 **`withAuth` doesn't use `errors.ts` helpers** — [app/api/_lib/handler.ts:30-54](app/api/_lib/handler.ts:30) inlines `NextResponse.json({ error: ... })` for 401/403/500. Minor, but CLAUDE.md says "**never** use inline `NextResponse.json({ error: ... })`" — the canonical wrapper is doing exactly that.
- 🟢 **No `.env.example`** but [README.md:11](README.md:11) tells new devs to `cp .env.example .env.local`. Either add the file or fix the README.
- 🟢 **Port mismatch in docs** — [README.md:11](README.md:11) says `localhost:3002`, [CLAUDE.md](CLAUDE.md) and [scripts/dev.mjs:18](scripts/dev.mjs:18) say `8005`. The script is the source of truth.

## 2. Modularity

**Strengths**
- Clear `app/` (routes) ↔ `components/` (UI) ↔ `features/` (cross-cutting modules) ↔ `lib/` (domain helpers) split. Each section has an obvious purpose.
- API route → SWR hook → page → modal → sheet pattern is consistent enough that a new entity slots in mechanically (the checklist in CLAUDE.md genuinely matches what the codebase does).
- Server actions vs. API routes have a documented split and are actually followed.

**Findings**
- 🟡 **God components.** Top offenders by line count:
  - [components/jobs/JobDetailView.tsx](components/jobs/JobDetailView.tsx) — 1036 lines (see Top Priorities).
  - [components/sheets/TenantSideSheet.tsx](components/sheets/TenantSideSheet.tsx) — 772 lines
  - [components/sheets/QuoteSideSheet.tsx](components/sheets/QuoteSideSheet.tsx) — 719 lines
  - [app/(auth)/signup/SignupFlow.tsx](app/(auth)/signup/SignupFlow.tsx) — 685 lines
  - [components/modals/CreateQuoteModal.tsx](components/modals/CreateQuoteModal.tsx) — 586 lines
  Most of these are tabbed sheets that grew organically — splitting per-tab content into sibling files would cut each by 40-60% with very little risk.
- 🟡 **UI components writing to Supabase directly.** 6 files in `components/` import `@/lib/supabase/client` and mutate. Some are reasonable (live-edit fields where round-tripping through a route would feel laggy), but `JobDetailView.handleSave` ([components/jobs/JobDetailView.tsx:171-181](components/jobs/JobDetailView.tsx:171)) writes any `jobs` column straight from the browser, skipping `jobUpdateSchema`. RLS still protects tenant isolation, but column-level validation is gone.

## 3. Code Quality & Cleanliness

**Strengths**
- Naming is consistent and self-explanatory throughout (`useJobs`, `withAuth`, `tenantListQuery`, `recalcQuoteTotal` — you can guess what each does without opening the file).
- Function bodies are short. Most route handlers are <50 lines.
- Comments tend to explain *why*, not *what* (e.g. the JWT-fallback comment in [middleware.ts:245-247](middleware.ts:245), the lazy-fetch note in [JobDetailView.tsx:129-132](components/jobs/JobDetailView.tsx:129)).

**Findings**
- 🔴 **Almost no tests.** A single user-code test file (`stripe/route.test.ts`) for the whole project. Vitest is configured and ready — the gap is content, not tooling. This is the single biggest quality risk in the audit.
- 🟢 **A few escape-hatch `any` casts** — [components/dashboard/UserSideSheet.tsx:71-74](components/dashboard/UserSideSheet.tsx:71), [components/jobs/JobDetailView.tsx:118-123](components/jobs/JobDetailView.tsx:118). Each has the eslint-disable comment, so the team is aware. Worth typing properly when those files get touched.
- 🟢 **Magic-number defaults** — [app/api/_lib/line-items.ts:46-47](app/api/_lib/line-items.ts:46) defaults missing `material_margin`/`labour_margin` to `20`. Probably correct, but a named constant or a NOT-NULL DB default would document the contract.

## 4. User Experience

Hard to evaluate without running the app, but the spine is solid:

**Strengths**
- Middleware has thoughtful UX details: signup-resume bypass for the Stripe round-trip ([middleware.ts:266-274](middleware.ts:266)), settings pages stay reachable when a tenant is billing-locked so they can fix payment ([middleware.ts:282-298](middleware.ts:282)).
- Consistent JSON response shapes (`{ items, total }`, `{ item }`).
- Toast feedback via `sonner` and SWR's `keepPreviousData` for paginated lists ([lib/swr.ts:47](lib/swr.ts:47)) — list filters won't flash empty.

**Findings**
- 🟢 **Error responses are terse.** `serverError()` returns `{ error: "Internal server error" }` ([app/api/_lib/errors.ts:20-25](app/api/_lib/errors.ts:20)) — fine for the client, but worth logging the underlying Postgres error server-side when it happens (currently `if (error) return serverError()` swallows the detail).

## 5. Code Structure

**Strengths**
- Folder layout matches the README/CLAUDE.md description exactly. Anyone who reads the docs can find any file in two clicks.
- `lib/routes.ts` exists and is documented as the single source of truth for paths.
- `app/api/_lib/` cleanly isolates handler/error/pagination/list-query helpers.

**Findings**
- 🟢 **Split between `components/` and `features/`.** Both contain reusable building blocks; the boundary ("`features/` = cross-cutting modules") is documented but not always obvious from the names. Not a problem now; would become one as `features/` grows beyond its current four entries.

## 6. Agent Friendliness

This is the project's standout strength.

- 📕 [CLAUDE.md](CLAUDE.md) is *unusually good* — explains the auth wrapper, validation pattern, list-query helper, design tokens, plan/audit conventions, known issues, and the soft-delete rule. New-entity checklist is a 7-step recipe.
- 📕 [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [DATABASE.md](DATABASE.md), [docs/plans/](docs/plans), [docs/audits/](docs/audits) all exist and are populated.
- File names are self-describing. Entry points are obvious.

**Findings**
- 🟢 [README.md](README.md) is thin and has the wrong port + a broken `.env.example` reference (see Best Practices). Easy fix.

## 7. Design System Integrity

**Strengths**
- Tokens defined once in [lib/design-system.ts](lib/design-system.ts) and the `@theme` block in `globals.css`. Tabler Icons standardised.
- Radius scale is deliberately tight (2/4/6 px) and the rule is documented. Only 2 arbitrary `rounded-[…]` values across the codebase — both legitimate edge cases (a 4px schedule entry, a 2rem mobile preview frame).
- Status-dot colours, table styles, avatar surfaces all centralised.

**Findings**
- 🟡 **Raw hex colours in [app/platform-admin/PlatformAdminShell.tsx](app/platform-admin/PlatformAdminShell.tsx).** `#7b819a` appears 5 times (lines 51, 64, 80, 127, 138, 151) for the same nav-text colour. Should be a token (`--platform-admin-muted-foreground` or similar). Same file uses `bg-white/[0.07]` six times — also a candidate for a token.
- 🟢 **Two more raw hex hits** — [app/page.tsx:181](app/page.tsx:181) (`#F05A28` brand orange in a marketing blur), [app/dashboard/settings/company/branding/page.tsx:11](app/dashboard/settings/company/branding/page.tsx:11) (default fallback colour). Both arguably defensible; the platform-admin one is the real fix.

---

## Recommended Next Steps

**Quick wins** (single PR, hours of work)
1. Fix [README.md](README.md) port + `.env.example` reference; add an actual `.env.example`.
2. Replace inline `NextResponse.json({ error: ... })` in [withAuth](app/api/_lib/handler.ts) with the helpers from `errors.ts` (consistency with the rule the file enforces).
3. Token-ise the platform-admin nav colour (`#7b819a` × 6).
4. Type the `any` casts in [UserSideSheet.tsx](components/dashboard/UserSideSheet.tsx) and the three `selected*` states in [JobDetailView.tsx](components/jobs/JobDetailView.tsx).
5. Log the underlying error in `serverError()` callers so prod 500s stop being mysterious.

**Larger refactors** (worth scheduling)
1. **Reference-id allocator → Postgres function/sequence.** Same pattern as the planned `recalc_job_amount` RPC.
2. **Atomic job+assignees writes** via an RPC (or a Postgres trigger that mirrors `assignee_ids` from the job row).
3. **Decompose `JobDetailView.tsx`** — split per-tab content; route the inline `supabase.from("jobs").update(...)` call through `PATCH /api/jobs`. Apply the same recipe to `TenantSideSheet`, `QuoteSideSheet`, `SignupFlow` as they get touched.
4. **Test baseline.** Pick the highest-leverage targets first: `withAuth`/`withPlatformAuth` (tenant isolation), `tenantListQuery` (defense-in-depth), `recalcQuoteTotal`/`recalcPurchaseOrderTotal` (money), the middleware's tenant-resolution + billing-lock branching, and the stripe webhook (already covered — keep extending). Aim for "one test per critical invariant," not coverage %.
