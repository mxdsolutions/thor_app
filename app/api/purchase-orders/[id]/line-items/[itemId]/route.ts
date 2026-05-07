import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError, validationError } from "@/app/api/_lib/errors";
import { purchaseOrderLineItemUpdateSchema } from "@/lib/validation";
import { recalcPurchaseOrderTotal } from "@/app/api/_lib/line-items";

function parseSegments(pathname: string) {
    // /api/purchase-orders/{id}/line-items/{itemId}
    const segments = pathname.split("/");
    const itemId = segments.at(-1);
    const poId = segments.at(-3);
    return { poId, itemId };
}

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const { poId, itemId } = parseSegments(request.nextUrl.pathname);
    if (!poId || !itemId) return notFoundError("Line item");

    const body = await request.json().catch(() => ({}));
    const validation = purchaseOrderLineItemUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("purchase_order_line_items")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("purchase_order_id", poId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) {
        console.error("PO line item update error", error);
        return serverError();
    }
    if (!data) return notFoundError("Line item");

    await recalcPurchaseOrderTotal(supabase, poId);

    return NextResponse.json({ item: data });
});

export const DELETE = withAuth(async (request, { supabase, tenantId }) => {
    const { poId, itemId } = parseSegments(request.nextUrl.pathname);
    if (!poId || !itemId) return notFoundError("Line item");

    // Hard-delete — line items are join-table-style rows where the
    // project rule allows hard deletes. The parent PO survives.
    const { error } = await supabase
        .from("purchase_order_line_items")
        .delete()
        .eq("id", itemId)
        .eq("purchase_order_id", poId)
        .eq("tenant_id", tenantId);

    if (error) {
        console.error("PO line item delete error", error);
        return serverError();
    }

    await recalcPurchaseOrderTotal(supabase, poId);

    return NextResponse.json({ success: true });
});
