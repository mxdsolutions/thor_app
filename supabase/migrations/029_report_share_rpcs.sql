-- ============================================================================
-- 029_report_share_rpcs.sql
-- Atomic helpers for the report share-token flow.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- mark_share_submission
-- ─────────────────────────────────────────────────────────────────────────
-- Locks the token row, validates it, writes the report data + status in one
-- transaction, and notifies the original creator. Service-role only — the
-- public submit endpoint reaches us via createAdminClient().
--
-- Raises:
--   invalid_token       — no row matches the token
--   token_revoked       — token was revoked
--   token_expired       — past expires_at
--   already_submitted   — submitted_at is already set
--   report_not_found    — report missing or tenant mismatch (defensive)
CREATE OR REPLACE FUNCTION public.mark_share_submission(
    p_token text,
    p_data jsonb,
    p_email text,
    p_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_row report_share_tokens%ROWTYPE;
    v_report_row reports%ROWTYPE;
    v_now timestamptz := now();
BEGIN
    SELECT * INTO v_token_row
      FROM report_share_tokens
     WHERE token = p_token
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_token';
    END IF;

    IF v_token_row.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'token_revoked';
    END IF;

    IF v_token_row.expires_at <= v_now THEN
        RAISE EXCEPTION 'token_expired';
    END IF;

    IF v_token_row.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'already_submitted';
    END IF;

    UPDATE reports
       SET data = p_data,
           status = 'submitted',
           updated_at = v_now
     WHERE id = v_token_row.report_id
       AND tenant_id = v_token_row.tenant_id
    RETURNING * INTO v_report_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'report_not_found';
    END IF;

    UPDATE report_share_tokens
       SET submitted_at = v_now,
           submitted_by_email = p_email,
           submitted_by_name = p_name
     WHERE id = v_token_row.id;

    -- Notify the original creator. RLS on notifications is bypassed by the
    -- service role caller; tenant_id is set explicitly to keep tenant scope.
    IF v_report_row.created_by IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, type, title, body,
            entity_type, entity_id,
            created_by, tenant_id
        ) VALUES (
            v_report_row.created_by,
            'report_submitted_external',
            coalesce(nullif(p_name, ''), nullif(p_email, ''), 'External party')
                || ' submitted ' || v_report_row.title,
            'A shared report has been completed.',
            'report',
            v_report_row.id,
            v_report_row.created_by,
            v_token_row.tenant_id
        );
    END IF;

    RETURN jsonb_build_object(
        'report_id', v_report_row.id,
        'submitted_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_share_submission(text, jsonb, text, text) TO service_role;


-- ─────────────────────────────────────────────────────────────────────────
-- increment_share_photo_count
-- ─────────────────────────────────────────────────────────────────────────
-- Atomic counter for per-token photo-upload caps. Returns the new count, or
-- raises if the token is invalid, expired, revoked, already submitted, or
-- has hit the cap. Used by the public photo-upload endpoint to gate writes
-- before they touch storage.
CREATE OR REPLACE FUNCTION public.increment_share_photo_count(
    p_token text,
    p_max integer DEFAULT 200
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE report_share_tokens
       SET photo_count = photo_count + 1
     WHERE token = p_token
       AND revoked_at IS NULL
       AND submitted_at IS NULL
       AND expires_at > now()
       AND photo_count < p_max
    RETURNING photo_count INTO v_count;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'photo_limit_or_invalid_token';
    END IF;

    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_photo_count(text, integer) TO service_role;
