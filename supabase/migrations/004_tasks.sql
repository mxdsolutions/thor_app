-- Tasks table for tenant-scoped task management
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority smallint not null default 3 check (priority between 1 and 4),
  due_date date,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table tasks enable row level security;

create policy "Tenant members can view tasks"
  on tasks for select
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can insert tasks"
  on tasks for insert
  with check (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can update tasks"
  on tasks for update
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

create policy "Tenant members can delete tasks"
  on tasks for delete
  using (tenant_id = (select (current_setting('app.tenant_id', true))::uuid));

-- Indexes
create index idx_tasks_tenant on tasks(tenant_id);
create index idx_tasks_assigned on tasks(assigned_to);
create index idx_tasks_due on tasks(due_date) where status not in ('completed', 'cancelled');
create index idx_tasks_tenant_status on tasks(tenant_id, status);
