import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { requirePermission } from "@/app/api/_lib/permissions";
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
    const trade = new URL(request.url).searchParams.get("trade");

    const { query } = tenantListQuery(supabase, "pricing", {
        tenantId,
        request,
        // pricing has no created_at column; sort by Trade for stable browse order.
        orderBy: { column: "Trade", ascending: true },
        searchColumns: ["Item", "Trade", "Category"],
        archivable: true,
    });

    const finalQuery = trade ? query.eq("Trade", trade) : query;
    const { data, error, count } = await finalQuery;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "finance.pricing", "write");
    if (denied) return denied;

    const body = await request.json();
    const validation = pricingItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("pricing")
        .insert({ ...validation.data, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "finance.pricing", "write");
    if (denied) return denied;

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

    if (error) return serverError(error);

    return NextResponse.json({ item: data });
});
