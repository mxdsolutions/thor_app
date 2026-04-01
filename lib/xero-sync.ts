import { SupabaseClient } from "@supabase/supabase-js";
import { xeroFetch, getXeroConnection } from "@/lib/xero";

// --- Xero → MXD Mapping ---

type XeroAddress = {
    AddressType?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
};

type XeroPhone = {
    PhoneType?: string;
    PhoneNumber?: string;
    PhoneAreaCode?: string;
    PhoneCountryCode?: string;
};

type XeroContactPerson = {
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    IncludeInEmails?: boolean;
};

type XeroContact = {
    ContactID: string;
    Name: string;
    EmailAddress?: string;
    Phones?: XeroPhone[];
    Addresses?: XeroAddress[];
    Website?: string;
    ContactPersons?: XeroContactPerson[];
    ContactStatus?: string;
    IsCustomer?: boolean;
    IsSupplier?: boolean;
    UpdatedDateUTC?: string;
};

type XeroInvoice = {
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
    LineItems?: Array<{
        Description?: string;
        Quantity?: number;
        UnitAmount?: number;
        TaxAmount?: number;
        LineAmount?: number;
        AccountCode?: string;
    }>;
    UpdatedDateUTC?: string;
};

function getPhone(phones?: XeroPhone[]): string | undefined {
    if (!phones) return undefined;
    const main = phones.find((p) => p.PhoneType === "DEFAULT") || phones[0];
    if (!main?.PhoneNumber) return undefined;
    const parts = [main.PhoneCountryCode, main.PhoneAreaCode, main.PhoneNumber].filter(Boolean);
    return parts.join(" ");
}

function getAddress(addresses?: XeroAddress[]): { address?: string; postcode?: string } {
    if (!addresses) return {};
    const street = addresses.find((a) => a.AddressType === "STREET") || addresses[0];
    if (!street) return {};
    const lines = [street.AddressLine1, street.AddressLine2, street.City, street.Region]
        .filter(Boolean)
        .join(", ");
    return { address: lines || undefined, postcode: street.PostalCode || undefined };
}

export function mapXeroContactToCompany(xc: XeroContact) {
    const { address, postcode } = getAddress(xc.Addresses);
    return {
        name: xc.Name,
        email: xc.EmailAddress || undefined,
        phone: getPhone(xc.Phones),
        website: xc.Website || undefined,
        address,
        postcode,
        status: xc.ContactStatus === "ARCHIVED" ? "inactive" : "active",
    };
}

export function mapXeroContactPersonsToContacts(
    xc: XeroContact,
    companyId: string
) {
    return (xc.ContactPersons || []).map((cp) => ({
        first_name: cp.FirstName || "Unknown",
        last_name: cp.LastName || "",
        email: cp.EmailAddress || undefined,
        company_id: companyId,
        status: "active",
    }));
}

export function mapCompanyToXeroContact(company: {
    name: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    postcode?: string | null;
}) {
    const contact: Record<string, unknown> = { Name: company.name };
    if (company.email) contact.EmailAddress = company.email;
    if (company.phone) {
        contact.Phones = [{ PhoneType: "DEFAULT", PhoneNumber: company.phone }];
    }
    if (company.website) contact.Website = company.website;
    if (company.address || company.postcode) {
        contact.Addresses = [
            {
                AddressType: "STREET",
                AddressLine1: company.address || "",
                PostalCode: company.postcode || "",
            },
        ];
    }
    return contact;
}

export function mapContactsToXeroContactPersons(
    contacts: Array<{
        first_name: string;
        last_name: string;
        email?: string | null;
    }>
) {
    return contacts.map((c) => ({
        FirstName: c.first_name,
        LastName: c.last_name,
        EmailAddress: c.email || undefined,
    }));
}

// --- Xero Invoice → MXD Invoice ---

const XERO_STATUS_MAP: Record<string, string> = {
    DRAFT: "draft",
    SUBMITTED: "submitted",
    AUTHORISED: "authorised",
    PAID: "paid",
    VOIDED: "voided",
    DELETED: "voided",
};

export function mapXeroInvoiceToMXD(xi: XeroInvoice) {
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

// --- MXD Invoice → Xero Invoice ---

const MXD_STATUS_MAP: Record<string, string> = {
    draft: "DRAFT",
    submitted: "SUBMITTED",
    authorised: "AUTHORISED",
    paid: "PAID",
    voided: "VOIDED",
};

export function mapMXDInvoiceToXero(
    invoice: {
        status: string;
        type: string;
        issue_date?: string | null;
        due_date?: string | null;
        reference?: string | null;
        currency_code?: string | null;
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
        Status: MXD_STATUS_MAP[invoice.status] || "DRAFT",
        Date: invoice.issue_date || undefined,
        DueDate: invoice.due_date || undefined,
        Reference: invoice.reference || undefined,
        CurrencyCode: invoice.currency_code || "AUD",
        LineItems: lineItems.map((li) => ({
            Description: li.description || "",
            Quantity: li.quantity,
            UnitAmount: li.unit_price,
            AccountCode: li.account_code || "200",
        })),
    };
}

// --- Sync Helper: Push company to Xero ---

export async function pushCompanyToXero(
    supabase: SupabaseClient,
    tenantId: string,
    companyId: string,
    companyData: Parameters<typeof mapCompanyToXeroContact>[0]
) {
    const connection = await getXeroConnection(supabase, tenantId);
    if (!connection) return null;

    // Check if already mapped
    const { data: mapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "company")
        .eq("mxd_id", companyId)
        .single();

    const xeroPayload = mapCompanyToXeroContact(companyData);
    let res: Response;

    if (mapping?.xero_id) {
        // Update existing
        res = await xeroFetch(supabase, tenantId, "/Contacts", {
            method: "POST",
            body: JSON.stringify({
                Contacts: [{ ContactID: mapping.xero_id, ...xeroPayload }],
            }),
        });
    } else {
        // Create new
        res = await xeroFetch(supabase, tenantId, "/Contacts", {
            method: "POST",
            body: JSON.stringify({ Contacts: [xeroPayload] }),
        });
    }

    if (!res.ok) {
        const err = await res.text();
        await logSyncOperation(supabase, tenantId, "company", companyId, "push", "error", err);
        return null;
    }

    const result = await res.json();
    const xeroContact = result.Contacts?.[0];
    if (!xeroContact?.ContactID) return null;

    // Upsert mapping
    if (!mapping) {
        await supabase.from("xero_sync_mappings").upsert(
            {
                tenant_id: tenantId,
                entity_type: "company",
                mxd_id: companyId,
                xero_id: xeroContact.ContactID,
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
            .eq("entity_type", "company")
            .eq("mxd_id", companyId);
    }

    await logSyncOperation(supabase, tenantId, "company", companyId, "push", "success");
    return xeroContact.ContactID as string;
}

// --- Sync Helper: Push invoice to Xero ---

export async function pushInvoiceToXero(
    supabase: SupabaseClient,
    tenantId: string,
    invoiceId: string,
    invoice: Parameters<typeof mapMXDInvoiceToXero>[0],
    companyId: string,
    lineItems: Parameters<typeof mapMXDInvoiceToXero>[2]
) {
    const connection = await getXeroConnection(supabase, tenantId);
    if (!connection) return null;

    // Get company's Xero contact ID
    const { data: companyMapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "company")
        .eq("mxd_id", companyId)
        .single();

    if (!companyMapping?.xero_id) return null;

    // Check if invoice already mapped
    const { data: invoiceMapping } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "invoice")
        .eq("mxd_id", invoiceId)
        .single();

    const xeroPayload = mapMXDInvoiceToXero(invoice, companyMapping.xero_id, lineItems);
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

// --- Pull Contacts from Xero ---

export async function pullContactsFromXero(
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
            `/Contacts?page=${page}&pageSize=100`,
            { headers }
        );

        if (res.status === 304) break; // Not modified
        if (!res.ok) {
            errors++;
            break;
        }

        const data = await res.json();
        const contacts: XeroContact[] = data.Contacts || [];

        if (contacts.length === 0) {
            hasMore = false;
            break;
        }

        for (const xc of contacts) {
            try {
                const result = await upsertXeroContactToMXD(supabase, tenantId, userId, xc);
                if (result === "created") created++;
                else if (result === "updated") updated++;
            } catch {
                errors++;
            }
        }

        if (contacts.length < 100) hasMore = false;
        page++;
    }

    // Update last_sync_at
    await supabase
        .from("xero_connections")
        .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);

    return { created, updated, errors };
}

async function upsertXeroContactToMXD(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    xc: XeroContact
): Promise<"created" | "updated" | "skipped"> {
    // Check existing mapping
    const { data: existing } = await supabase
        .from("xero_sync_mappings")
        .select("mxd_id")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "company")
        .eq("xero_id", xc.ContactID)
        .single();

    const companyData = mapXeroContactToCompany(xc);

    if (existing?.mxd_id) {
        // Update existing company
        await supabase
            .from("companies")
            .update({ ...companyData, updated_at: new Date().toISOString() })
            .eq("id", existing.mxd_id);

        await supabase
            .from("xero_sync_mappings")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("entity_type", "company")
            .eq("xero_id", xc.ContactID);

        // Sync contact persons
        await syncContactPersons(supabase, tenantId, userId, xc, existing.mxd_id);

        return "updated";
    }

    // Try to match by name or email
    let matchQuery = supabase
        .from("companies")
        .select("id")
        .eq("tenant_id", tenantId);

    if (xc.EmailAddress) {
        matchQuery = matchQuery.or(`name.ilike.${xc.Name},email.eq.${xc.EmailAddress}`);
    } else {
        matchQuery = matchQuery.ilike("name", xc.Name);
    }

    const { data: matches } = await matchQuery.limit(1);
    const match = matches?.[0];

    if (match) {
        // Link existing company
        await supabase.from("xero_sync_mappings").insert({
            tenant_id: tenantId,
            entity_type: "company",
            mxd_id: match.id,
            xero_id: xc.ContactID,
            sync_direction: "xero_to_mxd",
        });

        // Update company data
        await supabase
            .from("companies")
            .update({ ...companyData, updated_at: new Date().toISOString() })
            .eq("id", match.id);

        await syncContactPersons(supabase, tenantId, userId, xc, match.id);
        return "updated";
    }

    // Create new company
    const { data: newCompany } = await supabase
        .from("companies")
        .insert({ ...companyData, created_by: userId, tenant_id: tenantId })
        .select("id")
        .single();

    if (!newCompany) return "skipped";

    await supabase.from("xero_sync_mappings").insert({
        tenant_id: tenantId,
        entity_type: "company",
        mxd_id: newCompany.id,
        xero_id: xc.ContactID,
        sync_direction: "xero_to_mxd",
    });

    await syncContactPersons(supabase, tenantId, userId, xc, newCompany.id);
    return "created";
}

async function syncContactPersons(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    xc: XeroContact,
    companyId: string
) {
    const persons = xc.ContactPersons || [];
    if (persons.length === 0) return;

    for (const cp of persons) {
        if (!cp.FirstName && !cp.LastName) continue;

        // Try to match by email or name
        const { data: existingContacts } = await supabase
            .from("contacts")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("company_id", companyId)
            .or(
                cp.EmailAddress
                    ? `email.eq.${cp.EmailAddress},and(first_name.ilike.${cp.FirstName || ""},last_name.ilike.${cp.LastName || ""})`
                    : `first_name.ilike.${cp.FirstName || ""},last_name.ilike.${cp.LastName || ""}`
            )
            .limit(1);

        if (existingContacts && existingContacts.length > 0) {
            await supabase
                .from("contacts")
                .update({
                    first_name: cp.FirstName || "Unknown",
                    last_name: cp.LastName || "",
                    email: cp.EmailAddress || undefined,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingContacts[0].id);
        } else {
            await supabase.from("contacts").insert({
                first_name: cp.FirstName || "Unknown",
                last_name: cp.LastName || "",
                email: cp.EmailAddress || undefined,
                company_id: companyId,
                status: "active",
                created_by: userId,
                tenant_id: tenantId,
            });
        }
    }
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
                const result = await upsertXeroInvoiceToMXD(supabase, tenantId, userId, xi);
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

async function upsertXeroInvoiceToMXD(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    xi: XeroInvoice
): Promise<"created" | "updated" | "skipped"> {
    const invoiceData = mapXeroInvoiceToMXD(xi);

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
