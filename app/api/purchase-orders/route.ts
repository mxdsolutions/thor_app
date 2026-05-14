import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError, validationError, notFoundError } from "@/app/api/_lib/errors";
import { createPurchaseOrderSchema } from "@/lib/validation";
import { recalcPurchaseOrderTotal } from "@/app/api/_lib/line-items";

const PO_SELECT =
    "*, company:companies (id, name, email, phone, is_supplier), job:jobs (id, job_title, reference_id), source_quote:quotes (id, title)";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const sourceQuoteId = searchParams.get("source_quote_id");

    const { query } = tenantListQuery(supabase, "purchase_orders", {
        select: PO_SELECT,
        tenantId,
        request,
        searchColumns: ["title", "reference_id", "notes"],
        archivable: true,
    });

    let q = query;
    if (jobId) q = q.eq("job_id", jobId);
    if (sourceQuoteId) q = q.eq("source_quote_id", sourceQuoteId);

    const { data, error, count } = await q;
    if (error) return serverError(error);
    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "finance.invoices", "write");
    if (denied) return denied;

    const body = await request.json();
    const validation = createPurchaseOrderSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { line_items, ...poFields } = validation.data;

    // Defence-in-depth: confirm the referenced job, supplier, and source
    // quote (when present) all belong to the caller's tenant.
    const checks = await Promise.all([
        supabase.from("jobs").select("id").eq("id", poFields.job_id).eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("companies").select("id").eq("id", poFields.company_id).eq("tenant_id", tenantId).maybeSingle(),
        poFields.source_quote_id
            ? supabase.from("quotes").select("id").eq("id", poFields.source_quote_id).eq("tenant_id", tenantId).maybeSingle()
            : Promise.resolve({ data: { id: "n/a" }, error: null }),
    ]);
    if (checks[0].error || !checks[0].data) return notFoundError("Job");
    if (checks[1].error || !checks[1].data) return notFoundError("Supplier");
    if (checks[2].error || !checks[2].data) return notFoundError("Source quote");

    // Compute total up-front so the row lands consistent on first insert.
    const initialTotal = (line_items || []).reduce(
        (sum, li) => sum + Number(li.quantity) * Number(li.unit_price),
        0
    );

    const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({
            tenant_id: tenantId,
            job_id: poFields.job_id,
            company_id: poFields.company_id,
            source_quote_id: poFields.source_quote_id ?? null,
            title: poFields.title ?? null,
            reference_id: poFields.reference_id ?? null,
            status: poFields.status ?? "draft",
            expected_date: poFields.expected_date ?? null,
            gst_inclusive: poFields.gst_inclusive ?? true,
            notes: poFields.notes ?? null,
            total_amount: initialTotal,
            created_by: user.id,
        })
        .select(PO_SELECT)
        .single();

    if (error) {
        console.error("PO insert error", error);
        return serverError();
    }

    if (line_items && line_items.length > 0) {
        const rows = line_items.map((li, idx) => ({
            tenant_id: tenantId,
            purchase_order_id: po.id,
            source_quote_line_item_id: li.source_quote_line_item_id ?? null,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            sort_order: li.sort_order ?? idx,
        }));
        const { error: liError } = await supabase
            .from("purchase_order_line_items")
            .insert(rows);
        if (liError) {
            console.error("PO line item insert error", liError);
            // Roll back the PO so we don't end up with an orphaned header.
            await supabase.from("purchase_orders").delete().eq("id", po.id);
            return serverError();
        }
        // Recalc — initialTotal is correct, but call the helper so any future
        // server-side normalisation (rounding, currency conversion) is honoured.
        await recalcPurchaseOrderTotal(supabase, po.id);
    }

    return NextResponse.json({ item: po }, { status: 201 });
});
