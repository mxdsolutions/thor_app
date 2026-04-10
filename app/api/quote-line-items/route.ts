import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, missingParamError, notFoundError } from "@/app/api/_lib/errors";
import { recalcQuoteTotal } from "@/app/api/_lib/line-items";
import { z } from "zod";

const quoteLineItemSchema = z.object({
    quote_id: z.string().uuid(),
    pricing_matrix_id: z.string().optional().nullable(),
    description: z.string().min(1),
    trade: z.string().optional().nullable(),
    uom: z.string().optional().nullable(),
    quantity: z.number().min(0),
    material_cost: z.number().min(0),
    labour_cost: z.number().min(0),
});

const quoteLineItemUpdateSchema = z.object({
    id: z.string().uuid(),
    quantity: z.number().min(0).optional(),
    material_cost: z.number().min(0).optional(),
    labour_cost: z.number().min(0).optional(),
});

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const quoteId = request.nextUrl.searchParams.get("quote_id");
    if (!quoteId) return missingParamError("quote_id");

    const { data, error } = await supabase
        .from("quote_line_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });

    if (error) return serverError();

    return NextResponse.json({ lineItems: data });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = quoteLineItemSchema.safeParse(body);
    if (!validation.success)
        return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });

    const d = validation.data;

    const { data, error } = await supabase
        .from("quote_line_items")
        .insert({
            quote_id: d.quote_id,
            pricing_matrix_id: d.pricing_matrix_id || null,
            description: d.description,
            trade: d.trade || null,
            uom: d.uom || null,
            quantity: d.quantity,
            material_cost: d.material_cost,
            labour_cost: d.labour_cost,
            unit_price: d.material_cost + d.labour_cost,
            tenant_id: tenantId,
        })
        .select()
        .single();

    if (error) return serverError();

    const newTotal = await recalcQuoteTotal(supabase, d.quote_id);

    return NextResponse.json({ lineItem: data, quoteTotal: newTotal }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = quoteLineItemUpdateSchema.safeParse(body);
    if (!validation.success)
        return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });

    const { id, ...updates } = validation.data;

    // If costs changed, update unit_price too
    const patchData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
    };
    if (updates.material_cost !== undefined || updates.labour_cost !== undefined) {
        const { data: current } = await supabase
            .from("quote_line_items")
            .select("material_cost, labour_cost")
            .eq("id", id)
            .eq("tenant_id", tenantId)
            .single();
        if (current) {
            const mc = updates.material_cost ?? current.material_cost;
            const lc = updates.labour_cost ?? current.labour_cost;
            patchData.unit_price = mc + lc;
        }
    }

    const { data, error } = await supabase
        .from("quote_line_items")
        .update(patchData)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError();

    const newTotal = await recalcQuoteTotal(supabase, data.quote_id);

    return NextResponse.json({ lineItem: data, quoteTotal: newTotal });
});

export const DELETE = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return missingParamError("id");

    const { data: item } = await supabase
        .from("quote_line_items")
        .select("quote_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (!item) return notFoundError("Line item");

    const { error } = await supabase
        .from("quote_line_items")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (error) return serverError();

    const newTotal = await recalcQuoteTotal(supabase, item.quote_id);

    return NextResponse.json({ success: true, quoteTotal: newTotal });
});
