import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, validationError, notFoundError, forbiddenError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";
import { reportTemplateUpdateSchema } from "@/lib/validation";

/**
 * Tenant-scoped single-template ops. Used by the in-dashboard builder
 * (`/dashboard/.../builder/[id]`) so tenant users can read and edit their
 * own templates without going through the platform-admin surface.
 *
 * Read: returns the template if it belongs to the caller's tenant OR is a
 * legacy / platform-shared template (`tenant_id IS NULL`). Legacy templates
 * are visible so they can be opened in the builder, but PATCH refuses to
 * mutate them — those are platform-managed and a tenant user shouldn't be
 * able to overwrite them.
 *
 * Tenant context comes from `withAuth` → `getTenantId()`, which UUID-
 * validates the header/JWT claim (see lib/tenant.ts). So the
 * `.eq("tenant_id", tenantId)` below is safe-by-construction.
 */
export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
    const id = request.nextUrl.pathname.split("/").pop();
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient
        .from("report_templates")
        .select("*")
        .eq("id", id)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .maybeSingle();

    if (error) return serverError(error);
    if (!data) return notFoundError("Report template");

    return NextResponse.json({ item: data });
});

export const PATCH = withAuth(async (request: NextRequest, { tenantId }) => {
    const id = request.nextUrl.pathname.split("/").pop();
    const body = await request.json();
    const validation = reportTemplateUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const adminClient = await createAdminClient();

    // Defence-in-depth: confirm the template belongs to this tenant before
    // updating. We `.eq("tenant_id", tenantId)` on the UPDATE as well so a
    // race between the check and the write can't widen the surface, but a
    // pre-check lets us return 403 vs the misleading 404 a filtered-out
    // UPDATE would otherwise produce.
    const { data: existing } = await adminClient
        .from("report_templates")
        .select("tenant_id, is_active")
        .eq("id", id)
        .maybeSingle();

    if (!existing || !existing.is_active) return notFoundError("Report template");
    if (existing.tenant_id !== tenantId) {
        // Legacy NULL-tenant templates fall through here too — they're
        // visible but not owned by any tenant, so no tenant can edit them.
        return forbiddenError("This template is platform-managed and can't be edited from a tenant workspace");
    }

    // Strip tenant_id from the body even if Zod accepted it — tenant users
    // never reassign ownership. (The reportTemplateUpdateSchema allows it
    // because the platform-admin variant of this route legitimately needs to,
    // but here it would be an escalation surface.)
    const updates = { ...validation.data };
    delete updates.tenant_id;

    const { data, error } = await adminClient
        .from("report_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);
    if (!data) return notFoundError("Report template");

    return NextResponse.json({ item: data });
});
