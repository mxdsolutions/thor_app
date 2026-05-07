-- ============================================================================
-- 030_share_soft_submit.sql
-- "Soft submit" semantics for shared reports.
-- ============================================================================
--
-- Previously: once submitted_at was set, the token was effectively locked —
-- autosave, photo upload, and submit all returned 410. The dashboard user had
-- to revoke + reissue to allow corrections.
--
-- New behaviour: submission is a checkpoint, not a wall. Until the link is
-- revoked or expires, the recipient can keep editing — autosaves go through,
-- photos upload, and re-submission is a no-op on the token row but still
-- updates the report data. The first submission still fires the notification;
-- subsequent edits do not, to avoid spamming the dashboard user.

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
    v_was_first boolean;
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

    v_was_first := v_token_row.submitted_at IS NULL;

    UPDATE reports
       SET data = p_data,
           status = 'submitted',
           updated_at = v_now
     WHERE id = v_token_row.report_id
       AND tenant_id = v_token_row.tenant_id
       AND archived_at IS NULL
    RETURNING * INTO v_report_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'report_not_found';
    END IF;

    IF v_was_first THEN
        UPDATE report_share_tokens
           SET submitted_at = v_now,
               submitted_by_email = p_email,
               submitted_by_name = p_name
         WHERE id = v_token_row.id;

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
    END IF;

    RETURN jsonb_build_object(
        'report_id', v_report_row.id,
        'submitted_at', coalesce(v_token_row.submitted_at, v_now),
        'first_submission', v_was_first
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_share_submission(text, jsonb, text, text) TO service_role;


-- Drop the submitted_at gate from the photo counter — recipients can keep
-- adding/removing photos until the link is revoked or expires.
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
