import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { jobSchema, jobUpdateSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/server";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
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
            ),
            service:products!jobs_service_id_fkey (
                id,
                name
            )
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`job_title.ilike.%${search}%,description.ilike.%${search}%,reference_id.ilike.%${search}%`);
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

    const payload = { ...validation.data } as Record<string, unknown>;

    // Auto-allocate reference_id from tenant counter when blank
    const suppliedRef = typeof payload.reference_id === "string" ? payload.reference_id.trim() : "";
    if (!suppliedRef) {
        delete payload.reference_id;
        const admin = await createAdminClient();
        const { data: tenantRow } = await admin
            .from("tenants")
            .select("reference_prefix, reference_next")
            .eq("id", tenantId)
            .single();

        const prefix = tenantRow?.reference_prefix?.trim();
        if (prefix) {
            const allocated = tenantRow?.reference_next ?? 1001;
            await admin
                .from("tenants")
                .update({ reference_next: allocated + 1, updated_at: new Date().toISOString() })
                .eq("id", tenantId);
            payload.reference_id = `${prefix}-${allocated}`;
        }
    } else {
        payload.reference_id = suppliedRef;
    }

    const { data, error } = await supabase
        .from("jobs")
        .insert({ ...payload, created_by: user.id, tenant_id: tenantId })
        .select(`
            *,
            project:projects!jobs_project_id_fkey (id, title),
            assignees:job_assignees (user:profiles (id, full_name, email)),
            company:companies (id, name),
            contact:contacts (id, first_name, last_name),
            service:products!jobs_service_id_fkey (id, name)
        `)
        .single();

    if (error) return serverError();

    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
        await supabase
            .from("job_assignees")
            .insert(assignee_ids.map((uid: string) => ({ job_id: data.id, user_id: uid, tenant_id: tenantId })));
    }

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
