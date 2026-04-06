-- ============================================================================
-- 007_rename_opportunities_to_leads.sql
-- Drop the old leads table, rename opportunities → leads
-- ============================================================================

-- 1. Drop the old leads table (cascade removes FKs pointing to it)
DROP TABLE IF EXISTS leads CASCADE;

-- 2. Drop old RLS policies on opportunities (they reference the old name)
DROP POLICY IF EXISTS "opportunities_select" ON opportunities;
DROP POLICY IF EXISTS "opportunities_insert" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update" ON opportunities;
DROP POLICY IF EXISTS "opportunities_delete" ON opportunities;

-- 3. Rename the opportunities table to leads
ALTER TABLE opportunities RENAME TO leads;

-- 4. Rename the opportunity_line_items table
ALTER TABLE opportunity_line_items RENAME TO lead_line_items;

-- 5. Rename columns that reference opportunities
ALTER TABLE leads RENAME COLUMN lead_id TO legacy_lead_id;
-- Drop the legacy FK column (pointed to old leads table, now gone)
ALTER TABLE leads DROP COLUMN IF EXISTS legacy_lead_id;

-- Rename opportunity_id columns on related tables
ALTER TABLE jobs RENAME COLUMN opportunity_id TO lead_id;
ALTER TABLE lead_line_items RENAME COLUMN opportunity_id TO lead_id;

-- 6. Create new RLS policies on leads (renamed table)
CREATE POLICY "leads_select" ON leads
  FOR SELECT TO authenticated
  USING (tenant_id = active_tenant_id());

CREATE POLICY "leads_insert" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = active_tenant_id());

CREATE POLICY "leads_update" ON leads
  FOR UPDATE TO authenticated
  USING (tenant_id = active_tenant_id())
  WITH CHECK (tenant_id = active_tenant_id());

CREATE POLICY "leads_delete" ON leads
  FOR DELETE TO authenticated
  USING (tenant_id = active_tenant_id());

-- 7. Update RLS policies on lead_line_items
DROP POLICY IF EXISTS "opportunity_line_items_select" ON lead_line_items;
DROP POLICY IF EXISTS "opportunity_line_items_insert" ON lead_line_items;
DROP POLICY IF EXISTS "opportunity_line_items_update" ON lead_line_items;
DROP POLICY IF EXISTS "opportunity_line_items_delete" ON lead_line_items;

CREATE POLICY "lead_line_items_select" ON lead_line_items
  FOR SELECT TO authenticated
  USING (tenant_id = active_tenant_id());

CREATE POLICY "lead_line_items_insert" ON lead_line_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = active_tenant_id());

CREATE POLICY "lead_line_items_update" ON lead_line_items
  FOR UPDATE TO authenticated
  USING (tenant_id = active_tenant_id())
  WITH CHECK (tenant_id = active_tenant_id());

CREATE POLICY "lead_line_items_delete" ON lead_line_items
  FOR DELETE TO authenticated
  USING (tenant_id = active_tenant_id());

-- 8. Update tenant_status_configs: merge opportunity → lead
DELETE FROM tenant_status_configs WHERE entity_type = 'lead';
UPDATE tenant_status_configs SET entity_type = 'lead' WHERE entity_type = 'opportunity';

-- Update the CHECK constraint
ALTER TABLE tenant_status_configs DROP CONSTRAINT IF EXISTS tenant_status_configs_entity_type_check;
ALTER TABLE tenant_status_configs ADD CONSTRAINT tenant_status_configs_entity_type_check
  CHECK (entity_type IN ('lead', 'job'));

-- 9. Update tenant_modules: remove old crm.opportunities, keep crm.leads
DELETE FROM tenant_modules WHERE module_id = 'crm.opportunities';
DELETE FROM tenant_modules WHERE module_id = 'crm.overview';
DELETE FROM tenant_modules WHERE module_id = 'operations.overview';

-- 10. Update get_tenant_stats function to use leads table
CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH
    user_stats AS (
      SELECT
        count(*) AS total_users,
        count(*) FILTER (WHERE p.created_at >= now() - interval '30 days') AS new_users
      FROM profiles p
      JOIN tenant_memberships tm ON tm.user_id = p.id AND tm.tenant_id = p_tenant_id
    ),
    project_stats AS (
      SELECT
        count(*) AS total_projects,
        count(*) FILTER (WHERE status != 'completed') AS active_projects
      FROM projects WHERE tenant_id = p_tenant_id
    ),
    job_stats AS (
      SELECT
        count(*) AS total_jobs,
        count(*) FILTER (WHERE status NOT IN ('Completed','Cancelled','cancelled','completed')) AS active_jobs,
        coalesce(sum(amount) FILTER (WHERE status IN ('completed','Completed')), 0) AS total_revenue
      FROM jobs WHERE tenant_id = p_tenant_id
    ),
    lead_stats AS (
      SELECT
        count(*) AS total_leads,
        coalesce(sum(value) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0) AS pipeline_value,
        coalesce(sum(value) FILTER (WHERE stage = 'closed_won' AND updated_at >= date_trunc('month', now())), 0) AS won_revenue_this_month
      FROM leads WHERE tenant_id = p_tenant_id
    ),
    company_stats AS (
      SELECT count(*) AS total_companies FROM companies WHERE tenant_id = p_tenant_id
    ),
    contact_stats AS (
      SELECT count(*) AS total_contacts FROM contacts WHERE tenant_id = p_tenant_id
    )
  SELECT jsonb_build_object(
    'totalUsers', (SELECT total_users FROM user_stats),
    'newUsers', (SELECT new_users FROM user_stats),
    'totalProjects', (SELECT total_projects FROM project_stats),
    'activeProjects', (SELECT active_projects FROM project_stats),
    'totalJobs', (SELECT total_jobs FROM job_stats),
    'activeJobs', (SELECT active_jobs FROM job_stats),
    'totalRevenue', (SELECT total_revenue FROM job_stats),
    'totalLeads', (SELECT total_leads FROM lead_stats),
    'pipelineValue', (SELECT pipeline_value FROM lead_stats),
    'wonRevenueThisMonth', (SELECT won_revenue_this_month FROM lead_stats),
    'totalCompanies', (SELECT total_companies FROM company_stats),
    'totalContacts', (SELECT total_contacts FROM contact_stats)
  ) INTO result;

  RETURN result;
END;
$$;

-- 11. Update get_opportunity_chart_data → get_lead_chart_data
DROP FUNCTION IF EXISTS get_opportunity_chart_data(uuid);

CREATE OR REPLACE FUNCTION get_lead_chart_data(p_tenant_id uuid)
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
      (SELECT count(*) FROM leads
        WHERE tenant_id = p_tenant_id
          AND created_at >= gs
          AND created_at < gs + interval '1 month'
      ) AS total,
      (SELECT count(*) FROM leads
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
