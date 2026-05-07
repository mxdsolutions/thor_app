import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { jobSchema, jobUpdateSchema } from "@/lib/validation";

const JOB_LIST_SELECT = `
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
    company:companies (
        id,
        name
    ),
    contact:contacts (
        id,
        first_name,
        last_name,
        address,
        postcode
    )
`;

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const companyId = searchParams.get("company_id");

    const { query } = tenantListQuery(supabase, "jobs", {
        select: JOB_LIST_SELECT,
        tenantId,
        request,
        searchColumns: ["job_title", "description", "reference_id"],
        archivable: true,
    });

    let scoped = query;
    if (status) scoped = scoped.eq("status", status);
    if (companyId) scoped = scoped.eq("company_id", companyId);

    const { data, error, count } = await scoped;
    if (error) return serverError(error);

    const rows = (data || []) as unknown as Array<Record<string, unknown> & { assignees?: { user: unknown }[] }>;
    const jobs = rows.map((job) => ({
        ...job,
        assignees: (job.assignees || []).map((a) => a.user).filter(Boolean),
    }));

    return NextResponse.json({ items: jobs, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const { assignee_ids, ...rest } = body;
    const validation = jobSchema.safeParse(rest);
    if (!validation.success) return validationError(validation.error);

    const payload: Record<string, unknown> = { ...validation.data };

    // Auto-allocate reference_id from tenant counter when blank.
    // Atomic — see allocate_tenant_reference (migration 025).
    const suppliedRef = typeof payload.reference_id === "string" ? payload.reference_id.trim() : "";
    if (!suppliedRef) {
        delete payload.reference_id;
        const { data: ref, error: refError } = await supabase
            .rpc("allocate_tenant_reference", { p_tenant_id: tenantId });
        if (refError) return serverError(refError);
        if (ref) payload.reference_id = ref;
    } else {
        payload.reference_id = suppliedRef;
    }

    // Atomic insert of job + assignees — see create_job_with_assignees.
    const cleanAssignees: string[] = Array.isArray(assignee_ids)
        ? assignee_ids.filter((u: unknown): u is string => typeof u === "string")
        : [];
    const { data: jobIdData, error: rpcError } = await supabase
        .rpc("create_job_with_assignees", {
            p_tenant_id: tenantId,
            p_created_by: user.id,
            p_payload: payload,
            p_assignees: cleanAssignees,
        });
    if (rpcError || !jobIdData) return serverError(rpcError ?? "create_job_with_assignees returned no id");

    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            project:projects!jobs_project_id_fkey (id, title),
            assignees:job_assignees (user:profiles (id, full_name, email)),
            company:companies (id, name),
            contact:contacts (id, first_name, last_name)
        `)
        .eq("id", jobIdData)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return serverError(error);

    const job = {
        ...data,
        assignees: ((data.assignees || []) as { user: unknown }[]).map((a) => a.user).filter(Boolean),
    };

    return NextResponse.json({ item: job }, { status: 201 });
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

    if (error) return serverError(error);

    if (Array.isArray(assignee_ids)) {
        // Atomic delete + re-insert via Postgres function (migration 032).
        // Avoids the race where a delete succeeds but the insert fails,
        // leaving the job with no assignees.
        const cleanAssignees: string[] = assignee_ids.filter(
            (u: unknown): u is string => typeof u === "string"
        );
        const { error: assigneeError } = await supabase
            .rpc("replace_job_assignees", {
                p_tenant_id: tenantId,
                p_job_id: id,
                p_assignees: cleanAssignees,
            });
        if (assigneeError) return serverError(assigneeError);
    }

    return NextResponse.json({ item: data });
});
