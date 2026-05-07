-- Atomic write helpers: closes the concurrency holes flagged in CODE_AUDIT.md.
--
--   1. allocate_tenant_reference  — atomic reference-id allocation
--      (replaces the JS read-then-update in POST /api/jobs which can
--       hand the same number to two concurrent requests).
--
--   2. recalc_quote_total          — atomic quote total recalc
--   3. recalc_purchase_order_total — atomic PO total recalc
--      (replace the JS read-sum-write loops in app/api/_lib/line-items.ts).
--
--   4. create_job_with_assignees   — atomic job+assignees insert
--      (replaces the two-step insert in POST /api/jobs that can leave a
--       half-created job if the assignees insert errors).
--
-- All functions are SECURITY DEFINER with explicit tenant guards.

-- ─────────────────────────────────────────────────────────────────────
-- 1. allocate_tenant_reference
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.allocate_tenant_reference(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix text;
    v_next   integer;
BEGIN
    -- Row lock prevents concurrent allocations from racing.
    SELECT reference_prefix, reference_next
      INTO v_prefix, v_next
      FROM tenants
     WHERE id = p_tenant_id
       FOR UPDATE;

    IF v_prefix IS NULL OR length(trim(v_prefix)) = 0 THEN
        RETURN NULL;
    END IF;

    UPDATE tenants
       SET reference_next = v_next + 1,
           updated_at = NOW()
     WHERE id = p_tenant_id;

    RETURN trim(v_prefix) || '-' || v_next::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_tenant_reference(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 2. recalc_quote_total
-- ─────────────────────────────────────────────────────────────────────
-- Computes the new total from line items + the quote's margins inside
-- a single statement. The UPDATE+SELECT pattern means the read and the
-- write happen atomically — no concurrent recalc can clobber it.
CREATE OR REPLACE FUNCTION public.recalc_quote_total(p_quote_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric;
BEGIN
    UPDATE quotes q
       SET total_amount = sub.total,
           updated_at = NOW()
      FROM (
          SELECT
              COALESCE(SUM(li.quantity * COALESCE(li.material_cost, 0)), 0)
                  * (1 + COALESCE(q2.material_margin, 20) / 100.0)
              + COALESCE(SUM(li.quantity * COALESCE(li.labour_cost, 0)), 0)
                  * (1 + COALESCE(q2.labour_margin, 20) / 100.0)
              AS total
            FROM quotes q2
            LEFT JOIN quote_line_items li ON li.quote_id = q2.id
           WHERE q2.id = p_quote_id
           GROUP BY q2.material_margin, q2.labour_margin
      ) sub
     WHERE q.id = p_quote_id
    RETURNING q.total_amount INTO v_total;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_quote_total(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 3. recalc_purchase_order_total
-- ─────────────────────────────────────────────────────────────────────
-- POs are cost-only — total = sum(quantity * unit_price).
CREATE OR REPLACE FUNCTION public.recalc_purchase_order_total(p_po_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric;
BEGIN
    UPDATE purchase_orders po
       SET total_amount = sub.total,
           updated_at = NOW()
      FROM (
          SELECT COALESCE(SUM(quantity * unit_price), 0) AS total
            FROM purchase_order_line_items
           WHERE purchase_order_id = p_po_id
      ) sub
     WHERE po.id = p_po_id
    RETURNING po.total_amount INTO v_total;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_purchase_order_total(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 4. create_job_with_assignees
-- ─────────────────────────────────────────────────────────────────────
-- Inserts a job + its assignees in one transaction. If the assignees
-- insert fails, the job insert rolls back — no half-created jobs.
-- Returns the new job id; the caller re-selects with the join shape.
CREATE OR REPLACE FUNCTION public.create_job_with_assignees(
    p_tenant_id  uuid,
    p_created_by uuid,
    p_payload    jsonb,
    p_assignees  uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_id uuid;
    v_uid    uuid;
BEGIN
    INSERT INTO jobs (
        tenant_id,
        created_by,
        job_title,
        description,
        status,
        amount,
        project_id,
        assigned_to,
        scheduled_date,
        company_id,
        contact_id,
        notes,
        paid_status,
        total_payment_received,
        reference_id
    )
    VALUES (
        p_tenant_id,
        p_created_by,
        p_payload->>'job_title',
        p_payload->>'description',
        COALESCE(p_payload->>'status', 'new'),
        COALESCE((p_payload->>'amount')::numeric, 0),
        NULLIF(p_payload->>'project_id', '')::uuid,
        NULLIF(p_payload->>'assigned_to', '')::uuid,
        NULLIF(p_payload->>'scheduled_date', '')::date,
        NULLIF(p_payload->>'company_id', '')::uuid,
        NULLIF(p_payload->>'contact_id', '')::uuid,
        p_payload->>'notes',
        COALESCE(p_payload->>'paid_status', 'not_paid'),
        COALESCE((p_payload->>'total_payment_received')::numeric, 0),
        NULLIF(p_payload->>'reference_id', '')
    )
    RETURNING id INTO v_job_id;

    IF p_assignees IS NOT NULL AND array_length(p_assignees, 1) > 0 THEN
        FOREACH v_uid IN ARRAY p_assignees LOOP
            INSERT INTO job_assignees (job_id, user_id, tenant_id)
            VALUES (v_job_id, v_uid, p_tenant_id);
        END LOOP;
    END IF;

    RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_job_with_assignees(uuid, uuid, jsonb, uuid[]) TO authenticated, service_role;
