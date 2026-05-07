# Services Removal — Tasks

See [PLAN.md](./PLAN.md).

## Edit consumers

- [ ] `components/quotes/PricingSearchDropdown.tsx` — drop services section, `useServiceOptions`, `CreateServiceModal`
- [ ] `app/api/jobs/route.ts` + `app/api/jobs/[id]/route.ts` — drop service join, drop `service_id` from POST/PATCH
- [ ] `app/api/schedule/route.ts` — drop service join from jobs select
- [ ] `lib/validation.ts` — drop `service_id` from `jobSchema` / `jobUpdateSchema`; drop `serviceSchema` / `serviceUpdateSchema` / `lineItemSchema`
- [ ] `components/jobs/JobDetailView.tsx` — drop "Type" field + services dropdown loader
- [ ] `components/modals/CreateJobModal.tsx` — drop service picker + auto-name behaviour
- [ ] `app/page.tsx` — drop "Type" column + service search filter on active jobs table
- [ ] `app/dashboard/jobs/page.tsx` — drop any `type` filter/sort
- [ ] `lib/swr.ts` — delete `useServices`, `useServiceOptions`
- [ ] `lib/permissions.ts` — drop `ops.services` from RESOURCES, ROUTE_TO_RESOURCE, DEFAULT_PERMISSIONS_BY_ROLE
- [ ] `features/shell/nav-config.ts` — drop Services nav entry
- [ ] `lib/routes.ts` — drop `OPS_SERVICES`
- [ ] `app/api/tenant/setup-checklist/items.ts` + `route.ts` — drop services item + product count
- [ ] `app/api/_lib/line-items.ts` — drop `recalcJobAmount`, `JOB_CONFIG`, generic `recalcTotal`; keep `recalcQuoteTotal`

## Delete

- [ ] `app/api/services/` (entire tree)
- [ ] `app/api/job-line-items/`
- [ ] `app/dashboard/services/`
- [ ] `components/sheets/ServiceSideSheet.tsx`
- [ ] `components/modals/CreateServiceModal.tsx`

## Database

- [ ] `supabase/migrations/022_drop_services_and_job_line_items.sql` — drop `products`, `job_line_items`, `jobs.service_id`, and clean `tenant_role_permissions` rows for `ops.services`

## Verify

- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Mark plan status `complete`
