-- Stripe integration cleanup. Removes the deprecated billing columns from
-- the tenants table. These were the projection of the previous flat-tier
-- billing scheme and have been replaced by tenant_subscriptions (migration
-- 014). All readers were migrated off in the same change set.
--
-- Safe to run because (a) tenant_subscriptions is the new source of truth,
-- (b) no production data exists yet — only test tenants — and (c) a final
-- code grep confirmed there are no remaining references in the codebase.
--
-- tenants.status is intentionally kept — it represents tenant lifecycle
-- (active / suspended) rather than billing status, and is still used by
-- platform-admin tooling.

ALTER TABLE public.tenants DROP COLUMN IF EXISTS plan;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS max_users;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS trial_ends_at;
