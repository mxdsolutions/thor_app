-- Add job_id to tasks for job-centric task management
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_job ON tasks(job_id);
