-- ============================================================================
-- 032_atomic_job_assignees_replace.sql
-- Atomic replacement of a job's assignee set (used by PATCH /api/jobs).
--
-- Replaces the previous app-code pattern:
--     await supabase.from("job_assignees").delete().eq("job_id", id);
--     await supabase.from("job_assignees").insert(...);
-- which could leave a job with zero assignees if the second call failed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_job_assignees(
    p_tenant_id uuid,
    p_job_id    uuid,
    p_assignees uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid;
BEGIN
    -- Tenant guard: confirm the job belongs to the caller's tenant.
    IF NOT EXISTS (
        SELECT 1 FROM jobs WHERE id = p_job_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'job not found for tenant';
    END IF;

    DELETE FROM job_assignees
     WHERE job_id = p_job_id
       AND tenant_id = p_tenant_id;

    IF p_assignees IS NOT NULL AND array_length(p_assignees, 1) > 0 THEN
        FOREACH v_uid IN ARRAY p_assignees LOOP
            INSERT INTO job_assignees (job_id, user_id, tenant_id)
            VALUES (p_job_id, v_uid, p_tenant_id);
        END LOOP;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_job_assignees(uuid, uuid, uuid[]) TO authenticated, service_role;
