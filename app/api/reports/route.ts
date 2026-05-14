import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { applyArchiveFilter, parseArchiveScope } from "@/app/api/_lib/archive";
import { requirePermission } from "@/app/api/_lib/permissions";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { reportSchema, reportUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let query = supabase
        .from("reports")
        .select("*, job:jobs(id, job_title), project:projects(id, title), company:companies(id, name), creator:profiles!reports_created_by_fkey(id, full_name)", { count: "estimated" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    query = applyArchiveFilter(query, parseArchiveScope(request));

    if (search) {
        query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (type) {
        query = query.eq("type", type);
    }

    const jobId = searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "ops.reports", "write");
    if (denied) return denied;

    const body = await request.json();
    const validation = reportSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("reports")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "ops.reports", "write");
    if (denied) return denied;

    const body = await request.json();
    const validation = reportUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data });
});
