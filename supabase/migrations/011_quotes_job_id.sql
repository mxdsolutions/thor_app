-- Add job_id to quotes for linking quotes to jobs
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_job ON quotes(job_id);
