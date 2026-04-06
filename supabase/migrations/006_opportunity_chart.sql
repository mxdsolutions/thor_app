-- get_opportunity_chart_data: Returns 12 months of opportunity created/won counts
-- in a single query, replacing 24 individual queries from the application layer.

CREATE OR REPLACE FUNCTION get_opportunity_chart_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(
    jsonb_build_object('month', month, 'total', total, 'won', won)
    ORDER BY month_start
  ), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      gs AS month_start,
      to_char(gs, 'Mon YY') AS month,
      (SELECT count(*) FROM opportunities
        WHERE tenant_id = p_tenant_id
          AND created_at >= gs
          AND created_at < gs + interval '1 month'
      ) AS total,
      (SELECT count(*) FROM opportunities
        WHERE tenant_id = p_tenant_id
          AND stage = 'closed_won'
          AND updated_at >= gs
          AND updated_at < gs + interval '1 month'
      ) AS won
    FROM generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS gs
  ) sub;

  RETURN result;
END;
$$;
