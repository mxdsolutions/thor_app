-- ============================================================================
-- 020_add_archived_at.sql
-- Add archive support to all business entities.
-- ============================================================================
--
-- Adds a nullable archived_at timestamptz to each in-scope table. When NULL,
-- the row is "active" and visible by default. When set, the row is archived
-- and hidden unless the user explicitly opts in via the list filter.
--
-- A partial index on (tenant_id) WHERE archived_at IS NULL keeps the hot path
-- (the default active list query) fast as archived rows accumulate.
--
-- Tables in scope: jobs, quotes, invoices, reports, contacts, companies,
-- products (services), pricing.
-- Out of scope: leads (table no longer exists), tasks (short lifecycle).
-- ============================================================================

-- jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS jobs_active_tenant_idx
    ON jobs (tenant_id) WHERE archived_at IS NULL;

-- quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS quotes_active_tenant_idx
    ON quotes (tenant_id) WHERE archived_at IS NULL;

-- invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS invoices_active_tenant_idx
    ON invoices (tenant_id) WHERE archived_at IS NULL;

-- reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS reports_active_tenant_idx
    ON reports (tenant_id) WHERE archived_at IS NULL;

-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS contacts_active_tenant_idx
    ON contacts (tenant_id) WHERE archived_at IS NULL;

-- companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS companies_active_tenant_idx
    ON companies (tenant_id) WHERE archived_at IS NULL;

-- products (services)
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS products_active_tenant_idx
    ON products (tenant_id) WHERE archived_at IS NULL;

-- pricing (matrix rows)
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS pricing_active_tenant_idx
    ON pricing (tenant_id) WHERE archived_at IS NULL;
