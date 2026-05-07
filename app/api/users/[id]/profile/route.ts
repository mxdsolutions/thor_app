import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { validationError, serverError, notFoundError, missingParamError, forbiddenError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";

/** Profile fields an admin/owner can edit on another user. Self-edit goes
 *  through PATCH /api/profile instead. */
const adminProfileUpdateSchema = z.object({
    // Accept null as "clear the rate" — coerced to 0 below since the column is NOT NULL.
    hourly_rate: z.number().min(0, "Hourly rate must be ≥ 0").nullable().optional(),
    position: z.string().max(120).optional().nullable(),
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const segments = request.nextUrl.pathname.split("/");
    // .../users/[id]/profile → id is at -2
    const targetId = segments.at(-2);
    if (!targetId) return missingParamError("id");

    const body = await request.json().catch(() => ({}));
    const validation = adminProfileUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const denied = await requirePermission(supabase, user.id, tenantId, "settings.users", "write");
    if (denied) return denied;

    // Verify the target user belongs to this tenant before crossing into
    // the admin client. The RLS-bound supabase client gives us this for free.
    const { data: targetProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("id, tenant_id")
        .eq("id", targetId)
        .eq("tenant_id", tenantId)
        .single();
    if (lookupError || !targetProfile) {
        // Either no row or the requester can't see it — treat both as 404 to
        // avoid leaking which user IDs exist outside the tenant.
        if (lookupError && lookupError.code !== "PGRST116") {
            return serverError(lookupError, "PATCH /api/users/[id]/profile lookup");
        }
        return notFoundError("User");
    }

    if (targetProfile.tenant_id !== tenantId) {
        return forbiddenError("Cannot edit a user outside this workspace");
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validation.data.hourly_rate !== undefined) update.hourly_rate = validation.data.hourly_rate ?? 0;
    if (validation.data.position !== undefined)    update.position = validation.data.position;

    if (Object.keys(update).length === 1) {
        // Only updated_at — nothing meaningful to write.
        return NextResponse.json({ success: true });
    }

    const admin = await createAdminClient();
    const { error: updateError } = await admin
        .from("profiles")
        .update(update)
        .eq("id", targetId)
        .eq("tenant_id", tenantId);

    if (updateError) return serverError(updateError, "PATCH /api/users/[id]/profile update");

    return NextResponse.json({ success: true });
});
