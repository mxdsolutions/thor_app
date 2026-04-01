import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, missingParamError, notFoundError } from "@/app/api/_lib/errors";
import { recalcOpportunityValue } from "@/app/api/_lib/line-items";
import { lineItemSchema, lineItemUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
    if (!opportunityId) return missingParamError("opportunity_id");

    const { data, error } = await supabase
        .from("opportunity_line_items")
        .select(`
            *,
            product:products (
                id,
                name
            )
        `)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: true });

    if (error) return serverError();

    return NextResponse.json({ lineItems: data });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = lineItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("opportunity_line_items")
        .insert({ ...validation.data, tenant_id: tenantId })
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    let newTotal: number | undefined;
    if (validation.data.opportunity_id) {
        newTotal = await recalcOpportunityValue(supabase, validation.data.opportunity_id);
    }

    return NextResponse.json({ lineItem: data, opportunityValue: newTotal ?? null }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase }) => {
    const body = await request.json();
    const validation = lineItemUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("opportunity_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    const newTotal = await recalcOpportunityValue(supabase, data.opportunity_id);

    return NextResponse.json({ lineItem: data, opportunityValue: newTotal });
});

export const DELETE = withAuth(async (request, { supabase }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return missingParamError("id");

    const { data: item } = await supabase
        .from("opportunity_line_items")
        .select("opportunity_id")
        .eq("id", id)
        .single();

    if (!item) return notFoundError("Line item");

    const { error } = await supabase
        .from("opportunity_line_items")
        .delete()
        .eq("id", id);

    if (error) return serverError();

    const newTotal = await recalcOpportunityValue(supabase, item.opportunity_id);

    return NextResponse.json({ success: true, opportunityValue: newTotal });
});
