import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, missingParamError, notFoundError } from "@/app/api/_lib/errors";
import { recalcJobAmount } from "@/app/api/_lib/line-items";
import { lineItemSchema, lineItemUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const jobId = request.nextUrl.searchParams.get("job_id");
    if (!jobId) return missingParamError("job_id");

    const { data, error } = await supabase
        .from("job_line_items")
        .select(`
            *,
            product:products (
                id,
                name
            )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

    if (error) return serverError();

    return NextResponse.json({ lineItems: data });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = lineItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { job_id, product_id, quantity, unit_price } = validation.data;
    if (!job_id) return missingParamError("job_id");

    const { data, error } = await supabase
        .from("job_line_items")
        .insert({ job_id, product_id, quantity, unit_price, tenant_id: tenantId })
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    const newTotal = await recalcJobAmount(supabase, job_id);

    return NextResponse.json({ lineItem: data, jobAmount: newTotal }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase }) => {
    const body = await request.json();
    const validation = lineItemUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("job_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) return serverError();

    const newTotal = await recalcJobAmount(supabase, data.job_id);

    return NextResponse.json({ lineItem: data, jobAmount: newTotal });
});

export const DELETE = withAuth(async (request, { supabase }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return missingParamError("id");

    const { data: item } = await supabase
        .from("job_line_items")
        .select("job_id")
        .eq("id", id)
        .single();

    if (!item) return notFoundError("Line item");

    const { error } = await supabase
        .from("job_line_items")
        .delete()
        .eq("id", id);

    if (error) return serverError();

    const newTotal = await recalcJobAmount(supabase, item.job_id);

    return NextResponse.json({ success: true, jobAmount: newTotal });
});
