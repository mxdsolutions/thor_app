# Activity Audit — Comprehensive Job Activity Feed

**Status:** complete
**Created:** 2026-05-06

## Goal

Make the **Activity** tab on the Job detail view show every change to the job and to related entities (quotes, invoices, reports, appointments, line items, assignees), with timestamps to the second and the actor's identity. Today the tab is effectively empty for almost every job because the only writer to `activity_logs` is `app/api/inquiry/route.ts`.

## Approach

**Postgres triggers** write to the existing `activity_logs` table on every INSERT / UPDATE / DELETE for the relevant tables. This is the only way to guarantee comprehensive coverage — app-level emits leak forever as new routes are added. The frontend reads an aggregated feed via a `get_job_activity(p_job_id)` SQL function that UNIONs events across the job and its descendants. **No new tables, no new columns.**

### Why not a `root_entity_id` column?

Earlier draft proposed adding `root_entity_type` / `root_entity_id` columns for O(1) lookups. We're not doing that — at this scale, the UNION query is ~6 indexed `IN` lookups per page open, which is dwarfed by the trigger writes themselves. Easy to add the column later if a single job ever accumulates millions of events.

### Why not pure app-level emit?

- Misses direct DB writes (admin scripts, RPC, future routes that forget to log)
- The current code is the proof: ~zero coverage today despite the table existing for months
- Triggers run in the same transaction as the write, so audit consistency is automatic

## Architecture

### Existing schema (verified live, project `yhwydcbpgbyevbkvaivk`)

```
activity_logs (
  id uuid PK,
  entity_type text NOT NULL,    -- 'job', 'quote', 'invoice', 'report', ...
  entity_id uuid NOT NULL,
  action text NOT NULL,         -- 'created' | 'updated' | 'deleted'
  changes jsonb,                -- { "field": { "old": X, "new": Y }, ... }
  performed_by uuid,            -- auth.uid(), NULL for system writes
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
)
```

Frontend (`ActivityTimeline.tsx`) reads `changes` as `{ field: { old, new } }` — trigger output must match.

### Tables to instrument

| Table | Direct `job_id`? | Soft-delete? |
|---|---|---|
| `jobs` | self | yes (status) |
| `quotes` | yes | yes (status) |
| `invoices` | yes | yes (status) |
| `reports` | yes | yes (status) |
| `job_schedule_entries` | yes | no — hard delete OK |
| `job_assignees` | yes | no — hard delete OK |
| `job_line_items` | yes | no — hard delete OK |
| `quote_line_items` | via `quote_id` → `quotes.job_id` | no |
| `quote_sections` | via `quote_id` → `quotes.job_id` | no |
| `invoice_line_items` | via `invoice_id` → `invoices.job_id` | no |

Every table has `tenant_id` directly, so the trigger reads it from `NEW`/`OLD`.

### Trigger function

One generic function `log_activity_change()` does all the work. The `entity_type` is passed as a trigger argument (`TG_ARGV[0]`), so per-table triggers are one line each:

```sql
CREATE TRIGGER activity_audit_jobs
AFTER INSERT OR UPDATE OR DELETE ON jobs
FOR EACH ROW EXECUTE FUNCTION log_activity_change('job');
```

Function responsibilities:
- Skip if `current_setting('audit.skip', true) = 'on'` (lets bulk migrations bypass)
- Read `tenant_id` from `NEW` (or `OLD` on DELETE)
- Read `performed_by` from `auth.uid()` — may be NULL (service-role / cron)
- For UPDATE: build `changes` jsonb by diffing every column except an ignore-list (`id`, `created_at`, `updated_at`, `tenant_id`, `created_by`)
- Skip the INSERT into `activity_logs` if no fields changed (e.g., a no-op UPDATE)
- `action` = `'created'` | `'updated'` | `'deleted'`

### Aggregated feed function

```sql
CREATE FUNCTION get_job_activity(p_job_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE (...)
```

Builds a UNION across:
- The job row itself
- `quote.id IN (SELECT id FROM quotes WHERE job_id = p_job_id)` for quotes + their line_items + sections
- `invoice.id IN (...)` for invoices + their line_items
- `report.id IN (...)` for reports
- `job_schedule_entries`, `job_assignees`, `job_line_items` direct

Joins to `profiles` for `performer` info, orders by `created_at DESC`, applies tenant filter via `active_tenant_id()`.

### API surface

`/api/activity` GET — current shape:
- `?entity_type=X&entity_id=Y` → returns just events for that exact entity (existing behavior, unchanged)

New mode for the job activity tab:
- `?entity_type=job&entity_id=Y&aggregate=related` → calls `get_job_activity()` and returns the unioned feed

The job's `ActivityTimeline` is updated to pass `aggregate=related` when `entityType === 'job'`. Other call sites (contacts, companies side sheets) are unaffected.

### Frontend rendering

`ActivityTimeline.tsx` currently formats `changes` as field-by-field diffs. We add a small layer that, when the event's `entity_type !== 'job'`, prefixes the message with the entity (e.g., **Quote** Created · by Dylan).

Most messages will read fine without further work because the existing diff renderer handles arbitrary fields. Semantic phrasing ("Quote sent to customer" vs "quote.status: draft → sent") is **out of scope for this plan** — that's the layer-on-top app-level emit step we discussed, easy to add later for the handful of cases where mechanical phrasing isn't enough.

## Tradeoffs / known limitations

- **Trigger overhead**: ~tens of microseconds per write. Negligible.
- **Service-role writes log as "System"**: correct behavior, but means cron-driven status changes won't have a face attached.
- **Backfill**: existing rows in `quotes`/`invoices`/etc. don't get retroactive `created` events. Acceptable — going forward only.
- **Ignore list maintenance**: when new columns are added that shouldn't be logged (denormalised totals, internal flags), they need to be added to the function's ignore list. Documented in the migration.
- **Column rename / drop**: changes the audit history's interpretation. Standard migration concern, not specific to this plan.

## Out of scope

- Semantic event types ("invoice sent", "quote accepted") — done via app-level emit later
- Activity feeds at non-job scopes (contact, company, project) — current `entity_type=X&entity_id=Y` mode keeps working but isn't aggregated
- Pagination beyond the 100-row default — not needed for v1
- Real-time push of new events to the timeline — pull on tab open is fine
- File / Expense / Purchase Order entities — those tables don't exist yet. When built, each gets a one-line `CREATE TRIGGER` and an additional UNION branch in `get_job_activity()`
