import { SupabaseClient } from "@supabase/supabase-js";
import { xeroFetch, getXeroConnection } from "@/lib/xero";
import { pushCompanyToXero } from "@/lib/xero-sync-contacts";

// --- Xero Quote Types ---

export type XeroQuoteLineItem = {
    Description?: string;
    Quantity?: number;
    UnitAmount?: number;
    LineAmount?: number;
    AccountCode?: string;
};

export type XeroQuote = {
    QuoteID: string;
    QuoteNumber?: string;
    Reference?: string;
    Contact?: { ContactID: string; Name?: string };
    Status: string;
    Date?: string;
    ExpiryDate?: string;
    Title?: string;
    Summary?: string;
    Terms?: string;
    CurrencyCode?: string;
    SubTotal?: number;
    TotalTax?: number;
    Total?: number;
    LineItems?: XeroQuoteLineItem[];
    UpdatedDateUTC?: string;
};

// --- THOR Quote -> Xero Quote ---

const THOR_QUOTE_STATUS_MAP: Record<string, string> = {
    draft: "DRAFT",
    sent: "SENT",
    accepted: "ACCEPTED",
    rejected: "DECLINED",
    expired: "DECLINED",
};

export type ThorQuoteLineItemForXero = {
    description?: string | null;
    quantity: number;
    material_cost: number;
    labour_cost: number;
};

export function mapThorQuoteToXero(
    quote: {
        status?: string | null;
        title?: string | null;
        description?: string | null;
        scope_description?: string | null;
        valid_until?: string | null;
        gst_inclusive?: boolean | null;
        material_margin: number;
        labour_margin: number;
    },
    xeroContactId: string,
    lineItems: ThorQuoteLineItemForXero[]
) {
    const matMultiplier = 1 + (quote.material_margin || 0) / 100;
    const labMultiplier = 1 + (quote.labour_margin || 0) / 100;

    return {
        Contact: { ContactID: xeroContactId },
        Status: THOR_QUOTE_STATUS_MAP[quote.status || "draft"] || "DRAFT",
        Date: new Date().toISOString().slice(0, 10),
        ExpiryDate: quote.valid_until || undefined,
        Title: quote.title || undefined,
        Summary: quote.description || undefined,
        Terms: quote.scope_description || undefined,
        CurrencyCode: "AUD",
        LineAmountTypes: quote.gst_inclusive ? "Inclusive" : "Exclusive",
        LineItems: lineItems.map((li) => ({
            Description: li.description || "",
            Quantity: li.quantity,
            UnitAmount:
                Math.round(
                    (li.material_cost * matMultiplier +
                        li.labour_cost * labMultiplier) *
                        100
                ) / 100,
            AccountCode: "200",
        })),
    };
}

// --- Sync Helper: Push quote to Xero ---

export async function pushQuoteToXero(
    supabase: SupabaseClient,
    tenantId: string,
    quoteId: string,
    quote: Parameters<typeof mapThorQuoteToXero>[0],
    companyId: string,
    lineItems: ThorQuoteLineItemForXero[],
    contactId?: string | null
) {
    const connection = await getXeroConnection(supabase, tenantId);
    if (!connection) return null;

    // Resolve company's Xero contact — create one if not yet mapped
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

        // Use the quote's selected contact's email as fallback for the company
        let fallbackEmail: string | null = null;
        if (contactId && !company.email) {
            const { data: quoteContact } = await supabase
                .from("contacts")
                .select("email")
                .eq("id", contactId)
                .eq("tenant_id", tenantId)
                .single();
            fallbackEmail = quoteContact?.email || null;
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

    // Check if quote already mapped
    const { data: quoteMapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "quote")
        .eq("mxd_id", quoteId)
        .single();

    const xeroPayload = mapThorQuoteToXero(quote, xeroContactId, lineItems);
    let res: Response;

    if (quoteMapping?.xero_id) {
        res = await xeroFetch(supabase, tenantId, "/Quotes", {
            method: "POST",
            body: JSON.stringify({
                Quotes: [{ QuoteID: quoteMapping.xero_id, ...xeroPayload }],
            }),
        });
    } else {
        res = await xeroFetch(supabase, tenantId, "/Quotes", {
            method: "POST",
            body: JSON.stringify({ Quotes: [xeroPayload] }),
        });
    }

    if (!res.ok) {
        const err = await res.text();
        await logSyncOperation(supabase, tenantId, "quote", quoteId, "push", "error", err);
        return null;
    }

    const result = await res.json();
    const xeroQuote = result.Quotes?.[0];
    if (!xeroQuote?.QuoteID) return null;

    if (!quoteMapping) {
        await supabase.from("xero_sync_mappings").upsert(
            {
                tenant_id: tenantId,
                entity_type: "quote",
                mxd_id: quoteId,
                xero_id: xeroQuote.QuoteID,
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
            .eq("entity_type", "quote")
            .eq("mxd_id", quoteId);
    }

    await logSyncOperation(supabase, tenantId, "quote", quoteId, "push", "success");
    return xeroQuote.QuoteID as string;
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
