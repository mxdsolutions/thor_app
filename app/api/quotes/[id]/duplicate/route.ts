import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { missingParamError, notFoundError, serverError } from "@/app/api/_lib/errors";
import { recalcQuoteTotal } from "@/app/api/_lib/line-items";

const QUOTE_SELECT =
    "*, company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone, job_title), job:jobs(id, job_title, status)";

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "finance.quotes", "write");
    if (denied) return denied;

    const segments = request.nextUrl.pathname.split("/");
    const sourceId = segments.at(-2);
    if (!sourceId) return missingParamError("id");

    const { data: source, error: sourceError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", sourceId)
        .eq("tenant_id", tenantId)
        .single();
    if (sourceError || !source) return notFoundError("Quote");

    const { data: sections, error: secError } = await supabase
        .from("quote_sections")
        .select("id, name, sort_order")
        .eq("quote_id", sourceId)
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
    if (secError) return serverError(secError);

    const { data: lineItems, error: liError } = await supabase
        .from("quote_line_items")
        .select("section_id, pricing_matrix_id, description, line_description, trade, uom, quantity, material_cost, labour_cost, unit_price, sort_order")
        .eq("quote_id", sourceId)
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
    if (liError) return serverError(liError);

    const {
        id: _sourceId,
        created_at: _createdAt,
        updated_at: _updatedAt,
        archived_at: _archivedAt,
        xero_quote_id: _xeroQuoteId,
        xero_synced_at: _xeroSyncedAt,
        total_amount: _totalAmount,
        title: sourceTitle,
        ...quoteFields
    } = source;
    void _sourceId; void _createdAt; void _updatedAt; void _archivedAt;
    void _xeroQuoteId; void _xeroSyncedAt; void _totalAmount;

    const { data: newQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
            ...quoteFields,
            title: `Copy of ${sourceTitle}`,
            status: "draft",
            total_amount: 0,
            created_by: user.id,
            tenant_id: tenantId,
        })
        .select(QUOTE_SELECT)
        .single();
    if (insertError) return serverError(insertError);

    const sectionIdMap = new Map<string, string>();
    if (sections && sections.length > 0) {
        const sectionRows = sections.map((s) => ({
            quote_id: newQuote.id,
            name: s.name,
            sort_order: s.sort_order,
            tenant_id: tenantId,
        }));
        const { data: insertedSections, error: secInsertError } = await supabase
            .from("quote_sections")
            .insert(sectionRows)
            .select("id");
        if (secInsertError) return serverError(secInsertError);
        sections.forEach((s, i) => {
            if (insertedSections?.[i]) sectionIdMap.set(s.id, insertedSections[i].id);
        });
    }

    if (lineItems && lineItems.length > 0) {
        const rows = lineItems.map((li) => ({
            quote_id: newQuote.id,
            section_id: li.section_id ? sectionIdMap.get(li.section_id) ?? null : null,
            pricing_matrix_id: li.pricing_matrix_id ?? null,
            description: li.description,
            line_description: li.line_description ?? null,
            trade: li.trade ?? null,
            uom: li.uom ?? null,
            quantity: li.quantity,
            material_cost: li.material_cost,
            labour_cost: li.labour_cost,
            unit_price: li.unit_price,
            sort_order: li.sort_order ?? 0,
            tenant_id: tenantId,
        }));
        const { error: liInsertError } = await supabase
            .from("quote_line_items")
            .insert(rows);
        if (liInsertError) return serverError(liInsertError);
    }

    const newTotal = await recalcQuoteTotal(supabase, newQuote.id);
    newQuote.total_amount = newTotal;

    return NextResponse.json({ item: newQuote }, { status: 201 });
});
