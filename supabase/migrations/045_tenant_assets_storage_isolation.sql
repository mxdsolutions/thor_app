-- 045_tenant_assets_storage_isolation.sql
--
-- Close a tenant-isolation gap on the `tenant-assets` storage bucket.
--
-- BEFORE: the four `tenant-assets` policies only checked
--         `auth.role() = 'authenticated'` — any authenticated user could
--         upload / update / delete files under ANY tenant's prefix
--         (`tenant-assets/{ANY_TENANT_ID}/*`), including overwriting another
--         tenant's logo, default report cover, or template cover PDFs.
--
-- AFTER:  writes are gated by the same `(storage.foldername(name))[1] =
--         get_user_tenant_id()::text` pattern the `tenant-files` bucket
--         already uses. Platform admins (is_platform_admin claim) bypass
--         the tenant check so they can manage another tenant's template
--         covers via the platform-admin builder. Public read stays as-is —
--         report PDFs embed logo / cover URLs that need to load for
--         unauthenticated recipients (emailed reports).
--
-- Writes go through `supabase.storage.from('tenant-assets').upload(...)`
-- in cover-upload.ts and app/dashboard/settings/company/branding/page.tsx
-- (logo + default report cover). Both flows pass the user's session, so
-- get_user_tenant_id() resolves correctly.

-- Drop the loose write policies.
DROP POLICY IF EXISTS "tenant_upload" ON storage.objects;
DROP POLICY IF EXISTS "tenant_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_assets_delete" ON storage.objects;
-- Public read policy intentionally kept: `tenant_assets_public_read`.

-- Tenant-isolated INSERT.
CREATE POLICY "tenant-assets: tenant insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (
        (storage.foldername(name))[1] = get_user_tenant_id()::text
        OR coalesce(auth.jwt() -> 'app_metadata' ->> 'is_platform_admin', 'false') = 'true'
    )
);

-- Tenant-isolated UPDATE.
CREATE POLICY "tenant-assets: tenant update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tenant-assets'
    AND (
        (storage.foldername(name))[1] = get_user_tenant_id()::text
        OR coalesce(auth.jwt() -> 'app_metadata' ->> 'is_platform_admin', 'false') = 'true'
    )
)
WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (
        (storage.foldername(name))[1] = get_user_tenant_id()::text
        OR coalesce(auth.jwt() -> 'app_metadata' ->> 'is_platform_admin', 'false') = 'true'
    )
);

-- Tenant-isolated DELETE.
CREATE POLICY "tenant-assets: tenant delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'tenant-assets'
    AND (
        (storage.foldername(name))[1] = get_user_tenant_id()::text
        OR coalesce(auth.jwt() -> 'app_metadata' ->> 'is_platform_admin', 'false') = 'true'
    )
);
