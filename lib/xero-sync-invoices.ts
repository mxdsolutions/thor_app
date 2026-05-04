import { SupabaseClient } from "@supabase/supabase-js";
import { xeroFetch, getXeroConnection } from "@/lib/xero";
import { pushCompanyToXero } from "@/lib/xero-sync-contacts";

// --- Xero Invoice Types ---

export type XeroLineItem = {
    Description?: string;
    Quantity?: number;
    UnitAmount?: number;
    TaxAmount?: number;
    LineAmount?: number;
    AccountCode?: string;
};

export type XeroInvoice = {
    InvoiceID: string;
    InvoiceNumber?: string;
    Reference?: string;
    Type: string;
    Contact?: { ContactID: string; Name?: string };
    Status: string;
    SubTotal?: number;
    TotalTax?: number;
    Total?: number;
    AmountDue?: number;
    AmountPaid?: number;
    CurrencyCode?: string;
    Date?: string;
    DueDate?: string;
    FullyPaidOnDate?: string;
    LineItems?: XeroLineItem[];
    UpdatedDateUTC?: string;
};

// --- Xero Invoice -> THOR Invoice ---

const XERO_STATUS_MAP: Record<string, string> = {
    DRAFT: "draft",
    SUBMITTED: "submitted",
    AUTHORISED: "authorised",
    PAID: "paid",
    VOIDED: "voided",
    DELETED: "voided",
};

export function mapXeroInvoiceToThor(xi: XeroInvoice) {
    return {
        invoice_number: xi.InvoiceNumber || null,
        reference: xi.Reference || null,
        status: XERO_STATUS_MAP[xi.Status] || "draft",
        type: xi.Type || "ACCREC",
        sub_total: xi.SubTotal || 0,
        tax_total: xi.TotalTax || 0,
        total: xi.Total || 0,
        amount_due: xi.AmountDue || 0,
        amount_paid: xi.AmountPaid || 0,
        currency_code: xi.CurrencyCode || "AUD",
        issue_date: xi.Date || null,
        due_date: xi.DueDate || null,
        fully_paid_on: xi.FullyPaidOnDate || null,
    };
}

export function mapXeroInvoiceLineItems(xi: XeroInvoice) {
    return (xi.LineItems || []).map((li) => ({
        description: li.Description || "",
        quantity: li.Quantity || 1,
        unit_price: li.UnitAmount || 0,
        tax_amount: li.TaxAmount || 0,
        line_amount: li.LineAmount || 0,
        account_code: li.AccountCode || null,
    }));
}

// --- THOR Invoice -> Xero Invoice ---

const THOR_STATUS_MAP: Record<string, string> = {
    draft: "DRAFT",
    submitted: "SUBMITTED",
    authorised: "AUTHORISED",
    paid: "PAID",
    voided: "VOIDED",
};

export function mapThorInvoiceToXero(
    invoice: {
        status: string;
        type: string;
        issue_date?: string | null;
        due_date?: string | null;
        reference?: string | null;
        currency_code?: string | null;
        gst_inclusive?: boolean | null;
    },
    xeroContactId: string,
    lineItems: Array<{
        description?: string | null;
        quantity: number;
        unit_price: number;
        account_code?: string | null;
    }>
) {
    return {
        Type: invoice.type || "ACCREC",
        Contact: { ContactID: xeroContactId },
        Status: THOR_STATUS_MAP[invoice.status] || "DRAFT",
        Date: invoice.issue_date || undefined,
        DueDate: invoice.due_date || undefined,
        Reference: invoice.reference || undefined,
        CurrencyCode: invoice.currency_code || "AUD",
        LineAmountTypes: invoice.gst_inclusive === false ? "Exclusive" : "Inclusive",
        LineItems: lineItems.map((li) => ({
            Description: li.description || "",
            Quantity: li.quantity,
            UnitAmount: li.unit_price,
            AccountCode: li.account_code || "200",
        })),
    };
}

// --- Sync Helper: Push invoice to Xero ---

export async function pushInvoiceToXero(
    supabase: SupabaseClient,
    tenantId: string,
    invoiceId: string,
    invoice: Parameters<typeof mapThorInvoiceToXero>[0],
    companyId: string,
    lineItems: Parameters<typeof mapThorInvoiceToXero>[2],
    contactId?: string | null
) {
    const connection = await getXeroConnection(supabase, tenantId);
    if (!connection) return null;

    // Get company's Xero contact ID — create it in Xero if not yet mapped
    const { data: companyMapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "company")
        .eq("mxd_id", companyId)
        .single();

    let xeroContactId = companyMapping?.xero_id as string | undefined;
    if (!xeroContactId) {
        const { data: company } = await supabase
            .from("companies")
            .select("name, email, phone, website, address, postcode")
            .eq("id", companyId)
            .eq("tenant_id", tenantId)
            .single();
        if (!company) return null;

        // Fall back to the invoice's selected contact email if the company has none
        let fallbackEmail: string | null = null;
        if (contactId && !company.email) {
            const { data: invoiceContact } = await supabase
                .from("contacts")
                .select("email")
                .eq("id", contactId)
                .eq("tenant_id", tenantId)
                .single();
            fallbackEmail = invoiceContact?.email || null;
        }

        const pushed = await pushCompanyToXero(
            supabase,
            tenantId,
            companyId,
            company,
            fallbackEmail
        );
        if (!pushed) return null;
        xeroContactId = pushed;
    }

    // Check if invoice already mapped
    const { data: invoiceMapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "invoice")
        .eq("mxd_id", invoiceId)
        .single();

    const xeroPayload = mapThorInvoiceToXero(invoice, xeroContactId, lineItems);
    let res: Response;

    if (invoiceMapping?.xero_id) {
        res = await xeroFetch(supabase, tenantId, "/Invoices", {
            method: "POST",
            body: JSON.stringify({
                Invoices: [{ InvoiceID: invoiceMapping.xero_id, ...xeroPayload }],
            }),
        });
    } else {
        res = await xeroFetch(supabase, tenantId, "/Invoices", {
            method: "POST",
            body: JSON.stringify({ Invoices: [xeroPayload] }),
        });
    }

    if (!res.ok) {
        const err = await res.text();
        await logSyncOperation(supabase, tenantId, "invoice", invoiceId, "push", "error", err);
        return null;
    }

    const result = await res.json();
    const xeroInvoice = result.Invoices?.[0];
    if (!xeroInvoice?.InvoiceID) return null;

    if (!invoiceMapping) {
        await supabase.from("xero_sync_mappings").upsert(
            {
                tenant_id: tenantId,
                entity_type: "invoice",
                mxd_id: invoiceId,
                xero_id: xeroInvoice.InvoiceID,
                last_synced_at: new Date().toISOString(),
                sync_direction: "mxd_to_xero",
            },
            { onConflict: "tenant_id,entity_type,mxd_id" }
        );
    } else {
        await supabase
            .from("xero_sync_mappings")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("entity_type", "invoice")
            .eq("mxd_id", invoiceId);
    }

    await logSyncOperation(supabase, tenantId, "invoice", invoiceId, "push", "success");
    return xeroInvoice.InvoiceID as string;
}

// --- Pull Invoices from Xero ---

export async function pullInvoicesFromXero(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    modifiedSince?: string
) {
    let page = 1;
    let hasMore = true;
    let created = 0;
    let updated = 0;
    let errors = 0;

    while (hasMore) {
        const headers: Record<string, string> = {};
        if (modifiedSince) {
            headers["If-Modified-Since"] = modifiedSince;
        }

        const res = await xeroFetch(
            supabase,
            tenantId,
            `/Invoices?page=${page}&pageSize=100`,
            { headers }
        );

        if (res.status === 304) break;
        if (!res.ok) {
            errors++;
            break;
        }

        const data = await res.json();
        const invoices: XeroInvoice[] = data.Invoices || [];

        if (invoices.length === 0) {
            hasMore = false;
            break;
        }

        for (const xi of invoices) {
            try {
                const result = await upsertXeroInvoiceToThor(supabase, tenantId, userId, xi);
                if (result === "created") created++;
                else if (result === "updated") updated++;
            } catch {
                errors++;
            }
        }

        if (invoices.length < 100) hasMore = false;
        page++;
    }

    return { created, updated, errors };
}

async function upsertXeroInvoiceToThor(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    xi: XeroInvoice
): Promise<"created" | "updated" | "skipped"> {
    const invoiceData = mapXeroInvoiceToThor(xi);

    // Resolve company_id from Xero contact mapping
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

    // Check existing mapping
    const { data: existing } = await supabase
        .from("xero_sync_mappings")
        .select("mxd_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "invoice")
        .eq("xero_id", xi.InvoiceID)
        .single();

    if (existing?.mxd_id) {
        await supabase
            .from("invoices")
            .update({
                ...invoiceData,
                company_id: companyId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existing.mxd_id);

        // Update line items
        await syncInvoiceLineItems(supabase, tenantId, existing.mxd_id, xi);

        await supabase
            .from("xero_sync_mappings")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("entity_type", "invoice")
            .eq("xero_id", xi.InvoiceID);

        return "updated";
    }

    // Create new invoice
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

    if (!newInvoice) return "skipped";

    await supabase.from("xero_sync_mappings").insert({
        tenant_id: tenantId,
        entity_type: "invoice",
        mxd_id: newInvoice.id,
        xero_id: xi.InvoiceID,
        sync_direction: "xero_to_mxd",
    });

    await syncInvoiceLineItems(supabase, tenantId, newInvoice.id, xi);
    return "created";
}

async function syncInvoiceLineItems(
    supabase: SupabaseClient,
    tenantId: string,
    invoiceId: string,
    xi: XeroInvoice
) {
    const items = mapXeroInvoiceLineItems(xi);
    if (items.length === 0) return;

    // Replace all line items
    await supabase
        .from("invoice_line_items")
        .delete()
        .eq("invoice_id", invoiceId);

    await supabase.from("invoice_line_items").insert(
        items.map((li) => ({
            ...li,
            invoice_id: invoiceId,
            tenant_id: tenantId,
        }))
    );
}

// --- Sync Logging ---

async function logSyncOperation(
    supabase: SupabaseClient,
    tenantId: string,
    entityType: string,
    entityId: string,
    operation: string,
    status: string,
    errorMessage?: string
) {
    await supabase.from("xero_sync_log").insert({
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        operation,
        status,
        error_message: errorMessage || null,
    });
}
