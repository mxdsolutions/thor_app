-- Performance: trigram indexes for ILIKE search + composites for filtered list queries.
--
-- Background:
--   1. Every list endpoint that supports search uses leading-wildcard ILIKE
--      (`column ILIKE '%term%'`), which a btree index cannot satisfy. Postgres
--      can BitmapOr a multi-column ILIKE OR clause only when *every* branch has
--      a usable index — see migration 010 which fixed this for `pricing`.
--   2. Filtered list queries on jobs/quotes/invoices/reports almost always
--      include `tenant_id = $1 AND status = $2 ORDER BY created_at DESC`.
--      Without a composite index the planner does an index scan + sort.
--
-- All indexes use `if not exists` so this migration is idempotent and safe to
-- re-run. pg_trgm was already enabled by migration 010.

create extension if not exists pg_trgm;

-- -----------------------------------------------------------------
-- Trigram GIN indexes for ILIKE search columns
-- -----------------------------------------------------------------

-- contacts
create index if not exists idx_contacts_first_name_trgm
  on public.contacts using gin (first_name gin_trgm_ops);
create index if not exists idx_contacts_last_name_trgm
  on public.contacts using gin (last_name gin_trgm_ops);
create index if not exists idx_contacts_email_trgm
  on public.contacts using gin (email gin_trgm_ops);

-- companies
create index if not exists idx_companies_name_trgm
  on public.companies using gin (name gin_trgm_ops);
create index if not exists idx_companies_email_trgm
  on public.companies using gin (email gin_trgm_ops);

-- jobs
create index if not exists idx_jobs_job_title_trgm
  on public.jobs using gin (job_title gin_trgm_ops);
create index if not exists idx_jobs_description_trgm
  on public.jobs using gin (description gin_trgm_ops);
create index if not exists idx_jobs_reference_id_trgm
  on public.jobs using gin (reference_id gin_trgm_ops);

-- quotes
create index if not exists idx_quotes_title_trgm
  on public.quotes using gin (title gin_trgm_ops);
create index if not exists idx_quotes_description_trgm
  on public.quotes using gin (description gin_trgm_ops);

-- invoices
create index if not exists idx_invoices_invoice_number_trgm
  on public.invoices using gin (invoice_number gin_trgm_ops);
create index if not exists idx_invoices_reference_trgm
  on public.invoices using gin (reference gin_trgm_ops);

-- reports
create index if not exists idx_reports_title_trgm
  on public.reports using gin (title gin_trgm_ops);
create index if not exists idx_reports_notes_trgm
  on public.reports using gin (notes gin_trgm_ops);

-- tasks (idx_tasks_tenant_status already exists from earlier work)
create index if not exists idx_tasks_title_trgm
  on public.tasks using gin (title gin_trgm_ops);

-- timesheets
create index if not exists idx_timesheets_notes_trgm
  on public.timesheets using gin (notes gin_trgm_ops);

-- files
create index if not exists idx_files_name_trgm
  on public.files using gin (name gin_trgm_ops);

-- purchase_orders
create index if not exists idx_purchase_orders_title_trgm
  on public.purchase_orders using gin (title gin_trgm_ops);
create index if not exists idx_purchase_orders_reference_id_trgm
  on public.purchase_orders using gin (reference_id gin_trgm_ops);
create index if not exists idx_purchase_orders_notes_trgm
  on public.purchase_orders using gin (notes gin_trgm_ops);

-- receipts
create index if not exists idx_receipts_vendor_name_trgm
  on public.receipts using gin (vendor_name gin_trgm_ops);
create index if not exists idx_receipts_notes_trgm
  on public.receipts using gin (notes gin_trgm_ops);

-- projects (exposed by /api/scopes — UX-name vs table-name mismatch)
create index if not exists idx_projects_title_trgm
  on public.projects using gin (title gin_trgm_ops);

-- platform admin: tenants
create index if not exists idx_tenants_name_trgm
  on public.tenants using gin (name gin_trgm_ops);
create index if not exists idx_tenants_slug_trgm
  on public.tenants using gin (slug gin_trgm_ops);
create index if not exists idx_tenants_company_name_trgm
  on public.tenants using gin (company_name gin_trgm_ops);

-- platform admin: report_templates
create index if not exists idx_report_templates_name_trgm
  on public.report_templates using gin (name gin_trgm_ops);
create index if not exists idx_report_templates_description_trgm
  on public.report_templates using gin (description gin_trgm_ops);

-- -----------------------------------------------------------------
-- Composite indexes for filtered list queries
-- -----------------------------------------------------------------
-- Pattern: `WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC`.
-- The leading tenant_id column also accelerates queries that filter by tenant
-- alone. tasks already has (tenant_id, status) from earlier work.

create index if not exists idx_jobs_tenant_status_created
  on public.jobs (tenant_id, status, created_at desc);

create index if not exists idx_quotes_tenant_status_created
  on public.quotes (tenant_id, status, created_at desc);

create index if not exists idx_invoices_tenant_status_created
  on public.invoices (tenant_id, status, created_at desc);

create index if not exists idx_reports_tenant_status_created
  on public.reports (tenant_id, status, created_at desc);

-- -----------------------------------------------------------------
-- Refresh planner stats
-- -----------------------------------------------------------------

analyze public.contacts;
analyze public.companies;
analyze public.jobs;
analyze public.quotes;
analyze public.invoices;
analyze public.reports;
analyze public.tasks;
analyze public.timesheets;
analyze public.files;
analyze public.purchase_orders;
analyze public.receipts;
analyze public.projects;
analyze public.tenants;
analyze public.report_templates;
