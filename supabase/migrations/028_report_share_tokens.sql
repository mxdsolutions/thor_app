-- ============================================================================
-- 028_report_share_tokens.sql
-- Share-link infrastructure for external (non-authenticated) report completion.
-- ============================================================================
--
-- Lets a tenant user generate a tokenised link to a report that an external
-- party (subcontractor, inspector, prospect) can open without an account,
-- complete the form, and submit. The completed data lands back on the same
-- `reports` row.
--
-- Tenant isolation is enforced two ways:
--   1. RLS for authenticated users (dashboard CRUD).
--   2. The public completion endpoints use createAdminClient() (service role)
--      and resolve the tenant from the token row itself.

CREATE TABLE IF NOT EXISTS report_share_tokens (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 256-bit random, base64url-encoded (~43 chars). Unguessable secret;
    -- stored plaintext — these are short-lived links, not credentials.
    token              text NOT NULL UNIQUE,
    report_id          uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by         uuid NOT NULL REFERENCES auth.users(id),
    recipient_email    text,
    recipient_name     text,
    message            text,
    expires_at         timestamptz NOT NULL,
    first_opened_at    timestamptz,
    submitted_at       timestamptz,
    submitted_by_email text,
    submitted_by_name  text,
    photo_count        integer NOT NULL DEFAULT 0,
    revoked_at         timestamptz,
    revoked_by         uuid REFERENCES auth.users(id),
    email_sent_at      timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rst_report_id ON report_share_tokens(report_id);
CREATE INDEX IF NOT EXISTS idx_rst_tenant_id ON report_share_tokens(tenant_id);
-- Hot path for the public token lookup: live (not revoked, not submitted) tokens.
CREATE INDEX IF NOT EXISTS idx_rst_active
    ON report_share_tokens(token)
    WHERE revoked_at IS NULL AND submitted_at IS NULL;

ALTER TABLE report_share_tokens ENABLE ROW LEVEL SECURITY;

-- This Postgres version doesn't support `CREATE POLICY IF NOT EXISTS`, so each
-- policy is preceded by a defensive DROP for re-runs.
DROP POLICY IF EXISTS "rst_select" ON report_share_tokens;
CREATE POLICY "rst_select" ON report_share_tokens
    FOR SELECT TO authenticated
    USING (tenant_id = active_tenant_id());

DROP POLICY IF EXISTS "rst_insert" ON report_share_tokens;
CREATE POLICY "rst_insert" ON report_share_tokens
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = active_tenant_id());

DROP POLICY IF EXISTS "rst_update" ON report_share_tokens;
CREATE POLICY "rst_update" ON report_share_tokens
    FOR UPDATE TO authenticated
    USING (tenant_id = active_tenant_id())
    WITH CHECK (tenant_id = active_tenant_id());

-- No DELETE policy — soft-revoke via revoked_at.
