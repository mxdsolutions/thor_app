import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("Job");

    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            project:projects!jobs_project_id_fkey (id, title),
            assignees:job_assignees (user:profiles (id, full_name, email)),
            company:companies (id, name),
            contact:contacts (id, first_name, last_name),
            service:products!jobs_service_id_fkey (id, name)
        `)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return notFoundError("Job");

    const job = {
        ...data,
        assignees: ((data.assignees || []) as { user: unknown }[]).map((a) => a.user).filter(Boolean),
    };

    return NextResponse.json({ item: job });
});
