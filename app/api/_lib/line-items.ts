import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recalculate purchase-order total atomically. POs are cost-only — the
 * total is sum(quantity * unit_price). The actual sum-and-write happens
 * inside `recalc_purchase_order_total` (migration 025) so concurrent
 * line-item writes can't clobber each other.
 */
export async function recalcPurchaseOrderTotal(
    supabase: SupabaseClient,
    purchaseOrderId: string
): Promise<number> {
    const { data, error } = await supabase
        .rpc("recalc_purchase_order_total", { p_po_id: purchaseOrderId });
    if (error) throw error;
    return Number(data ?? 0);
}

/**
 * Recalculate quote total atomically using split material/labour costs
 * with margins. The actual computation happens inside
 * `recalc_quote_total` (migration 025).
 */
export async function recalcQuoteTotal(
    supabase: SupabaseClient,
    quoteId: string
): Promise<number> {
    const { data, error } = await supabase
        .rpc("recalc_quote_total", { p_quote_id: quoteId });
    if (error) throw error;
    return Number(data ?? 0);
}
