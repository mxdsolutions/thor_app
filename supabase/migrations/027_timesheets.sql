-- Timesheets ledger.
--
-- A row represents a span of time logged against an optional job. Either the
-- entry is created upfront via a manual modal (start + end known), or it is
-- opened by clock-in (end_at NULL) and finalised on clock-out.
--
-- Concurrency invariant: a user can only have one open timer at a time. The
-- partial unique index below enforces this without blocking historical rows.

create table if not exists public.timesheets (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    job_id uuid references public.jobs(id) on delete set null,
    start_at timestamptz not null,
    end_at timestamptz,
    notes text,
    source text not null default 'manual' check (source in ('manual','clock')),
    archived_at timestamptz,
    created_by uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint timesheets_end_after_start check (end_at is null or end_at >= start_at)
);

create index if not exists idx_timesheets_tenant_user_start
    on public.timesheets (tenant_id, user_id, start_at desc);

create index if not exists idx_timesheets_job
    on public.timesheets (job_id);

-- One open timer per (tenant, user). Closed entries (end_at not null) are
-- excluded so historical rows don't conflict.
create unique index if not exists uq_timesheets_one_active_per_user
    on public.timesheets (tenant_id, user_id)
    where end_at is null;

alter table public.timesheets enable row level security;

create policy "timesheets: tenant select"
    on public.timesheets for select
    using (tenant_id = public.get_user_tenant_id());

create policy "timesheets: tenant insert"
    on public.timesheets for insert
    with check (tenant_id = public.get_user_tenant_id());

create policy "timesheets: tenant update"
    on public.timesheets for update
    using (tenant_id = public.get_user_tenant_id())
    with check (tenant_id = public.get_user_tenant_id());

create policy "timesheets: tenant delete"
    on public.timesheets for delete
    using (tenant_id = public.get_user_tenant_id());

-- updated_at trigger
create or replace function public.timesheets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_timesheets_updated_at on public.timesheets;
create trigger trg_timesheets_updated_at
    before update on public.timesheets
    for each row execute function public.timesheets_set_updated_at();
