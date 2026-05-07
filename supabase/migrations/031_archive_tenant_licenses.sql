-- ============================================================================
-- 031_archive_tenant_licenses.sql
-- Add archive support to tenant_licenses, in line with the soft-delete rule
-- in CLAUDE.md ("no hard deletes for business entities").
-- ============================================================================

ALTER TABLE tenant_licenses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS tenant_licenses_active_tenant_idx
    ON tenant_licenses (tenant_id) WHERE archived_at IS NULL;
