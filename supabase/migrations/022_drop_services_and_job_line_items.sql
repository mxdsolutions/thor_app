-- Drop the Services feature: the products table (which backed Services), the
-- job_line_items table (dead — had no UI consumers), and the jobs.service_id
-- column. Pricing (materials) lives in its own `pricing` table and is unaffected.
--
-- Also strip the `ops.services` key from each tenant role's `permissions` JSONB
-- so existing tenants don't carry a dangling permission entry.

ALTER TABLE public.jobs
    DROP COLUMN IF EXISTS service_id;

DROP TABLE IF EXISTS public.job_line_items;
DROP TABLE IF EXISTS public.products;

UPDATE public.tenant_roles
SET permissions = permissions - 'ops.services'
WHERE permissions ? 'ops.services';
