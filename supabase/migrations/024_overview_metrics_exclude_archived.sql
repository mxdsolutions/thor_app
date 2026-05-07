-- Patch get_overview_metrics so each bucket excludes archived rows.
-- Archived quotes/invoices/jobs should not contribute to the headline counts
-- and totals on the dashboard overview.

CREATE OR REPLACE FUNCTION get_overview_metrics(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH
    quote_stats AS (
      SELECT
        count(*) AS pending_count,
        coalesce(sum(total_amount), 0) AS pending_amount
      FROM quotes
      WHERE tenant_id = p_tenant_id
        AND archived_at IS NULL
        AND status IN ('draft', 'sent')
    ),
    invoice_stats AS (
      SELECT
        count(*) AS pending_count,
        coalesce(sum(amount_due), 0) AS pending_amount
      FROM invoices
      WHERE tenant_id = p_tenant_id
        AND archived_at IS NULL
        AND status NOT IN ('paid', 'voided')
    ),
    job_stats AS (
      SELECT
        count(*) AS active_count,
        coalesce(sum(amount), 0) AS active_amount
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND archived_at IS NULL
        AND status NOT IN ('Completed', 'Cancelled', 'cancelled', 'completed')
    )
  SELECT jsonb_build_object(
    'pendingQuotes', jsonb_build_object(
      'count', (SELECT pending_count FROM quote_stats),
      'totalAmount', (SELECT pending_amount FROM quote_stats)
    ),
    'pendingInvoices', jsonb_build_object(
      'count', (SELECT pending_count FROM invoice_stats),
      'totalAmount', (SELECT pending_amount FROM invoice_stats)
    ),
    'activeJobs', jsonb_build_object(
      'count', (SELECT active_count FROM job_stats),
      'totalAmount', (SELECT active_amount FROM job_stats)
    )
  )
  INTO result;

  RETURN result;
END;
$$;
