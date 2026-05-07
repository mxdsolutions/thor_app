import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { applyArchiveFilter, parseArchiveScope } from "@/app/api/_lib/archive";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { invoiceSchema, invoiceUpdateSchema } from "@/lib/validation";
import { pushInvoiceToXero } from "@/lib/xero-sync";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { limit, offset, search } = parsePagination(request);

    let query = supabase
        .from("invoices")
        .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name)", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    query = applyArchiveFilter(query, parseArchiveScope(request));

    if (search) {
        query = query.or(
            `invoice_number.ilike.%${search}%,reference.ilike.%${search}%`
        );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const jobId = searchParams.get("job_id");
    if (jobId) query = query.eq("job_id", jobId);

    const { data, error, count } = await query;
    if (error) return serverError(error);

    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = invoiceSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { line_items, ...invoiceData } = validation.data;

    // Calculate totals from line items
    let subTotal = 0;
    const processedItems = (line_items || []).map((li) => {
        const lineAmount = li.quantity * li.unit_price;
        subTotal += lineAmount;
        return { ...li, line_amount: lineAmount };
    });

    const gstInclusive = invoiceData.gst_inclusive !== false;
    const taxTotal = gstInclusive ? subTotal / 11 : subTotal * 0.1;
    const total = gstInclusive ? subTotal : subTotal + taxTotal;

    const { data, error } = await supabase
        .from("invoices")
        .insert({
            ...invoiceData,
            sub_total: gstInclusive ? subTotal - taxTotal : subTotal,
            tax_total: Math.round(taxTotal * 100) / 100,
            total: Math.round(total * 100) / 100,
            amount_due: Math.round(total * 100) / 100,
            amount_paid: 0,
            created_by: user.id,
            tenant_id: tenantId,
        })
        .select("*, company:companies(id, name)")
        .single();

    if (error) return serverError(error);

    // Insert line items
    if (processedItems.length > 0) {
        await supabase.from("invoice_line_items").insert(
            processedItems.map((li) => ({
                invoice_id: data.id,
                description: li.description,
                quantity: li.quantity,
                unit_price: li.unit_price,
                tax_amount: 0,
                line_amount: li.line_amount,
                account_code: li.account_code || null,
                tenant_id: tenantId,
            }))
        );
    }

    // Push to Xero if connected
    let xeroWarning: string | undefined;
    if (data.company_id) {
        try {
            await pushInvoiceToXero(
                supabase,
                tenantId,
                data.id,
                { status: data.status, type: data.type, issue_date: data.issue_date, due_date: data.due_date, reference: data.reference, currency_code: data.currency_code, gst_inclusive: data.gst_inclusive },
                data.company_id,
                processedItems.map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unit_price: li.unit_price,
                    account_code: li.account_code,
                })),
                data.contact_id
            );
        } catch (err) {
            console.error("Xero sync failed:", err);
            xeroWarning = "Invoice created but failed to sync to Xero";
        }
    }

    return NextResponse.json({ item: data, warning: xeroWarning }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = invoiceUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("invoices")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*, company:companies(id, name)")
        .single();

    if (error) return serverError(error);

    return NextResponse.json({ item: data });
});
