-- Records which onboarding-checklist items a tenant has chosen to skip.
--
-- Completion is computed live from the underlying data (e.g. tenants.logo_url
-- IS NOT NULL means the "Upload a logo" item is complete). The only state
-- that has no other source of truth is "the user explicitly dismissed this
-- item without doing it" — that lives here.
--
-- item_key is intentionally a free-form text rather than an enum so we can
-- add or rename checklist items without a schema change. The set of valid
-- keys is owned by the API layer (app/api/tenant/setup-checklist/items.ts).

CREATE TABLE public.tenant_setup_skips (
    tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    item_key   text NOT NULL,
    skipped_at timestamptz NOT NULL DEFAULT now(),
    skipped_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (tenant_id, item_key)
);

ALTER TABLE public.tenant_setup_skips ENABLE ROW LEVEL SECURITY;

-- Members of the tenant can read which items are skipped (drives the UI badge).
CREATE POLICY tenant_setup_skips_select
    ON public.tenant_setup_skips
    FOR SELECT
    TO authenticated
    USING (tenant_id = active_tenant_id());

-- Only owners can skip / un-skip items. The API layer also enforces this; the
-- policy is defence-in-depth so a non-owner can't write directly to the table.
CREATE POLICY tenant_setup_skips_insert
    ON public.tenant_setup_skips
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = active_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.tenant_memberships
            WHERE tenant_id = active_tenant_id()
              AND user_id = auth.uid()
              AND role = 'owner'
        )
    );

CREATE POLICY tenant_setup_skips_delete
    ON public.tenant_setup_skips
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = active_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.tenant_memberships
            WHERE tenant_id = active_tenant_id()
              AND user_id = auth.uid()
              AND role = 'owner'
        )
    );
