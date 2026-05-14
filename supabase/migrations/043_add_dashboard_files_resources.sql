-- Adds three new permission resources to existing tenants' role configs:
--   - dashboard.financials  (read)   — controls the overview $ metric cards
--   - analytics.dashboard   (read)   — controls the Analytics page
--   - ops.files             (R/W/D)  — controls the Files page + uploads
--
-- Owner bypasses all checks in code, but the JSONB still needs the keys so the
-- Roles & Permissions editor renders the new toggles. Admin/Manager get the
-- new visibility resources; Member/Viewer don't (they keep ops.files for
-- viewing job attachments but lose financial visibility cards).
--
-- Uses JSONB merge (||) so custom edits made via the role editor survive.

UPDATE tenant_roles
SET permissions = permissions || CASE slug
    WHEN 'owner' THEN '{
        "ops.files": {"read": true, "write": true, "delete": true},
        "dashboard.financials": {"read": true},
        "analytics.dashboard": {"read": true}
    }'::jsonb
    WHEN 'admin' THEN '{
        "ops.files": {"read": true, "write": true, "delete": true},
        "dashboard.financials": {"read": true},
        "analytics.dashboard": {"read": true}
    }'::jsonb
    WHEN 'manager' THEN '{
        "ops.files": {"read": true, "write": true},
        "dashboard.financials": {"read": true},
        "analytics.dashboard": {"read": true}
    }'::jsonb
    WHEN 'member' THEN '{
        "ops.files": {"read": true, "write": true}
    }'::jsonb
    WHEN 'viewer' THEN '{
        "ops.files": {"read": true}
    }'::jsonb
    ELSE '{}'::jsonb
END
WHERE is_system = true
  AND slug IN ('owner', 'admin', 'manager', 'member', 'viewer');
