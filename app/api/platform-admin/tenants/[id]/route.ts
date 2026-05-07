import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { serverError, notFoundError, validationError } from "@/app/api/_lib/errors";
import { platformTenantUpdateSchema } from "@/lib/validation";

const tenantIdSchema = z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid tenant ID"
);

function extractTenantId(request: NextRequest): string {
    const segments = request.nextUrl.pathname.split("/");
    // /api/platform-admin/tenants/[id] — id is the last segment for GET/PATCH
    return segments[segments.length - 1];
}

export const GET = withPlatformAuth(async (request, { adminClient }) => {
    const idResult = tenantIdSchema.safeParse(extractTenantId(request));
    if (!idResult.success) return validationError(idResult.error);
    const id = idResult.data;

    const { data: tenant, error } = await adminClient
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !tenant) return notFoundError("Tenant");

    // Get members
    const { data: members } = await adminClient
        .from("tenant_memberships")
        .select("user_id, role, joined_at, profiles(full_name, email, avatar_url)")
        .eq("tenant_id", id);

    // Get owner profile
    const { data: ownerProfile } = tenant.owner_id
        ? await adminClient
            .from("profiles")
            .select("full_name, email")
            .eq("id", tenant.owner_id)
            .single()
        : { data: null };

    return NextResponse.json({
        item: {
            ...tenant,
            owner: ownerProfile,
            members: members || [],
            member_count: members?.length || 0,
        },
    });
});

export const PATCH = withPlatformAuth(async (request, { adminClient, user }) => {
    const idResult = tenantIdSchema.safeParse(extractTenantId(request));
    if (!idResult.success) return validationError(idResult.error);
    const id = idResult.data;

    const body = await request.json();
    const validation = platformTenantUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await adminClient
        .from("tenants")
        .update(validation.data)
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError(error);
    if (!data) return notFoundError("Tenant");

    console.log(`[platform-admin] Tenant ${id} updated by ${user.id}:`, Object.keys(validation.data));

    return NextResponse.json({ item: data });
});
