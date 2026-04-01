import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, notFoundError } from "@/app/api/_lib/errors";
import { licenseSchema, licenseUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (_request, { supabase }) => {
    const { data, error } = await supabase
        .from("tenant_licenses")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return serverError();

    return NextResponse.json({ licenses: data });
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

    if (error) return serverError();

    return NextResponse.json({ license: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase }) => {
    const body = await request.json();
    const validation = licenseUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("tenant_licenses")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ license: data });
});

export const DELETE = withAuth(async (request, { supabase }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return notFoundError("License");

    const { error } = await supabase
        .from("tenant_licenses")
        .delete()
        .eq("id", id);

    if (error) return serverError();

    return NextResponse.json({ success: true });
});
