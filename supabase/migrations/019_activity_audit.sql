-- 019_activity_audit.sql
-- Comprehensive activity tracking for jobs and their related entities.
-- See docs/plans/activity_audit_2026-05-06/PLAN.md for context.
--
-- This migration installs Postgres triggers that write to the existing
-- `activity_logs` table on every INSERT / UPDATE / DELETE for the tables
-- relevant to a job's activity feed. It also installs `get_job_activity(uuid)`
-- which returns a unioned, ordered feed of all events scoped to a single job.

-- ---------------------------------------------------------------------------
-- Generic trigger function
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can INSERT into activity_logs even when the caller's
-- tenant context is null (service role / cron). The function still records
-- auth.uid() faithfully — that comes from the request JWT, not the function's
-- security mode.

CREATE OR REPLACE FUNCTION log_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entity_type text := TG_ARGV[0];
    v_entity_id uuid;
    v_tenant_id uuid;
    v_action text;
    v_changes jsonb := '{}'::jsonb;
    v_field text;
    v_old_val jsonb;
    v_new_val jsonb;
    v_old_jsonb jsonb;
    v_new_jsonb jsonb;
    -- Columns excluded from diffs (noisy or irrelevant)
    v_ignored text[] := ARRAY['id','created_at','updated_at','tenant_id','created_by'];
BEGIN
    -- Allow bulk migrations / backfills to bypass auditing
    IF current_setting('audit.skip', true) = 'on' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_entity_id := (NEW.id)::uuid;
        v_tenant_id := (NEW.tenant_id)::uuid;
        v_changes := NULL;

    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'updated';
        v_entity_id := (NEW.id)::uuid;
        v_tenant_id := (NEW.tenant_id)::uuid;
        v_old_jsonb := to_jsonb(OLD);
        v_new_jsonb := to_jsonb(NEW);

        FOR v_field, v_new_val IN SELECT * FROM jsonb_each(v_new_jsonb)
        LOOP
            IF v_field = ANY(v_ignored) THEN
                CONTINUE;
            END IF;
            v_old_val := v_old_jsonb -> v_field;
            IF v_old_val IS DISTINCT FROM v_new_val THEN
                v_changes := v_changes || jsonb_build_object(
                    v_field,
                    jsonb_build_object('old', v_old_val, 'new', v_new_val)
                );
            END IF;
        END LOOP;

        -- No-op update: skip writing a log entry.
        IF v_changes = '{}'::jsonb THEN
            RETURN NEW;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_entity_id := (OLD.id)::uuid;
        v_tenant_id := (OLD.tenant_id)::uuid;
        v_old_jsonb := to_jsonb(OLD);

        FOR v_field, v_old_val IN SELECT * FROM jsonb_each(v_old_jsonb)
        LOOP
            IF v_field = ANY(v_ignored) THEN
                CONTINUE;
            END IF;
            v_changes := v_changes || jsonb_build_object(
                v_field,
                jsonb_build_object('old', v_old_val, 'new', NULL)
            );
        END LOOP;
    END IF;

    INSERT INTO activity_logs (
        entity_type, entity_id, action, changes, performed_by, tenant_id
    ) VALUES (
        v_entity_type, v_entity_id, v_action, v_changes, auth.uid(), v_tenant_id
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION log_activity_change() IS
  'Generic audit trigger. Pass the entity_type as TG_ARGV[0]. Set audit.skip=on to bypass.';

-- ---------------------------------------------------------------------------
-- Per-table triggers
-- ---------------------------------------------------------------------------
-- Order matches PLAN.md. Each trigger fires AFTER so the row is committed
-- before the audit row is written.

DROP TRIGGER IF EXISTS audit_jobs ON public.jobs;
CREATE TRIGGER audit_jobs
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION log_activity_change('job');

DROP TRIGGER IF EXISTS audit_quotes ON public.quotes;
CREATE TRIGGER audit_quotes
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION log_activity_change('quote');

DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION log_activity_change('invoice');

DROP TRIGGER IF EXISTS audit_reports ON public.reports;
CREATE TRIGGER audit_reports
AFTER INSERT OR UPDATE OR DELETE ON public.reports
FOR EACH ROW EXECUTE FUNCTION log_activity_change('report');

DROP TRIGGER IF EXISTS audit_job_schedule_entries ON public.job_schedule_entries;
CREATE TRIGGER audit_job_schedule_entries
AFTER INSERT OR UPDATE OR DELETE ON public.job_schedule_entries
FOR EACH ROW EXECUTE FUNCTION log_activity_change('job_schedule_entry');

DROP TRIGGER IF EXISTS audit_job_assignees ON public.job_assignees;
CREATE TRIGGER audit_job_assignees
AFTER INSERT OR UPDATE OR DELETE ON public.job_assignees
FOR EACH ROW EXECUTE FUNCTION log_activity_change('job_assignee');

DROP TRIGGER IF EXISTS audit_job_line_items ON public.job_line_items;
CREATE TRIGGER audit_job_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.job_line_items
FOR EACH ROW EXECUTE FUNCTION log_activity_change('job_line_item');

DROP TRIGGER IF EXISTS audit_quote_line_items ON public.quote_line_items;
CREATE TRIGGER audit_quote_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.quote_line_items
FOR EACH ROW EXECUTE FUNCTION log_activity_change('quote_line_item');

DROP TRIGGER IF EXISTS audit_quote_sections ON public.quote_sections;
CREATE TRIGGER audit_quote_sections
AFTER INSERT OR UPDATE OR DELETE ON public.quote_sections
FOR EACH ROW EXECUTE FUNCTION log_activity_change('quote_section');

DROP TRIGGER IF EXISTS audit_invoice_line_items ON public.invoice_line_items;
CREATE TRIGGER audit_invoice_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION log_activity_change('invoice_line_item');

-- ---------------------------------------------------------------------------
-- Aggregated feed: all events for a job + descendants
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (default). Tenant isolation is enforced by both the
-- explicit `active_tenant_id()` filter AND the RLS policy on activity_logs.

CREATE OR REPLACE FUNCTION get_job_activity(p_job_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE (
    id uuid,
    entity_type text,
    entity_id uuid,
    action text,
    changes jsonb,
    performed_by uuid,
    tenant_id uuid,
    created_at timestamptz,
    performer_full_name text,
    performer_email text
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        a.id,
        a.entity_type,
        a.entity_id,
        a.action,
        a.changes,
        a.performed_by,
        a.tenant_id,
        a.created_at,
        p.full_name AS performer_full_name,
        p.email     AS performer_email
    FROM activity_logs a
    LEFT JOIN profiles p ON p.id = a.performed_by
    WHERE a.tenant_id = get_user_tenant_id()
      AND (
            (a.entity_type = 'job' AND a.entity_id = p_job_id)

         OR (a.entity_type = 'quote'
             AND a.entity_id IN (SELECT id FROM quotes WHERE job_id = p_job_id))

         OR (a.entity_type = 'invoice'
             AND a.entity_id IN (SELECT id FROM invoices WHERE job_id = p_job_id))

         OR (a.entity_type = 'report'
             AND a.entity_id IN (SELECT id FROM reports WHERE job_id = p_job_id))

         OR (a.entity_type = 'job_schedule_entry'
             AND a.entity_id IN (SELECT id FROM job_schedule_entries WHERE job_id = p_job_id))

         OR (a.entity_type = 'job_assignee'
             AND a.entity_id IN (SELECT id FROM job_assignees WHERE job_id = p_job_id))

         OR (a.entity_type = 'job_line_item'
             AND a.entity_id IN (SELECT id FROM job_line_items WHERE job_id = p_job_id))

         OR (a.entity_type = 'quote_line_item'
             AND a.entity_id IN (
                 SELECT qli.id FROM quote_line_items qli
                 JOIN quotes q ON q.id = qli.quote_id
                 WHERE q.job_id = p_job_id))

         OR (a.entity_type = 'quote_section'
             AND a.entity_id IN (
                 SELECT qs.id FROM quote_sections qs
                 JOIN quotes q ON q.id = qs.quote_id
                 WHERE q.job_id = p_job_id))

         OR (a.entity_type = 'invoice_line_item'
             AND a.entity_id IN (
                 SELECT ili.id FROM invoice_line_items ili
                 JOIN invoices i ON i.id = ili.invoice_id
                 WHERE i.job_id = p_job_id))
      )
    ORDER BY a.created_at DESC
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_job_activity(uuid, int) IS
  'Returns the unioned audit feed for a job (own events + quotes/invoices/reports/appointments/line items/assignees/sections). Tenant-scoped.';
