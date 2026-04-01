import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { serviceSchema, serviceUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (_request, { supabase }) => {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return serverError();

    return NextResponse.json({ services: data });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = serviceSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("products")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ service: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase }) => {
    const body = await request.json();
    const validation = serviceUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ service: data });
});
