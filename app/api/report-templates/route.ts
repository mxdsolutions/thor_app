import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";
import { reportTemplateTenantCreateSchema } from "@/lib/validation";
import { insertTemplateWithUniqueSlug } from "@/lib/report-templates/slug";
import { buildEmptyTemplateSchema } from "@/lib/report-templates/defaults";

export const GET = withAuth(async (request, { tenantId }) => {
    const adminClient = await createAdminClient();

    // `?status=` filters by `is_active`. Default is "active" so existing
    // callers (the in-dashboard report-create modal) keep working unchanged.
    // The Settings → Reports → Templates list page passes "all" / "inactive"
    // to surface archived templates for management.
    const statusParam = new URL(request.url).searchParams.get("status");
    const statusFilter: "active" | "inactive" | "all" =
        statusParam === "inactive" || statusParam === "all" ? statusParam : "active";

    // Templates assigned to this tenant, plus legacy / platform-shared templates
    // (tenant_id IS NULL). Once all templates are assigned, the second clause
    // becomes a no-op naturally.
    //
    // The interpolated `or()` is safe-by-construction here: `tenantId` comes
    // from withAuth → getTenantId(), which UUID-validates both the request
    // header (after middleware overwrites/deletes it) and the JWT claim. If
    // either drift, lib/tenant.ts throws and this route is never entered. Do
    // NOT extend this `.or()` with any value not subject to the same upstream
    // validation — PostgREST's `or()` is comma-separated and a malformed value
    // would allow filter smuggling.
    let query = adminClient
        .from("report_templates")
        .select(
            "id, name, slug, description, category, schema, version, report_cover_url, tenant_id, is_active, created_at, updated_at, created_by",
        )
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order("name", { ascending: true });

    if (statusFilter === "active") query = query.eq("is_active", true);
    else if (statusFilter === "inactive") query = query.eq("is_active", false);
    // "all" → no filter

    const { data, error } = await query;
    if (error) return serverError(error);

    // `created_by` FKs to auth.users, not profiles, so we can't embed
    // `profiles` via PostgREST. Batch-fetch profile rows (profile.id matches
    // auth.users.id) and attach them as `creator` — the shape the settings
    // page consumes via `t.creator?.full_name`.
    const creatorIds = Array.from(
        new Set(
            (data || [])
                .map((t) => t.created_by)
                .filter((id): id is string => Boolean(id)),
        ),
    );

    const { data: creators } = creatorIds.length > 0
        ? await adminClient.from("profiles").select("id, full_name, email").in("id", creatorIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

    const creatorMap: Record<string, { id: string; full_name: string | null; email: string | null }> = {};
    for (const p of creators || []) {
        creatorMap[p.id] = p;
    }

    const items = (data || []).map((t) => ({
        ...t,
        creator: t.created_by ? creatorMap[t.created_by] || null : null,
    }));

    return NextResponse.json({ items });
});

/**
 * Tenant-scoped template create. Used by the in-dashboard builder flow so a
 * tenant user can create their own templates without going through the
 * platform-admin endpoint. The tenant_id is set from the auth context — the
 * request body's tenant_id (if present) is ignored.
 */
export const POST = withAuth(async (request, { user, tenantId }) => {
    const body = await request.json();
    const validation = reportTemplateTenantCreateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const adminClient = await createAdminClient();

    const { data, error } = await insertTemplateWithUniqueSlug(adminClient, {
        ...validation.data,
        schema: validation.data.schema || buildEmptyTemplateSchema(),
        tenant_id: tenantId,
        created_by: user.id,
    });

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});
