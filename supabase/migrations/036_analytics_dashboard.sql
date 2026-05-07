-- get_analytics_dashboard: backs the /api/analytics endpoint that powers the
-- analytics page. Returns one jsonb blob with KPI tiles (current + previous
-- period), a revenue trend bucketed by week or month, the top 10 active jobs
-- by margin amount, and a current AR aging snapshot.
--
-- All totals are tenant-scoped via p_tenant_id. The function is SECURITY
-- DEFINER but the API route is the only caller and always passes the
-- authenticated user's tenant_id from withAuth context.

CREATE OR REPLACE FUNCTION get_analytics_dashboard(
    p_tenant_id     uuid,
    p_period_start  date,
    p_period_end    date,
    p_prev_start    date,
    p_prev_end      date,
    p_granularity   text   -- 'week' | 'month'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue_curr   numeric;
  v_total_revenue_prev   numeric;
  v_cash_collected_curr  numeric;
  v_cash_collected_prev  numeric;
  v_outstanding_ar       numeric;
  v_expenses_curr        numeric;
  v_expenses_prev        numeric;
  v_active_jobs          integer;
  v_revenue_chart        jsonb;
  v_job_profitability    jsonb;
  v_ar_aging             jsonb;
  v_today                date := current_date;
  v_interval             interval;
BEGIN
  IF p_granularity NOT IN ('week', 'month') THEN
    RAISE EXCEPTION 'p_granularity must be week or month';
  END IF;

  v_interval := CASE WHEN p_granularity = 'week' THEN interval '1 week' ELSE interval '1 month' END;

  -- ── KPIs ────────────────────────────────────────────────────────────────

  SELECT coalesce(sum(total), 0)
    INTO v_total_revenue_curr
    FROM invoices
   WHERE tenant_id = p_tenant_id
     AND type = 'ACCREC'
     AND status IN ('paid', 'authorised', 'submitted')
     AND issue_date BETWEEN p_period_start AND p_period_end;

  SELECT coalesce(sum(total), 0)
    INTO v_total_revenue_prev
    FROM invoices
   WHERE tenant_id = p_tenant_id
     AND type = 'ACCREC'
     AND status IN ('paid', 'authorised', 'submitted')
     AND issue_date BETWEEN p_prev_start AND p_prev_end;

  SELECT coalesce(sum(amount_paid), 0)
    INTO v_cash_collected_curr
    FROM invoices
   WHERE tenant_id = p_tenant_id
     AND type = 'ACCREC'
     AND issue_date BETWEEN p_period_start AND p_period_end;

  SELECT coalesce(sum(amount_paid), 0)
    INTO v_cash_collected_prev
    FROM invoices
   WHERE tenant_id = p_tenant_id
     AND type = 'ACCREC'
     AND issue_date BETWEEN p_prev_start AND p_prev_end;

  SELECT coalesce(sum(amount_due), 0)
    INTO v_outstanding_ar
    FROM invoices
   WHERE tenant_id = p_tenant_id
     AND type = 'ACCREC'
     AND status NOT IN ('paid', 'voided');

  WITH r AS (
    SELECT coalesce(sum(amount), 0) AS s FROM receipts
     WHERE tenant_id = p_tenant_id
       AND receipt_date BETWEEN p_period_start AND p_period_end
  ),
  po AS (
    SELECT coalesce(sum(total_amount), 0) AS s FROM purchase_orders
     WHERE tenant_id = p_tenant_id
       AND created_at::date BETWEEN p_period_start AND p_period_end
  ),
  lab AS (
    SELECT coalesce(sum(extract(epoch from (t.end_at - t.start_at)) / 3600.0 * coalesce(p.hourly_rate, 0)), 0) AS s
      FROM timesheets t
      JOIN profiles p ON p.id = t.user_id
     WHERE t.tenant_id = p_tenant_id
       AND t.end_at IS NOT NULL
       AND t.start_at::date BETWEEN p_period_start AND p_period_end
  )
  SELECT (SELECT s FROM r) + (SELECT s FROM po) + (SELECT s FROM lab)
    INTO v_expenses_curr;

  WITH r AS (
    SELECT coalesce(sum(amount), 0) AS s FROM receipts
     WHERE tenant_id = p_tenant_id
       AND receipt_date BETWEEN p_prev_start AND p_prev_end
  ),
  po AS (
    SELECT coalesce(sum(total_amount), 0) AS s FROM purchase_orders
     WHERE tenant_id = p_tenant_id
       AND created_at::date BETWEEN p_prev_start AND p_prev_end
  ),
  lab AS (
    SELECT coalesce(sum(extract(epoch from (t.end_at - t.start_at)) / 3600.0 * coalesce(p.hourly_rate, 0)), 0) AS s
      FROM timesheets t
      JOIN profiles p ON p.id = t.user_id
     WHERE t.tenant_id = p_tenant_id
       AND t.end_at IS NOT NULL
       AND t.start_at::date BETWEEN p_prev_start AND p_prev_end
  )
  SELECT (SELECT s FROM r) + (SELECT s FROM po) + (SELECT s FROM lab)
    INTO v_expenses_prev;

  SELECT count(*)
    INTO v_active_jobs
    FROM jobs
   WHERE tenant_id = p_tenant_id
     AND archived_at IS NULL
     AND lower(coalesce(status, '')) NOT IN ('completed', 'cancelled');

  -- ── Revenue trend ─────────────────────────────────────────────────────

  WITH series AS (
    SELECT generate_series(
      date_trunc(p_granularity, p_period_start::timestamp),
      date_trunc(p_granularity, p_period_end::timestamp),
      v_interval
    ) AS bucket_start
  ),
  invoiced AS (
    SELECT date_trunc(p_granularity, issue_date::timestamp) AS bucket,
           sum(total)              AS revenue,
           count(DISTINCT job_id)  AS jobs
      FROM invoices
     WHERE tenant_id = p_tenant_id
       AND type = 'ACCREC'
       AND status IN ('paid', 'authorised', 'submitted')
       AND issue_date BETWEEN p_period_start AND p_period_end
     GROUP BY 1
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'start',   to_char(s.bucket_start, 'YYYY-MM-DD'),
           'revenue', coalesce(i.revenue, 0),
           'jobs',    coalesce(i.jobs, 0)
         ) ORDER BY s.bucket_start), '[]'::jsonb)
    INTO v_revenue_chart
    FROM series s
    LEFT JOIN invoiced i ON i.bucket = s.bucket_start;

  -- ── Job profitability (active jobs, all-time totals, top 10 by margin) ─

  WITH job_inv AS (
    SELECT job_id, sum(total) AS revenue
      FROM invoices
     WHERE tenant_id = p_tenant_id
       AND type = 'ACCREC'
       AND status IN ('paid', 'authorised', 'submitted')
       AND job_id IS NOT NULL
     GROUP BY job_id
  ),
  job_rcpts AS (
    SELECT job_id, sum(amount) AS amount
      FROM receipts
     WHERE tenant_id = p_tenant_id
       AND job_id IS NOT NULL
     GROUP BY job_id
  ),
  job_pos AS (
    SELECT job_id, sum(total_amount) AS amount
      FROM purchase_orders
     WHERE tenant_id = p_tenant_id
       AND job_id IS NOT NULL
     GROUP BY job_id
  ),
  job_labour AS (
    SELECT t.job_id,
           sum(extract(epoch from (t.end_at - t.start_at)) / 3600.0 * coalesce(p.hourly_rate, 0)) AS amount
      FROM timesheets t
      JOIN profiles p ON p.id = t.user_id
     WHERE t.tenant_id = p_tenant_id
       AND t.end_at IS NOT NULL
       AND t.job_id IS NOT NULL
     GROUP BY t.job_id
  ),
  job_rows AS (
    SELECT j.id,
           j.job_title,
           coalesce(j.status, '')               AS status,
           coalesce(j.paid_status, 'not_paid')  AS paid_status,
           coalesce(j.amount, 0)                AS quoted,
           coalesce(ji.revenue, 0)              AS revenue,
           coalesce(jr.amount, 0) + coalesce(jp.amount, 0) + coalesce(jl.amount, 0) AS expenses
      FROM jobs j
      LEFT JOIN job_inv    ji ON ji.job_id = j.id
      LEFT JOIN job_rcpts  jr ON jr.job_id = j.id
      LEFT JOIN job_pos    jp ON jp.job_id = j.id
      LEFT JOIN job_labour jl ON jl.job_id = j.id
     WHERE j.tenant_id = p_tenant_id
       AND j.archived_at IS NULL
       AND lower(coalesce(j.status, '')) NOT IN ('completed', 'cancelled')
  ),
  top10 AS (
    SELECT * FROM job_rows
     ORDER BY (revenue - expenses) DESC NULLS LAST
     LIMIT 10
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id',           id,
           'jobTitle',     job_title,
           'status',       status,
           'quoted',       quoted,
           'revenue',      revenue,
           'expenses',     expenses,
           'marginAmount', revenue - expenses,
           'marginPct',    CASE WHEN revenue > 0 THEN ((revenue - expenses) / revenue * 100) ELSE 0 END,
           'paidStatus',   paid_status
         ) ORDER BY (revenue - expenses) DESC NULLS LAST), '[]'::jsonb)
    INTO v_job_profitability
    FROM top10;

  -- ── AR aging snapshot ────────────────────────────────────────────────

  WITH unpaid AS (
    SELECT amount_due, due_date
      FROM invoices
     WHERE tenant_id = p_tenant_id
       AND type = 'ACCREC'
       AND status NOT IN ('paid', 'voided')
       AND due_date IS NOT NULL
  )
  SELECT jsonb_build_object(
           'current',  coalesce(sum(amount_due) FILTER (WHERE due_date >= v_today), 0),
           'd1_30',    coalesce(sum(amount_due) FILTER (WHERE due_date < v_today AND v_today - due_date BETWEEN 1 AND 30), 0),
           'd31_60',   coalesce(sum(amount_due) FILTER (WHERE v_today - due_date BETWEEN 31 AND 60), 0),
           'd61_90',   coalesce(sum(amount_due) FILTER (WHERE v_today - due_date BETWEEN 61 AND 90), 0),
           'd90_plus', coalesce(sum(amount_due) FILTER (WHERE v_today - due_date > 90), 0)
         )
    INTO v_ar_aging
    FROM unpaid;

  -- ── Assemble ──────────────────────────────────────────────────────────

  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'start',       to_char(p_period_start, 'YYYY-MM-DD'),
      'end',         to_char(p_period_end, 'YYYY-MM-DD'),
      'granularity', p_granularity
    ),
    'kpis', jsonb_build_object(
      'totalRevenue',  jsonb_build_object('current', v_total_revenue_curr,  'previous', v_total_revenue_prev),
      'cashCollected', jsonb_build_object('current', v_cash_collected_curr, 'previous', v_cash_collected_prev),
      'outstandingAR', jsonb_build_object('current', v_outstanding_ar),
      'totalExpenses', jsonb_build_object('current', v_expenses_curr,       'previous', v_expenses_prev),
      'activeJobs',    jsonb_build_object('current', v_active_jobs)
    ),
    'revenueChart',     v_revenue_chart,
    'jobProfitability', v_job_profitability,
    'arAging',          v_ar_aging
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_dashboard(uuid, date, date, date, date, text) TO authenticated;
