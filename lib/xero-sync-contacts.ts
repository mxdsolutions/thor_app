import { SupabaseClient } from "@supabase/supabase-js";
import { xeroFetch, getXeroConnection } from "@/lib/xero";

// --- Xero Contact Types ---

export type XeroAddress = {
    AddressType?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
};

export type XeroPhone = {
    PhoneType?: string;
    PhoneNumber?: string;
    PhoneAreaCode?: string;
    PhoneCountryCode?: string;
};

export type XeroContactPerson = {
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    IncludeInEmails?: boolean;
};

export type XeroContact = {
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

// --- Helpers ---

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

// --- Xero -> THOR Mapping ---

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

// --- THOR -> Xero Mapping ---

export function mapCompanyToXeroContact(
    company: {
        name: string;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
        address?: string | null;
        postcode?: string | null;
    },
    contactPersons?: Array<{
        first_name: string;
        last_name: string;
        email?: string | null;
    }>
) {
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
    // Xero rejects ContactPersons when the primary Contact has no EmailAddress
    // ("Additional people cannot be added when the primary person has no email address set"),
    // so only attach them when the company itself has an email.
    if (company.email && contactPersons && contactPersons.length > 0) {
        contact.ContactPersons = contactPersons.map((cp) => ({
            FirstName: cp.first_name,
            LastName: cp.last_name,
            EmailAddress: cp.email || undefined,
            IncludeInEmails: false,
        }));
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

// --- Sync Helper: Push company to Xero ---

export async function pushCompanyToXero(
    supabase: SupabaseClient,
    tenantId: string,
    companyId: string,
    companyData: Parameters<typeof mapCompanyToXeroContact>[0],
    fallbackEmail?: string | null
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

    // Fetch current contact persons for this company so Xero stays in sync
    const { data: contactPersons } = await supabase
        .from("contacts")
        .select("first_name, last_name, email")
        .eq("tenant_id", tenantId)
        .eq("company_id", companyId);

    // If the company has no email, fall back to the provided contact email
    // (e.g. the contact chosen on the quote/invoice). Xero requires the primary
    // Contact to have an EmailAddress before ContactPersons can attach.
    const effectiveCompanyData = {
        ...companyData,
        email: companyData.email || fallbackEmail || undefined,
    };

    const xeroPayload = mapCompanyToXeroContact(
        effectiveCompanyData,
        contactPersons || undefined
    );
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
                const result = await upsertXeroContactToThor(supabase, tenantId, userId, xc);
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

async function upsertXeroContactToThor(
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
            .eq("id", existing.mxd_id)
            .eq("tenant_id", tenantId);

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
            .eq("id", match.id)
            .eq("tenant_id", tenantId);

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
                .eq("id", existingContacts[0].id)
                .eq("tenant_id", tenantId);
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
