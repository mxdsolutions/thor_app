import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { licenseSchema, licenseUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { query } = tenantListQuery(supabase, "tenant_licenses", {
        tenantId,
        request,
        searchColumns: ["name", "license_number", "issuing_authority"],
        archivable: true,
    });

    const { data, error, count } = await query;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = licenseSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("tenant_licenses")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = licenseUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("tenant_licenses")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data });
});
