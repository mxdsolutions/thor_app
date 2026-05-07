import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError, notFoundError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

    if (error || !data) return notFoundError("Tenant");

    return NextResponse.json({ tenant: data });
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "settings.company",
        "write"
    );
    if (denied) return denied;

    const body = await request.json();

    const allowedFields = ["name", "company_name", "primary_color", "logo_url", "logo_dark_url", "report_cover_url", "custom_domain", "address", "phone", "email", "abn", "reference_prefix"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
        if (key in body) {
            updates[key] = body[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const admin = await createAdminClient();
    const { data, error } = await admin
        .from("tenants")
        .update(updates)
        .eq("id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ tenant: data });
});
