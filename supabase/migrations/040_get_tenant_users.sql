-- 040_get_tenant_users.sql
-- Joins tenant_memberships + profiles + auth.users in one call so the users
-- list page can show the real last_sign_in_at. Without this we'd need to
-- either expose the auth schema to PostgREST (broader than we want) or call
-- auth.admin.listUsers() and paginate/filter cross-tenant in JS.
--
-- SECURITY DEFINER lets the function read auth.users while the caller can
-- only invoke it for tenants they're a member of (or as a platform admin).

CREATE OR REPLACE FUNCTION public.get_tenant_users(p_tenant_id uuid)
RETURNS TABLE (
    user_id uuid,
    email text,
    full_name text,
    avatar_url text,
    job_title text,
    hourly_rate numeric,
    profile_created_at timestamptz,
    role text,
    joined_at timestamptz,
    last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_member boolean;
    v_is_platform_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
         WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
    ) INTO v_is_member;

    SELECT COALESCE(
        ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean),
        false
    ) INTO v_is_platform_admin;

    IF NOT v_is_member AND NOT v_is_platform_admin THEN
        RAISE EXCEPTION 'forbidden: not a member of this tenant';
    END IF;

    RETURN QUERY
    SELECT
        m.user_id,
        p.email,
        p.full_name,
        p.avatar_url,
        p.position AS job_title,
        p.hourly_rate,
        p.created_at AS profile_created_at,
        m.role,
        m.joined_at,
        u.last_sign_in_at
    FROM public.tenant_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_users(uuid) IS
  'Returns members of a tenant joined with profile + auth.users.last_sign_in_at. Caller must be a tenant member or platform admin.';

GRANT EXECUTE ON FUNCTION public.get_tenant_users(uuid) TO authenticated;
