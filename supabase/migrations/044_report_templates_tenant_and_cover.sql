-- 044_report_templates_tenant_and_cover.sql
--
-- Two new columns on report_templates:
--   tenant_id        — which tenant this template belongs to. Nullable so
--                      legacy / platform-shared templates keep working. New
--                      templates created via the platform admin builder
--                      require a tenant (enforced at the API layer).
--   report_cover_url — optional PDF cover that overrides the tenant default
--                      at PDF-render time. Same shape as tenants.report_cover_url.

ALTER TABLE public.report_templates
    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS report_cover_url text;

-- Index for the common "templates for this tenant" lookup.
CREATE INDEX IF NOT EXISTS report_templates_tenant_id_idx
    ON public.report_templates (tenant_id);

COMMENT ON COLUMN public.report_templates.tenant_id IS
    'Tenant that owns this template. NULL means platform-shared (legacy).';
COMMENT ON COLUMN public.report_templates.report_cover_url IS
    'Optional PDF cover URL that overrides tenants.report_cover_url at render time.';
