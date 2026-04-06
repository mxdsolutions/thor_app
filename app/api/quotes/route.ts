import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { quoteSchema, quoteUpdateSchema, createQuoteWithItemsSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const { limit, offset, search } = parsePagination(request);

    let query = supabase
        .from("quotes")
        .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone, job_title)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError();

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();

    // Try composite schema first (quote + line items), fallback to simple
    const compositeValidation = createQuoteWithItemsSchema.safeParse(body);
    if (compositeValidation.success) {
        const { line_items, ...quoteFields } = compositeValidation.data;

        // Calculate total from line items + margins
        let materialSum = 0;
        let labourSum = 0;
        for (const li of line_items) {
            materialSum += li.quantity * li.material_cost;
            labourSum += li.quantity * li.labour_cost;
        }
        const totalAmount =
            materialSum * (1 + quoteFields.material_margin / 100) +
            labourSum * (1 + quoteFields.labour_margin / 100);

        // Auto-generate title if not provided
        let title = quoteFields.title;
        if (!title) {
            const { count } = await supabase
                .from("quotes")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", tenantId);
            title = `Quote #${(count || 0) + 1}`;
        }

        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
                ...quoteFields,
                title,
                total_amount: totalAmount,
                status: "draft",
                created_by: user.id,
                tenant_id: tenantId,
            })
            .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone, job_title)")
            .single();

        if (quoteError) return serverError();

        const lineItemRows = line_items.map((li) => ({
            quote_id: quote.id,
            pricing_matrix_id: li.pricing_matrix_id || null,
            description: li.description,
            trade: li.trade || null,
            uom: li.uom || null,
            quantity: li.quantity,
            material_cost: li.material_cost,
            labour_cost: li.labour_cost,
            unit_price: li.material_cost + li.labour_cost,
            tenant_id: tenantId,
        }));

        const { error: liError } = await supabase
            .from("quote_line_items")
            .insert(lineItemRows);

        if (liError) return serverError();

        return NextResponse.json({ item: quote }, { status: 201 });
    }

    // Fallback: simple quote creation (no line items)
    const validation = quoteSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("quotes")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError();

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

    if (error) return serverError();

    return NextResponse.json({ item: data });
});
