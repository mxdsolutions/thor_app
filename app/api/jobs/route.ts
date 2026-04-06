import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { jobSchema, jobUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const { limit, offset, search } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const companyId = searchParams.get("company_id");

    let query = supabase
        .from("jobs")
        .select(`
            *,
            project:projects!jobs_project_id_fkey (
                id,
                title
            ),
            assignees:job_assignees (
                user:profiles (
                    id,
                    full_name,
                    email
                )
            ),
            lead:leads!jobs_opportunity_id_fkey (
                id,
                title
            ),
            company:companies (
                id,
                name
            )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`description.ilike.%${search}%`);
    }

    if (status) query = query.eq("status", status);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error, count } = await query;
    if (error) return serverError();

    const jobs = (data || []).map((job) => ({
        ...job,
        assignees: ((job.assignees || []) as { user: unknown }[]).map((a) => a.user).filter(Boolean),
    }));

    return NextResponse.json({ items: jobs, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const { assignee_ids, ...rest } = body;
    const validation = jobSchema.safeParse(rest);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("jobs")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError();

    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
        await supabase
            .from("job_assignees")
            .insert(assignee_ids.map((uid: string) => ({ job_id: data.id, user_id: uid, tenant_id: tenantId })));
    }

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const { assignee_ids, ...rest } = body;
    const validation = jobUpdateSchema.safeParse(rest);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("jobs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError();

    if (Array.isArray(assignee_ids)) {
        await supabase.from("job_assignees").delete().eq("job_id", id);
        if (assignee_ids.length > 0) {
            await supabase
                .from("job_assignees")
                .insert(assignee_ids.map((uid: string) => ({ job_id: id, user_id: uid, tenant_id: tenantId })));
        }
    }

    return NextResponse.json({ item: data });
});
