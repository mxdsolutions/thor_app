-- Consolidates platform-admin status onto a single source of truth:
-- auth.users.raw_app_meta_data.is_platform_admin.
--
-- Previously there were two flags:
--   * profiles.is_platform_admin       — read by the is_platform_admin() SQL
--                                         function, used by ~30 RLS policies
--   * auth.users.raw_app_meta_data...  — read by every Next.js code path
--                                         (middleware, withPlatformAuth, the
--                                         "Go to Admin" header link)
--
-- They were not kept in sync, so users flagged in profiles but not in
-- app_metadata could pass RLS but never see the admin UI (and vice versa).
--
-- After this migration, app_metadata is the only source. The SQL function now
-- reads it via auth.jwt(), so RLS and app code agree. app_metadata can only
-- be set via the Supabase admin API (or by another platform admin via Studio),
-- so users still cannot self-promote.

-- 1. Backfill: anyone currently flagged in profiles must keep their access.
UPDATE auth.users u
SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('is_platform_admin', true)
FROM public.profiles p
WHERE p.id = u.id
  AND p.is_platform_admin = true
  AND COALESCE((u.raw_app_meta_data->>'is_platform_admin')::boolean, false) IS DISTINCT FROM true;

-- 2. Re-point the SQL helper at the JWT so RLS and the app read the same flag.
--    SECURITY DEFINER is no longer needed: auth.jwt() requires no elevated
--    privileges (vs the previous cross-user read of public.profiles).
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean),
        false
    );
$$;

-- 3. Remove the now-orphaned duplicate column.
ALTER TABLE public.profiles DROP COLUMN is_platform_admin;
