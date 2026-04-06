import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);

    let query = supabase
        .from("projects")
        .select(`
            *,
            client:profiles!projects_client_id_fkey (
                id,
                full_name,
                email
            )
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`title.ilike.%${search}%`);
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError();

    return NextResponse.json({ items: data, total: count || 0 });
});
