-- Per-user labour rate. Used by analytics to dollarise timesheet hours into
-- job expense totals. Default 0 means a user with no rate set contributes
-- $0 of labour cost to a job (still counts hours separately).

alter table public.profiles
    add column if not exists hourly_rate numeric not null default 0;

comment on column public.profiles.hourly_rate is
    'Hourly labour rate in the tenant''s primary currency (default AUD). '
    'Multiplied against timesheet hours by the analytics dashboard.';
