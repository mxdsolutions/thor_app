-- 039_report_activity_simplified.sql
-- Reports get a dedicated, semantic activity logger. The generic per-column diff
-- (019) was producing unreadable noise on form-data edits — every save wrote a
-- row whose only "change" was the entire JSONB form payload.
--
-- Now: the reports trigger picks an action based on what changed and emits at
-- most one row per UPDATE. The app code adds further semantic events
-- (link_generated, link_sent, link_bounced, submitted) directly.
--
-- Action priority for UPDATE: status_changed > archived/restored > updated.
-- The `changes` jsonb stays minimal; the action label carries the meaning.
--
-- Also: mark_share_submission now suppresses audit writes for its own UPDATE,
-- since the API route emits a richer `submitted` event with submitter metadata.
-- Otherwise every share submit would produce both a trigger row and an app row.

CREATE OR REPLACE FUNCTION log_report_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action text;
    v_changes jsonb := NULL;
BEGIN
    IF current_setting('audit.skip', true) = 'on' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (entity_type, entity_id, action, changes, performed_by, tenant_id)
        VALUES ('report', NEW.id, 'created', NULL, auth.uid(), NEW.tenant_id);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            v_action := 'status_changed';
            v_changes := jsonb_build_object(
                'status', jsonb_build_object('old', OLD.status, 'new', NEW.status)
            );

        ELSIF (OLD.archived_at IS NULL) AND (NEW.archived_at IS NOT NULL) THEN
            v_action := 'archived';

        ELSIF (OLD.archived_at IS NOT NULL) AND (NEW.archived_at IS NULL) THEN
            v_action := 'restored';

        ELSE
            -- Skip rows whose only difference is updated_at — they're silent
            -- side effects (e.g. RPCs that touch the row without changing it).
            IF (to_jsonb(OLD) - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at') THEN
                v_action := 'updated';
            ELSE
                RETURN NEW;
            END IF;
        END IF;

        INSERT INTO activity_logs (entity_type, entity_id, action, changes, performed_by, tenant_id)
        VALUES ('report', NEW.id, v_action, v_changes, auth.uid(), NEW.tenant_id);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_logs (entity_type, entity_id, action, changes, performed_by, tenant_id)
        VALUES ('report', OLD.id, 'deleted', NULL, auth.uid(), OLD.tenant_id);
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION log_report_activity_change() IS
  'Reports-only audit trigger. Emits semantic actions (created/updated/status_changed/archived/restored/deleted). No field-level diffs except for status. Honours audit.skip=on.';

DROP TRIGGER IF EXISTS audit_reports ON public.reports;
CREATE TRIGGER audit_reports
AFTER INSERT OR UPDATE OR DELETE ON public.reports
FOR EACH ROW EXECUTE FUNCTION log_report_activity_change();


-- Suppress trigger writes inside mark_share_submission. The API route writes a
-- richer `submitted` activity row with submitter name/email; the trigger's
-- status_changed/updated would just duplicate it.
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
    PERFORM set_config('audit.skip', 'on', true);

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
