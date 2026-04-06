-- Add reference_prefix to tenants for auto-generating reference IDs
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reference_prefix text;

-- Add reference_id to opportunities (created at lead stage)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS reference_id text;

-- Add reference_id to jobs (carried through from opportunity on conversion)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reference_id text;

-- Unique per tenant (partial index allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_ref_tenant
  ON opportunities(tenant_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_ref_tenant
  ON jobs(tenant_id, reference_id)
  WHERE reference_id IS NOT NULL;
