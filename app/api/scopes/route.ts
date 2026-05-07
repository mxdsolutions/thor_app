import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { query } = tenantListQuery(supabase, "projects", {
        select: `
            *,
            client:profiles!projects_client_id_fkey (
                id,
                full_name,
                email
            )
        `,
        tenantId,
        request,
        searchColumns: ["title"],
    });

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const finalQuery = jobId ? query.eq("job_id", jobId) : query;

    const { data, error, count } = await finalQuery;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});
