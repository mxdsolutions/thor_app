import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { applyArchiveFilter, parseArchiveScope } from "@/app/api/_lib/archive";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { quoteSchema, quoteUpdateSchema, createQuoteWithItemsSchema } from "@/lib/validation";
import { pushQuoteToXero } from "@/lib/xero-sync";
import { recalcQuoteTotal } from "@/app/api/_lib/line-items";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);

    let query = supabase
        .from("quotes")
        .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone, job_title), job:jobs(id, job_title, status)", { count: "estimated" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    query = applyArchiveFilter(query, parseArchiveScope(request));

    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();

    // Try composite schema first (quote + line items), fallback to simple
    const compositeValidation = createQuoteWithItemsSchema.safeParse(body);
    if (compositeValidation.success) {
        const { line_items, sections, ...quoteFields } = compositeValidation.data;

        // Gather all items (used by Xero sync below)
        const allItems = [
            ...(line_items || []),
            ...(sections || []).flatMap(s => s.items),
        ];

        // Auto-generate title if not provided
        let title = quoteFields.title;
        if (!title) {
            const { count } = await supabase
                .from("quotes")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", tenantId);
            title = `Quote #${(count || 0) + 1}`;
        }

        // Insert with total_amount = 0; recalc_quote_total will set it
        // atomically once line items land.
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
                ...quoteFields,
                title,
                total_amount: 0,
                status: "draft",
                created_by: user.id,
                tenant_id: tenantId,
            })
            .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone, job_title), job:jobs(id, job_title, status)")
            .single();

        if (quoteError) return serverError(quoteError);

        const lineItemRows: Record<string, unknown>[] = [];

        // Insert sections and their items
        if (sections && sections.length > 0) {
            const sectionRows = sections.map(s => ({
                quote_id: quote.id,
                name: s.name,
                sort_order: s.sort_order,
                tenant_id: tenantId,
            }));

            const { data: insertedSections, error: secError } = await supabase
                .from("quote_sections")
                .insert(sectionRows)
                .select();

            if (secError) return serverError(secError);

            // Map items to their section IDs (sections inserted in order)
            for (let si = 0; si < sections.length; si++) {
                const section = sections[si];
                const dbSection = insertedSections[si];
                for (const li of section.items) {
                    lineItemRows.push({
                        quote_id: quote.id,
                        section_id: dbSection.id,
                        pricing_matrix_id: li.pricing_matrix_id || null,
                        description: li.description,
                        line_description: li.line_description || null,
                        trade: li.trade || null,
                        uom: li.uom || null,
                        quantity: li.quantity,
                        material_cost: li.material_cost,
                        labour_cost: li.labour_cost,
                        unit_price: li.material_cost + li.labour_cost,
                        sort_order: li.sort_order ?? 0,
                        tenant_id: tenantId,
                    });
                }
            }
        }

        // Also insert unsectioned line items (backward compat)
        if (line_items && line_items.length > 0) {
            for (const li of line_items) {
                lineItemRows.push({
                    quote_id: quote.id,
                    section_id: null,
                    pricing_matrix_id: li.pricing_matrix_id || null,
                    description: li.description,
                    line_description: li.line_description || null,
                    trade: li.trade || null,
                    uom: li.uom || null,
                    quantity: li.quantity,
                    material_cost: li.material_cost,
                    labour_cost: li.labour_cost,
                    unit_price: li.material_cost + li.labour_cost,
                    sort_order: li.sort_order ?? 0,
                    tenant_id: tenantId,
                });
            }
        }

        if (lineItemRows.length > 0) {
            const { error: liError } = await supabase
                .from("quote_line_items")
                .insert(lineItemRows);
            if (liError) return serverError(liError);
        }

        // Atomically compute the total in Postgres so concurrent line-item
        // writes can't clobber each other.
        const newTotal = await recalcQuoteTotal(supabase, quote.id);
        quote.total_amount = newTotal;

        // Push to Xero if connected
        let xeroWarning: string | undefined;
        if (quote.company_id) {
            try {
                await pushQuoteToXero(
                    supabase,
                    tenantId,
                    quote.id,
                    {
                        status: quote.status,
                        title: quote.title,
                        description: quote.description,
                        scope_description: quote.scope_description,
                        valid_until: quote.valid_until,
                        gst_inclusive: quote.gst_inclusive,
                        material_margin: quoteFields.material_margin,
                        labour_margin: quoteFields.labour_margin,
                    },
                    quote.company_id,
                    allItems.map((li) => ({
                        description: li.description,
                        quantity: li.quantity,
                        material_cost: li.material_cost,
                        labour_cost: li.labour_cost,
                    })),
                    quote.contact_id
                );
            } catch (err) {
                console.error("Xero sync failed:", err);
                xeroWarning = "Quote created but failed to sync to Xero";
            }
        }

        return NextResponse.json({ item: quote, warning: xeroWarning }, { status: 201 });
    }

    // Fallback: simple quote creation (no line items)
    const validation = quoteSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("quotes")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = quoteUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data });
});
