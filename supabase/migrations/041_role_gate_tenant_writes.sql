-- Defense-in-depth role gates at the RLS layer. The API layer already gates
-- membership/invite/license mutations behind requirePermission(), but RLS was
-- only checking tenant isolation — meaning a Viewer with a valid JWT could in
-- theory hit PostgREST directly and self-promote, invite arbitrary owners, or
-- mutate licenses.
--
-- Also codifies get_user_tenant_id() — it lives in production but never made
-- it into a versioned migration (referenced from 014/019/026/027 without a
-- prior CREATE). Captured here so a clean re-apply doesn't break.

-- ---------- get_user_tenant_id (codify existing) ----------
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid,
        (SELECT tenant_id FROM public.tenant_memberships
         WHERE user_id = auth.uid()
         LIMIT 1)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;

-- ---------- tenant_memberships ----------
-- Only owners and admins may add, remove, or change membership roles. SELECT
-- stays open to all tenant members so the user list, sidesheets, etc. work.
DROP POLICY IF EXISTS membership_insert ON public.tenant_memberships;
DROP POLICY IF EXISTS membership_update ON public.tenant_memberships;
DROP POLICY IF EXISTS membership_delete ON public.tenant_memberships;
DROP POLICY IF EXISTS tenant_memberships_insert ON public.tenant_memberships;
DROP POLICY IF EXISTS tenant_memberships_update ON public.tenant_memberships;
DROP POLICY IF EXISTS tenant_memberships_delete ON public.tenant_memberships;

CREATE POLICY membership_insert ON public.tenant_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

CREATE POLICY membership_update ON public.tenant_memberships
    FOR UPDATE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    )
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

CREATE POLICY membership_delete ON public.tenant_memberships
    FOR DELETE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

-- ---------- tenant_invites ----------
-- Same gate. Server actions use the service-role admin client (which bypasses
-- RLS), but a raw PostgREST call from a Viewer should not be able to create
-- or revoke invites.
DROP POLICY IF EXISTS invites_insert ON public.tenant_invites;
DROP POLICY IF EXISTS invites_update ON public.tenant_invites;
DROP POLICY IF EXISTS invites_delete ON public.tenant_invites;

CREATE POLICY invites_insert ON public.tenant_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

CREATE POLICY invites_update ON public.tenant_invites
    FOR UPDATE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    )
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

CREATE POLICY invites_delete ON public.tenant_invites
    FOR DELETE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin')
        )
        OR is_platform_admin()
    );

-- ---------- tenant_licenses ----------
-- Existing policies use a profiles.tenant_id subquery instead of the standard
-- get_user_tenant_id() helper; replace them with the standard pattern and add
-- a role gate (write/delete -> owner/admin/manager — managers can issue ops
-- licenses but not membership changes).
DROP POLICY IF EXISTS "Tenant members can view licenses" ON public.tenant_licenses;
DROP POLICY IF EXISTS "Tenant members can insert licenses" ON public.tenant_licenses;
DROP POLICY IF EXISTS "Tenant members can update licenses" ON public.tenant_licenses;
DROP POLICY IF EXISTS "Tenant members can delete licenses" ON public.tenant_licenses;

CREATE POLICY tenant_licenses_select ON public.tenant_licenses
    FOR SELECT TO authenticated
    USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_licenses_insert ON public.tenant_licenses
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin', 'manager')
        )
        OR is_platform_admin()
    );

CREATE POLICY tenant_licenses_update ON public.tenant_licenses
    FOR UPDATE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin', 'manager')
        )
        OR is_platform_admin()
    )
    WITH CHECK (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin', 'manager')
        )
        OR is_platform_admin()
    );

CREATE POLICY tenant_licenses_delete ON public.tenant_licenses
    FOR DELETE TO authenticated
    USING (
        (
            tenant_id = get_user_tenant_id()
            AND current_user_tenant_role(tenant_id) IN ('owner', 'admin', 'manager')
        )
        OR is_platform_admin()
    );
