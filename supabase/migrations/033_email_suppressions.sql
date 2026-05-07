-- ============================================================================
-- 033_email_suppressions.sql
-- Suppression list for Resend bounce / complaint events.
--
-- When Resend reports a bounced or complained address, we record it here so
-- we can stop sending to it. Without this, sender reputation degrades and
-- legitimate emails start landing in spam.
--
-- This is a global suppression list, not tenant-scoped — a hard bounce for
-- a recipient is a property of that mailbox, not of the tenant who tried
-- to mail it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_suppressions (
    email text PRIMARY KEY,
    reason text NOT NULL CHECK (reason IN ('bounced', 'complained', 'delivery_delayed')),
    first_seen_at timestamptz NOT NULL DEFAULT NOW(),
    last_seen_at timestamptz NOT NULL DEFAULT NOW(),
    occurrences integer NOT NULL DEFAULT 1,
    -- Last raw event payload for debugging.
    last_payload jsonb
);

CREATE INDEX IF NOT EXISTS email_suppressions_reason_idx
    ON email_suppressions (reason);

-- No RLS: this table is consulted only via service-role from the send path
-- and the webhook handler. Authenticated users have no business reading it.
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
