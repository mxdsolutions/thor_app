import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { notFoundError, serverError, validationError } from "@/app/api/_lib/errors";
import { purchaseOrderLineItemSchema } from "@/lib/validation";
import { recalcPurchaseOrderTotal } from "@/app/api/_lib/line-items";

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "finance.invoices", "write");
    if (denied) return denied;

    // URL shape: /api/purchase-orders/{id}/line-items — id is two segments back.
    const segments = request.nextUrl.pathname.split("/");
    const poId = segments.at(-2);
    if (!poId) return notFoundError("Purchase order");

    const body = await request.json().catch(() => ({}));
    const validation = purchaseOrderLineItemSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    // Confirm the parent PO is in the caller's tenant before inserting a child.
    const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("id", poId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
    if (poError || !po) return notFoundError("Purchase order");

    const { data, error } = await supabase
        .from("purchase_order_line_items")
        .insert({
            tenant_id: tenantId,
            purchase_order_id: poId,
            source_quote_line_item_id: validation.data.source_quote_line_item_id ?? null,
            description: validation.data.description,
            quantity: validation.data.quantity,
            unit_price: validation.data.unit_price,
            sort_order: validation.data.sort_order ?? 0,
        })
        .select()
        .single();

    if (error) {
        console.error("PO line item insert error", error);
        return serverError();
    }

    await recalcPurchaseOrderTotal(supabase, poId);

    return NextResponse.json({ item: data }, { status: 201 });
});
