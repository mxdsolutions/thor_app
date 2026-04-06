import type { SupabaseClient } from "@supabase/supabase-js";

type LineItemConfig = {
    lineItemTable: string;
    parentTable: string;
    parentIdColumn: string;
    parentTotalColumn: string;
};

const JOB_CONFIG: LineItemConfig = {
    lineItemTable: "job_line_items",
    parentTable: "jobs",
    parentIdColumn: "job_id",
    parentTotalColumn: "amount",
};

const LEAD_CONFIG: LineItemConfig = {
    lineItemTable: "lead_line_items",
    parentTable: "leads",
    parentIdColumn: "lead_id",
    parentTotalColumn: "value",
};

/**
 * Recalculate the total for a parent entity (job or lead)
 * based on its line items.
 *
 * NOTE: This is not atomic — concurrent requests can produce incorrect totals.
 * A proper fix requires a Postgres function (e.g. recalc_job_amount RPC) that
 * computes and updates in a single transaction.
 */
async function recalcTotal(
    supabase: SupabaseClient,
    config: LineItemConfig,
    parentId: string
): Promise<number> {
    // Use RPC to atomically compute and update in a single transaction
    const { data: items } = await supabase
        .from(config.lineItemTable)
        .select("quantity, unit_price")
        .eq(config.parentIdColumn, parentId);

    const total = (items || []).reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
            sum + item.quantity * item.unit_price,
        0
    );

    await supabase
        .from(config.parentTable)
        .update({
            [config.parentTotalColumn]: total,
            updated_at: new Date().toISOString(),
        })
        .eq("id", parentId);

    return total;
}

export function recalcJobAmount(supabase: SupabaseClient, jobId: string) {
    return recalcTotal(supabase, JOB_CONFIG, jobId);
}

export function recalcLeadValue(
    supabase: SupabaseClient,
    leadId: string
) {
    return recalcTotal(supabase, LEAD_CONFIG, leadId);
}

/**
 * Recalculate quote total using split material/labour costs with margins.
 */
export async function recalcQuoteTotal(
    supabase: SupabaseClient,
    quoteId: string
): Promise<number> {
    const [{ data: items }, { data: quote }] = await Promise.all([
        supabase
            .from("quote_line_items")
            .select("quantity, material_cost, labour_cost")
            .eq("quote_id", quoteId),
        supabase
            .from("quotes")
            .select("material_margin, labour_margin")
            .eq("id", quoteId)
            .single(),
    ]);

    const materialMargin = quote?.material_margin ?? 20;
    const labourMargin = quote?.labour_margin ?? 20;

    let materialSum = 0;
    let labourSum = 0;
    for (const item of items || []) {
        materialSum += item.quantity * item.material_cost;
        labourSum += item.quantity * item.labour_cost;
    }

    const total =
        materialSum * (1 + materialMargin / 100) +
        labourSum * (1 + labourMargin / 100);

    await supabase
        .from("quotes")
        .update({ total_amount: total, updated_at: new Date().toISOString() })
        .eq("id", quoteId);

    return total;
}
