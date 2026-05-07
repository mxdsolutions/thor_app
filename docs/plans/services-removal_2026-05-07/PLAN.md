# Services Removal

**Status:** complete
**Date:** 2026-05-07

## Goal

Remove the entire "Services" feature and the `jobs.service_id` field. Construction companies don't track products/services in this shape, so the feature is dead weight. Also remove `job_line_items` (the table the Services feature was built around) — it has zero UI consumers and exists only because Services existed.

## Scope

### Removed
- `products` table (was the backing for Services) and all FKs into it
- `job_line_items` table — dead since no UI consumes it
- `jobs.service_id` column
- `/api/services`, `/api/services/[id]/archive`, `/api/job-line-items`
- `/dashboard/services` page
- `ServiceSideSheet`, `CreateServiceModal`
- `useServices` / `useServiceOptions` SWR hooks
- `serviceSchema` / `serviceUpdateSchema` / `lineItemSchema` (job line item flavour) Zod schemas
- `recalcJobAmount` (and the generic `recalcTotal` helper) — quote totals stay
- `OPS_SERVICES` route constant + Services nav entry
- `ops.services` permission resource + role defaults + ROUTE_TO_RESOURCE entry
- `services` setup-checklist item

### Edited
- Jobs API + schedule API — drop service joins and `service_id` in payloads
- `jobSchema` / `jobUpdateSchema` — drop `service_id`
- `JobDetailView` — drop "Type" field + services dropdown loader
- `CreateJobModal` — drop service picker + auto-name-from-service
- `PricingSearchDropdown` — drop "Services" section, `useServiceOptions`, `CreateServiceModal`
- Overview (`app/page.tsx`) + `app/dashboard/jobs/page.tsx` — drop "Type" column + service-name search/filter
- Setup checklist route — drop product count query

### Kept
- `pricing` table — used by quote line items, untouched
- `quote_line_items` + `recalcQuoteTotal` — separate model, untouched
- Migration 021 (auto-progress trigger) — only fires on quotes/invoices/reports

## Approach

Project is dev-only (no production tenants), so this is a hard cut. No data migration, no compatibility shims, no soft-deprecation. Order:

1. Edit all consumers of services/job-line-items so they stop referencing them
2. Delete the now-unreferenced files and directories
3. Write one migration (022) that drops the tables and column
4. `npm run lint` + `npm run build` to verify

## Risk

Low. `job_line_items` has zero UI consumers (verified — only matches were in an abandoned `.claude/worktrees/` scratch branch). Quote line items use a separate table and helper.

## Out of scope

- Replacing Services with anything else (e.g. tagging jobs, project-type enum). If categorisation is wanted later, that's a fresh decision.
- Touching the `pricing` feature beyond removing the "Services" section in `PricingSearchDropdown`.
- Reconsidering whether `jobs.amount` belongs as a column at all — leave it, it's already manually editable.
