import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, notFoundError } from "@/app/api/_lib/errors";
import { xeroFetch } from "@/lib/xero";

export const POST = withAuth(async (request: NextRequest, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-2);
    if (!id) {
        return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, status")
        .eq("id", id)
        .single();

    if (invoiceError || !invoice) return notFoundError("Invoice");

    // Get Xero mapping
    const { data: mapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "invoice")
        .eq("mxd_id", id)
        .single();

    if (!mapping?.xero_id) {
        return NextResponse.json(
            { error: "Invoice is not synced with Xero. Sync it first before sending." },
            { status: 400 }
        );
    }

    // Invoice must be AUTHORISED to send
    if (invoice.status !== "authorised" && invoice.status !== "submitted") {
        return NextResponse.json(
            { error: "Invoice must be authorised before it can be sent via Xero." },
            { status: 400 }
        );
    }

    try {
        const res = await xeroFetch(
            supabase,
            tenantId,
            `/Invoices/${mapping.xero_id}/Email`,
            { method: "POST", body: JSON.stringify({}) }
        );

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json(
                { error: `Failed to send invoice via Xero: ${err}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch {
        return serverError();
    }
});
