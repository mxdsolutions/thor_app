-- recalc_quote_total and recalc_purchase_order_total run as SECURITY DEFINER
-- with no tenant check, meaning any authenticated user knowing a UUID can
-- trigger a recalc on a quote/PO in any other tenant. The mutation is
-- bounded (it only rewrites total_amount), but it's still cross-tenant
-- write access. Add an explicit tenant guard.

CREATE OR REPLACE FUNCTION public.recalc_quote_total(p_quote_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric;
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM quotes
         WHERE id = p_quote_id
           AND (tenant_id = get_user_tenant_id() OR is_platform_admin())
    ) THEN
        RAISE EXCEPTION 'Quote not found or access denied'
            USING ERRCODE = '42501';
    END IF;

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

CREATE OR REPLACE FUNCTION public.recalc_purchase_order_total(p_po_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric;
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM purchase_orders
         WHERE id = p_po_id
           AND (tenant_id = get_user_tenant_id() OR is_platform_admin())
    ) THEN
        RAISE EXCEPTION 'Purchase order not found or access denied'
            USING ERRCODE = '42501';
    END IF;

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
