import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { isRoleAtLeast, requirePermission } from "@/app/api/_lib/permissions";
import { serverError, validationError, notFoundError, forbiddenError } from "@/app/api/_lib/errors";
import { timesheetSchema, timesheetUpdateSchema } from "@/lib/validation";

const TIMESHEET_SELECT =
    "*, job:jobs (id, job_title, reference_id), user:profiles!timesheets_user_id_fkey (id, full_name, email, avatar_url)";

/**
 * Authorise a write that targets `targetUserId`:
 *   - the target must be a member of the caller's tenant (closes the
 *     cross-tenant hole — RLS only checks the row's tenant_id, not the FK)
 *   - if writing for someone else, the caller's role must be manager or above.
 *     "Log for others" is a manage-on-behalf capability not expressed in the
 *     resource permission map, so it gates on the role hierarchy directly.
 *
 * Returns null on success, or a 403/404 response the handler should return.
 */
async function authoriseTargetUser(
    supabase: SupabaseClient,
    callerId: string,
    tenantId: string,
    targetUserId: string,
) {
    const { data: target } = await supabase
        .from("tenant_memberships")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", targetUserId)
        .maybeSingle();
    if (!target) return notFoundError("Employee");

    if (callerId === targetUserId) return null;

    const { data: caller } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", callerId)
        .maybeSingle();
    if (!isRoleAtLeast(caller?.role, "manager")) {
        return forbiddenError("You can only log time for yourself");
    }
    return null;
}

export const GET = withAuth(async (request, { supabase, tenantId, user }) => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const userParam = searchParams.get("user_id");

    const { query, pagination } = tenantListQuery(supabase, "timesheets", {
        select: TIMESHEET_SELECT,
        tenantId,
        request,
        // Search is applied below across notes + joined job/user — see comment.
        orderBy: { column: "start_at", ascending: false },
        archivable: true,
    });

    let q = query;
    if (jobId) q = q.eq("job_id", jobId);
    if (userParam === "me") {
        q = q.eq("user_id", user.id);
    } else if (userParam) {
        q = q.eq("user_id", userParam);
    }

    // PostgREST can't OR across base + joined tables in one clause, so we
    // pre-resolve matching job_ids and user_ids and fold them into the OR.
    // `pagination.search` is already sanitised in parsePagination.
    if (pagination.search) {
        const term = pagination.search;
        const [jobsRes, usersRes] = await Promise.all([
            supabase
                .from("jobs")
                .select("id")
                .eq("tenant_id", tenantId)
                .or(`job_title.ilike.%${term}%,reference_id.ilike.%${term}%`),
            supabase
                .from("profiles")
                .select("id")
                .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`),
        ]);
        const jobIds = (jobsRes.data ?? []).map((r) => r.id);
        const userIds = (usersRes.data ?? []).map((r) => r.id);
        const orParts: string[] = [`notes.ilike.%${term}%`];
        if (jobIds.length) orParts.push(`job_id.in.(${jobIds.join(",")})`);
        if (userIds.length) orParts.push(`user_id.in.(${userIds.join(",")})`);
        q = q.or(orParts.join(","));
    }

    const { data, error, count } = await q;
    if (error) return serverError(error);
    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const permDenied = await requirePermission(supabase, user.id, tenantId, "ops.timesheets", "write");
    if (permDenied) return permDenied;

    const body = await request.json();
    const validation = timesheetSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const denied = await authoriseTargetUser(supabase, user.id, tenantId, validation.data.user_id);
    if (denied) return denied;

    // Confirm the referenced job (if any) belongs to the caller's tenant.
    if (validation.data.job_id) {
        const { data: jobRow, error: jobErr } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", validation.data.job_id)
            .eq("tenant_id", tenantId)
            .maybeSingle();
        if (jobErr || !jobRow) return notFoundError("Job");
    }

    const { data, error } = await supabase
        .from("timesheets")
        .insert({
            ...validation.data,
            source: validation.data.source ?? "manual",
            tenant_id: tenantId,
            created_by: user.id,
        })
        .select(TIMESHEET_SELECT)
        .single();

    if (error) return serverError(error);
    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const permDenied = await requirePermission(supabase, user.id, tenantId, "ops.timesheets", "write");
    if (permDenied) return permDenied;

    const body = await request.json();
    const validation = timesheetUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    if (updates.user_id) {
        const denied = await authoriseTargetUser(supabase, user.id, tenantId, updates.user_id);
        if (denied) return denied;
    }

    if (updates.job_id) {
        const { data: jobRow } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", updates.job_id)
            .eq("tenant_id", tenantId)
            .maybeSingle();
        if (!jobRow) return notFoundError("Job");
    }

    const { data, error } = await supabase
        .from("timesheets")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select(TIMESHEET_SELECT)
        .single();

    if (error) return serverError(error);
    return NextResponse.json({ item: data });
});

