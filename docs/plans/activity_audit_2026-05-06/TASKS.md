# Activity Audit — Tasks

Linked plan: [PLAN.md](./PLAN.md)

## Migration (`019_activity_audit.sql`)

- [x] Define ignore-list (`id`, `created_at`, `updated_at`, `tenant_id`, `created_by`) used by trigger when computing diff
- [x] Create `log_activity_change()` trigger function (generic, takes `entity_type` from `TG_ARGV[0]`)
  - [x] Skip when `current_setting('audit.skip', true) = 'on'`
  - [x] Read `tenant_id` from NEW/OLD
  - [x] Read `performed_by` from `auth.uid()`
  - [x] INSERT: action `'created'`, changes NULL
  - [x] UPDATE: action `'updated'`, build jsonb diff, skip insert when no fields changed
  - [x] DELETE: action `'deleted'`, capture full OLD row in `changes` for posterity
- [x] Create per-table triggers:
  - [x] `jobs`, `quotes`, `invoices`, `reports`
  - [x] `job_schedule_entries`, `job_assignees`, `job_line_items`
  - [x] `quote_line_items`, `quote_sections`, `invoice_line_items`
- [x] Create `get_job_activity(p_job_id uuid, p_limit int DEFAULT 100)` SQL function
- [x] Apply migration via Supabase MCP `apply_migration`

## API

- [x] Update `app/api/activity/route.ts` GET to support `aggregate=related`

## Frontend

- [x] Update `components/sheets/ActivityTimeline.tsx`:
  - [x] Pass `aggregate=related` when `entityType === 'job'`
  - [x] Render the entity prefix when `entity_type !== 'job'`
  - [x] Handle the `'deleted'` action visually

## Verify

- [x] SQL smoke test: UPDATE on `jobs` produced an `entity_type='job', action='updated'` row with the correct `{ field: { old, new } }` diff shape — verified live in tenant `00000000-0000-0000-0000-000000000001`
- [ ] In-app verification (user-driven): open a job in the dashboard → make a status change, create a quote, add an appointment → confirm all three appear on the Activity tab with correct prefixes, actor name, and timestamps
