import { NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { serverError, notFoundError, validationError } from "@/app/api/_lib/errors";
import { platformTenantSuspendSchema } from "@/lib/validation";

const tenantIdSchema = z.string().uuid("Invalid tenant ID");

export const POST = withPlatformAuth(async (request, { adminClient, user }) => {
    const segments = request.nextUrl.pathname.split("/");
    const idResult = tenantIdSchema.safeParse(segments[segments.length - 2]); // /api/platform-admin/tenants/[id]/suspend
    if (!idResult.success) return validationError(idResult.error);
    const id = idResult.data;

    const body = await request.json();
    const validation = platformTenantSuspendSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);
    const { action } = validation.data;

    const updates = action === "suspend"
        ? { status: "suspended", suspended_at: new Date().toISOString(), suspended_by: user.id }
        : { status: "active", suspended_at: null, suspended_by: null };

    const { data, error } = await adminClient
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError(error);
    if (!data) return notFoundError("Tenant");

    console.log(`[platform-admin] Tenant ${id} ${action}ed by ${user.id}`);

    return NextResponse.json({ item: data });
});
