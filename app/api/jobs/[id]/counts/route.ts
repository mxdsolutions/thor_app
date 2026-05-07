import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError } from "@/app/api/_lib/errors";

/**
 * Returns child-entity counts for a single job, used to populate tab badges in
 * the JobDetailView without paying the cost of fetching full row data.
 *
 * Uses `count: "exact", head: true` so each query returns metadata only — no
 * rows are transferred. The four counts are issued in parallel.
 */
export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const segments = request.nextUrl.pathname.split("/");
    const id = segments.at(-2);
    if (!id) return notFoundError("Job");

    const [quotes, invoices, reports, appointments] = await Promise.all([
        supabase.from("quotes")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("job_id", id),
        supabase.from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("job_id", id),
        supabase.from("reports")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("job_id", id),
        supabase.from("job_schedule_entries")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("job_id", id),
    ]);

    if (quotes.error || invoices.error || reports.error || appointments.error) {
        return serverError();
    }

    return NextResponse.json({
        quotes: quotes.count ?? 0,
        invoices: invoices.count ?? 0,
        reports: reports.count ?? 0,
        appointments: appointments.count ?? 0,
    });
});
