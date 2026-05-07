import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError, missingParamError } from "@/app/api/_lib/errors";
import { taskSchema, taskUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase, user, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);
    const url = new URL(request.url);
    const assignedTo = url.searchParams.get("assigned_to");
    const status = url.searchParams.get("status");

    let query = supabase
        .from("tasks")
        .select("*, assigned_user:profiles!tasks_assigned_to_fkey(id, full_name)", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (assignedTo === "me") {
        query = query.eq("assigned_to", user.id);
    } else if (assignedTo) {
        query = query.eq("assigned_to", assignedTo);
    }

    if (status) {
        query = query.eq("status", status);
    }

    if (search) {
        query = query.ilike("title", `%${search}%`);
    }

    const jobId = url.searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = taskSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("tasks")
        .insert({
            ...validation.data,
            tenant_id: tenantId,
            created_by: user.id,
        })
        .select("*, assigned_user:profiles!tasks_assigned_to_fkey(id, full_name)")
        .single();

    if (error) return serverError(error);
    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return missingParamError("id");

    const validation = taskUpdateSchema.safeParse(updates);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("tasks")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*, assigned_user:profiles!tasks_assigned_to_fkey(id, full_name)")
        .single();

    if (error) return serverError(error);
    return NextResponse.json({ item: data });
});
