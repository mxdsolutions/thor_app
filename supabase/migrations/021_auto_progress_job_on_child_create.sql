-- Auto-progress a job from 'new' to 'in_progress' when a quote, invoice, or
-- report is created against it. Idempotent: only fires the UPDATE when the
-- parent job is still in 'new' and not archived. Tenant-scoped for safety.

CREATE OR REPLACE FUNCTION public.auto_progress_job_to_in_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.job_id IS NULL THEN
        RETURN NEW;
    END IF;

    UPDATE public.jobs
    SET status = 'in_progress',
        updated_at = NOW()
    WHERE id = NEW.job_id
      AND tenant_id = NEW.tenant_id
      AND status = 'new'
      AND archived_at IS NULL;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_progress_job_on_quote_insert ON public.quotes;
CREATE TRIGGER auto_progress_job_on_quote_insert
AFTER INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.auto_progress_job_to_in_progress();

DROP TRIGGER IF EXISTS auto_progress_job_on_invoice_insert ON public.invoices;
CREATE TRIGGER auto_progress_job_on_invoice_insert
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.auto_progress_job_to_in_progress();

DROP TRIGGER IF EXISTS auto_progress_job_on_report_insert ON public.reports;
CREATE TRIGGER auto_progress_job_on_report_insert
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.auto_progress_job_to_in_progress();
