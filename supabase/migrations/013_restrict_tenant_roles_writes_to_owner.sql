-- Phase 2 / T7 of the permissions revamp. Previously any tenant member
-- (including viewers) could write to tenant_roles via the browser supabase
-- client. Restricts INSERT/UPDATE/DELETE to the tenant owner; SELECT stays
-- open so all members can read role configs via useTenant() / usePermission().
CREATE OR REPLACE FUNCTION public.current_user_tenant_role(p_tenant uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND tenant_id = p_tenant
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_tenant_role(uuid) TO authenticated;

DROP POLICY IF EXISTS roles_insert ON public.tenant_roles;
DROP POLICY IF EXISTS roles_update ON public.tenant_roles;
DROP POLICY IF EXISTS roles_delete ON public.tenant_roles;

CREATE POLICY roles_insert ON public.tenant_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND current_user_tenant_role(tenant_id) = 'owner'
    );

CREATE POLICY roles_update ON public.tenant_roles
    FOR UPDATE TO authenticated
    USING (
        tenant_id = get_user_tenant_id()
        AND current_user_tenant_role(tenant_id) = 'owner'
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND current_user_tenant_role(tenant_id) = 'owner'
    );

CREATE POLICY roles_delete ON public.tenant_roles
    FOR DELETE TO authenticated
    USING (
        tenant_id = get_user_tenant_id()
        AND current_user_tenant_role(tenant_id) = 'owner'
    );
