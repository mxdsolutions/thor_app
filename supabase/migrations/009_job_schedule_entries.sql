-- Job schedule entries ledger table
-- Allows jobs to be scheduled across multiple days with time ranges
create table if not exists job_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table job_schedule_entries enable row level security;

create policy "Tenant members can view schedule entries"
  on job_schedule_entries for select
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can insert schedule entries"
  on job_schedule_entries for insert
  with check (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can update schedule entries"
  on job_schedule_entries for update
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can delete schedule entries"
  on job_schedule_entries for delete
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

-- Indexes
create index idx_schedule_entries_tenant_date on job_schedule_entries(tenant_id, date);
create index idx_schedule_entries_job on job_schedule_entries(job_id);
