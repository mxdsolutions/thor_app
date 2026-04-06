import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, missingParamError, notFoundError } from "@/app/api/_lib/errors";
import { recalcLeadValue } from "@/app/api/_lib/line-items";
import { lineItemSchema, lineItemUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const leadId = request.nextUrl.searchParams.get("lead_id");
    if (!leadId) return missingParamError("lead_id");

    const { data, error } = await supabase
        .from("lead_line_items")
        .select(`
            *,
            product:products (
                id,
                name
            )
        `)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

    if (error) return serverError();

    return NextResponse.json({ lineItems: data });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = lineItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("lead_line_items")
        .insert({ ...validation.data, tenant_id: tenantId })
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    let newTotal: number | undefined;
    if (validation.data.lead_id) {
        newTotal = await recalcLeadValue(supabase, validation.data.lead_id);
    }

    return NextResponse.json({ lineItem: data, leadValue: newTotal ?? null }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = lineItemUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("lead_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    const newTotal = await recalcLeadValue(supabase, data.lead_id);

    return NextResponse.json({ lineItem: data, leadValue: newTotal });
});

export const DELETE = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return missingParamError("id");

    const { data: item } = await supabase
        .from("lead_line_items")
        .select("lead_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (!item) return notFoundError("Line item");

    const { error } = await supabase
        .from("lead_line_items")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (error) return serverError();

    const newTotal = await recalcLeadValue(supabase, item.lead_id);

    return NextResponse.json({ success: true, leadValue: newTotal });
});
