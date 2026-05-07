# Tasks — Archiving across business entities

**Source:** [PLAN.md](./PLAN.md)
**Date:** 2026-05-06
**Status:** in-progress

---

## Phase 1 — Schema

- [x] **T1** — Write `supabase/migrations/020_add_archived_at.sql` adding
      `archived_at timestamptz NULL` to: `jobs`, `quotes`, `invoices`,
      `reports`, `contacts`, `companies`, `products`, `pricing`. Include
      partial indexes `(tenant_id) WHERE archived_at IS NULL` on each.
      (Note: `leads` table was dropped from the database — out of scope
      until/unless the feature returns.)
- [x] **T2** — Apply migration to the Supabase project; verify columns and
      indexes exist.
- [x] **T3** — ~~Regenerate Supabase TypeScript types if they're checked in.~~
      No checked-in generated types in this repo; types are inlined per route.

## Phase 2 — Shared API helpers

- [x] **T4** — Added `archiveActionSchema` (and `ArchiveActionInput` type) to
      `lib/validation.ts`.
- [x] **T5** — Extended `tenantListQuery` with an `archivable` flag — when
      true, applies the `archive=active|archived|all` filter automatically.
- [x] **T6** — Added `parseArchiveScope(request)` and `applyArchiveFilter()`
      in new `app/api/_lib/archive.ts` for routes that build queries manually.
- [x] **T7** — Added `buildArchiveHandler(table, entityName)` in
      `app/api/_lib/archive.ts` so each archive route is a one-liner.

## Phase 3 — API endpoints (per domain)

### CRM

- [x] **T8** — `app/api/contacts/[id]/archive/route.ts` — PATCH archive
      endpoint.
- [x] **T9** — `app/api/companies/[id]/archive/route.ts`.
- [x] **T10** — Update each CRM list `GET` to use the updated
      `tenantListQuery` (or apply the `archived_at` filter manually if it
      builds the query inline).

### Ops

- [x] **T11** — `app/api/jobs/[id]/archive/route.ts`.
- [x] **T12** — `app/api/quotes/[id]/archive/route.ts`.
- [x] **T13** — `app/api/invoices/[id]/archive/route.ts`.
- [x] **T14** — `app/api/reports/[id]/archive/route.ts`.
- [x] **T15** — Update each Ops list `GET` (jobs has the most filters — verify
      the manual query path applies the archive filter).

### Catalog

- [x] **T16** — `app/api/services/[id]/archive/route.ts` (writes to `products`).
- [x] **T17** — `app/api/pricing/[id]/archive/route.ts`.
- [x] **T18** — Update each Catalog list `GET`.

## Phase 4 — SWR + UI list filters

- [x] **T19** — Update each list-page SWR hook in `lib/swr.ts` to accept an
      optional `archive` scope and bake it into the cache key (e.g.
      `useJobs({ archive: "active" })`).
- [x] **T20** — Build a small `<ArchiveScopedStatusSelect>` component (or
      extend the existing pattern) that adds Active/Archived/All to the top
      of any status `<Select>` with a divider, then renders the per-status
      options below.
- [x] **T21** — Wire the new select into each list page:
  - [x] Jobs
  - [x] Quotes
  - [x] Invoices
  - [x] Reports
  - [x] Contacts
  - [x] Companies
  - [x] Services
  - [x] Pricing

## Phase 5 — UI archive actions

- [x] **T22** — Side-sheet pattern: add an "Archive" action to each side
      sheet. Show a banner + "Restore" button on archived rows.
  - [x] JobSideSheet / JobDetailView (kebab + banner inline)
  - [x] QuoteSideSheet
  - [x] InvoiceSideSheet
  - [x] ReportSideSheet
  - [x] ContactSideSheet
  - [x] CompanySideSheet
  - [x] ServiceSideSheet
  - [x] PricingSideSheet
  Shared via [`useArchiveAction`](components/sheets/use-archive-action.tsx);
  `SideSheetLayout` gained a `banner` slot.
- [ ] **T23** — Kanban: filter out archived in the Jobs Kanban view. Confirm
      no other Kanban views need the same treatment.
- [ ] **T24** — Entity pickers: confirm `useCompanyOptions`,
      `useContactOptions`, `useJobOptions`, `useServiceOptions` all default
      to `archive=active`. Update if not.
- [ ] **T25** — `EntitySearchDropdown` and any other shared searchable
      entity picker — confirm they consume the active-only options.

## Phase 6 — Verification

- [ ] **T26** — Manual smoke test: archive one of each entity type, verify
      it disappears from the list, picker, and (for jobs) Kanban. Switch
      filter to Archived, verify it reappears. Restore, verify back to
      normal.
- [ ] **T27** — Verify `archived_at` is set/cleared correctly in the
      database for each entity.
- [ ] **T28** — Update `CLAUDE.md` "Known Issues" / patterns section if any
      gotchas surface during implementation.
