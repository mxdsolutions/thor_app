-- 026_fix_get_job_activity.sql
-- Migration 022 dropped `job_line_items` but `get_job_activity` (defined in
-- 019) still references that table, so every call to the function fails with
-- "relation \"job_line_items\" does not exist". This breaks the Activity tab
-- on the Job detail view.
--
-- Recreate the function without the job_line_item branch.

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
