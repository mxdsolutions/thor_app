import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError, validationError } from "@/app/api/_lib/errors";
import { purchaseOrderUpdateSchema } from "@/lib/validation";

const PO_SELECT =
    "*, company:companies (id, name, email, phone, is_supplier), job:jobs (id, job_title, reference_id), source_quote:quotes (id, title), line_items:purchase_order_line_items (id, description, quantity, unit_price, sort_order, source_quote_line_item_id)";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("Purchase order");

    const { data, error } = await supabase
        .from("purchase_orders")
        .select(PO_SELECT)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return notFoundError("Purchase order");

    // Sort line items deterministically for the UI.
    if (Array.isArray(data.line_items)) {
        data.line_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
    }

    return NextResponse.json({ item: data });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("Purchase order");

    const body = await request.json().catch(() => ({}));
    const validation = purchaseOrderUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const update = { ...validation.data, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
        .from("purchase_orders")
        .update(update)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select(PO_SELECT)
        .single();

    if (error) {
        console.error("PO update error", error);
        return serverError();
    }
    if (!data) return notFoundError("Purchase order");

    return NextResponse.json({ item: data });
});
