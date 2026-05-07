import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { xeroFetch } from "@/lib/xero";
import {
    mapXeroContactToCompany,
    mapXeroInvoiceToThor,
    mapXeroInvoiceLineItems,
} from "@/lib/xero-sync";

function verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookKey: string
): boolean {
    const hash = crypto
        .createHmac("sha256", webhookKey)
        .update(payload)
        .digest("base64");
    return hash === signature;
}

export async function POST(request: NextRequest) {
    const webhookKey = process.env.XERO_WEBHOOK_KEY;
    if (!webhookKey) {
        console.error("XERO_WEBHOOK_KEY is not configured");
        return new NextResponse(null, { status: 401 });
    }

    const payload = await request.text();
    const signature = request.headers.get("x-xero-signature") || "";

    if (!verifyWebhookSignature(payload, signature, webhookKey)) {
        return new NextResponse(null, { status: 401 });
    }

    const body = JSON.parse(payload);

    // Xero sends an intent-to-receive validation with firstEventSequence = 0
    if (body.firstEventSequence === 0 && body.events?.length === 0) {
        return new NextResponse(null, { status: 200 });
    }

    // Process events asynchronously — respond to Xero quickly
    const events = body.events || [];
    processWebhookEvents(events).catch(console.error);

    return new NextResponse(null, { status: 200 });
}

async function processWebhookEvents(
    events: Array<{
        resourceUrl: string;
        resourceId: string;
        eventCategory: string;
        eventType: string;
        tenantId: string;
    }>
) {
    const supabase = await createAdminClient();

    for (const event of events) {
        // Resolve THOR tenant from xero_tenant_id
        const { data: connection } = await supabase
            .from("xero_connections")
            .select("tenant_id, user_id")
            .eq("xero_tenant_id", event.tenantId)
            .eq("status", "active")
            .single();

        if (!connection) continue;

        const thorTenantId = connection.tenant_id;

        try {
            if (event.eventCategory === "CONTACT") {
                await handleContactWebhook(
                    supabase,
                    thorTenantId,
                    connection.user_id,
                    event.resourceId
                );
            } else if (event.eventCategory === "INVOICE") {
                await handleInvoiceWebhook(
                    supabase,
                    thorTenantId,
                    connection.user_id,
                    event.resourceId
                );
            }
        } catch (err) {
            console.error(`Webhook processing error for ${event.eventCategory}:`, err);
            await supabase.from("xero_sync_log").insert({
                tenant_id: thorTenantId,
                entity_type: event.eventCategory.toLowerCase(),
                operation: "webhook",
                status: "error",
                error_message: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }
}

async function handleContactWebhook(
    supabase: Awaited<ReturnType<typeof createAdminClient>>,
    tenantId: string,
    userId: string,
    xeroContactId: string
) {
    // Fetch full contact from Xero
    const res = await xeroFetch(supabase, tenantId, `/Contacts/${xeroContactId}`);
    if (!res.ok) return;

    const data = await res.json();
    const xc = data.Contacts?.[0];
    if (!xc) return;

    const companyData = mapXeroContactToCompany(xc);

    // Check mapping
    const { data: mapping } = await supabase
        .from("xero_sync_mappings")
        .select("mxd_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "company")
        .eq("xero_id", xeroContactId)
        .single();

    if (mapping?.mxd_id) {
        await supabase
            .from("companies")
            .update({ ...companyData, updated_at: new Date().toISOString() })
            .eq("id", mapping.mxd_id);
    } else {
        // Create new company
        const { data: newCompany } = await supabase
            .from("companies")
            .insert({ ...companyData, created_by: userId, tenant_id: tenantId })
            .select("id")
            .single();

        if (newCompany) {
            await supabase.from("xero_sync_mappings").insert({
                tenant_id: tenantId,
                entity_type: "company",
                mxd_id: newCompany.id,
                xero_id: xeroContactId,
                sync_direction: "xero_to_mxd",
            });
        }
    }

    await supabase.from("xero_sync_log").insert({
        tenant_id: tenantId,
        entity_type: "company",
        operation: "webhook",
        status: "success",
    });
}

async function handleInvoiceWebhook(
    supabase: Awaited<ReturnType<typeof createAdminClient>>,
    tenantId: string,
    userId: string,
    xeroInvoiceId: string
) {
    const res = await xeroFetch(supabase, tenantId, `/Invoices/${xeroInvoiceId}`);
    if (!res.ok) return;

    const data = await res.json();
    const xi = data.Invoices?.[0];
    if (!xi) return;

    const invoiceData = mapXeroInvoiceToThor(xi);

    // Resolve company
    let companyId: string | null = null;
    if (xi.Contact?.ContactID) {
        const { data: companyMapping } = await supabase
            .from("xero_sync_mappings")
            .select("mxd_id")
            .eq("tenant_id", tenantId)
            .eq("entity_type", "company")
            .eq("xero_id", xi.Contact.ContactID)
            .single();
        companyId = companyMapping?.mxd_id || null;
    }

    const { data: mapping } = await supabase
        .from("xero_sync_mappings")
        .select("mxd_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "invoice")
        .eq("xero_id", xeroInvoiceId)
        .single();

    if (mapping?.mxd_id) {
        await supabase
            .from("invoices")
            .update({
                ...invoiceData,
                company_id: companyId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", mapping.mxd_id)
            .eq("tenant_id", tenantId);

        // Update line items
        const items = mapXeroInvoiceLineItems(xi);
        await supabase
            .from("invoice_line_items")
            .delete()
            .eq("invoice_id", mapping.mxd_id)
            .eq("tenant_id", tenantId);
        if (items.length > 0) {
            await supabase.from("invoice_line_items").insert(
                items.map((li) => ({
                    ...li,
                    invoice_id: mapping.mxd_id,
                    tenant_id: tenantId,
                }))
            );
        }
    } else {
        const { data: newInvoice } = await supabase
            .from("invoices")
            .insert({
                ...invoiceData,
                company_id: companyId,
                created_by: userId,
                tenant_id: tenantId,
            })
            .select("id")
            .single();

        if (newInvoice) {
            await supabase.from("xero_sync_mappings").insert({
                tenant_id: tenantId,
                entity_type: "invoice",
                mxd_id: newInvoice.id,
                xero_id: xeroInvoiceId,
                sync_direction: "xero_to_mxd",
            });

            const items = mapXeroInvoiceLineItems(xi);
            if (items.length > 0) {
                await supabase.from("invoice_line_items").insert(
                    items.map((li) => ({
                        ...li,
                        invoice_id: newInvoice.id,
                        tenant_id: tenantId,
                    }))
                );
            }
        }
    }

    await supabase.from("xero_sync_log").insert({
        tenant_id: tenantId,
        entity_type: "invoice",
        operation: "webhook",
        status: "success",
    });
}
