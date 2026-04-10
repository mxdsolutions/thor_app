import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { z } from "zod";

const pricingItemSchema = z.object({
    Item: z.string().min(1, "Description is required"),
    Trade: z.string().optional().nullable(),
    Category: z.string().optional().nullable(),
    UOM: z.string().optional().nullable(),
    Total_Rate: z.string().optional().nullable(),
    Material_Cost: z.string().optional().nullable(),
    Labour_Cost: z.string().optional().nullable(),
    Pricing_Status: z.string().optional().nullable(),
});

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");

    let query = supabase
        .from("pricing")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("Trade", { ascending: true })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(
            `Item.ilike.%${search}%,Trade.ilike.%${search}%,Category.ilike.%${search}%`
        );
    }

    if (trade) {
        query = query.eq("Trade", trade);
    }

    const { data, error, count } = await query;
    if (error) return serverError();

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = pricingItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("pricing")
        .insert({ ...validation.data, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const { Matrix_ID, ...updates } = body;
    if (!Matrix_ID) return NextResponse.json({ error: "Matrix_ID is required" }, { status: 400 });

    const validation = pricingItemSchema.partial().safeParse(updates);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("pricing")
        .update(validation.data)
        .eq("Matrix_ID", Matrix_ID)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ item: data });
});
