import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError } from "@/app/api/_lib/errors";

const ENTITY_TYPES = ["contact", "company", "job", "invoice", "quote", "user"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

function isEntityType(t: string): t is EntityType {
    return (ENTITY_TYPES as readonly string[]).includes(t);
}

/** Browser-cache the response so a second hover (or a navigation back to a
 *  list page that re-renders the same row) skips the network entirely. The
 *  30s freshness window matches the SWR dedupe — both layers stay aligned
 *  so a mutation visible on the page is reflected within ~30s either way.
 *  `private` keeps it out of any shared cache (responses are tenant-scoped). */
const PREVIEW_CACHE_HEADERS = {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
} as const;

function previewResponse(type: EntityType, item: unknown) {
    return NextResponse.json({ type, item }, { headers: PREVIEW_CACHE_HEADERS });
}

/** Single-record fetch used by both the inline hover/preview card and the
 *  GlobalEntitySheets host. The shape returned here is wide enough to back
 *  the side sheet's expected prop type — the preview UI just renders a
 *  subset. Keep payloads narrow: no `*` selects, no nested arrays beyond
 *  what the side sheet needs. */
export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const parts = request.nextUrl.pathname.split("/");
    const id = parts.at(-1);
    const type = parts.at(-2);

    if (!id || !type || !isEntityType(type)) {
        return notFoundError("Entity");
    }

    try {
        switch (type) {
            case "contact": {
                const { data, error } = await supabase
                    .from("contacts")
                    .select("id, first_name, last_name, email, phone, job_title, type, address, city, state, postcode, status, created_at, archived_at, company:companies(id, name)")
                    .eq("id", id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle();
                if (error) return serverError(error, "entity-preview:contact");
                if (!data) return notFoundError("Contact");
                return previewResponse(type, data);
            }
            case "company": {
                const { data, error } = await supabase
                    .from("companies")
                    .select("id, name, industry, phone, email, website, address, city, state, postcode, status, notes, is_supplier, created_at, archived_at")
                    .eq("id", id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle();
                if (error) return serverError(error, "entity-preview:company");
                if (!data) return notFoundError("Company");
                return previewResponse(type, data);
            }
            case "job": {
                const { data, error } = await supabase
                    .from("jobs")
                    .select(`
                        id, job_title, description, reference_id, status, amount, paid_status,
                        total_payment_received, scheduled_date, created_at, archived_at,
                        project:projects!jobs_project_id_fkey (id, title),
                        assignees:job_assignees (user:profiles (id, full_name, email)),
                        company:companies (id, name),
                        contact:contacts (id, first_name, last_name)
                    `)
                    .eq("id", id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle();
                if (error) return serverError(error, "entity-preview:job");
                if (!data) return notFoundError("Job");
                const assignees = ((data.assignees ?? []) as { user: unknown }[])
                    .map((a) => a.user)
                    .filter(Boolean);
                return previewResponse(type, { ...data, assignees });
            }
            case "invoice": {
                const { data, error } = await supabase
                    .from("invoices")
                    .select(`
                        id, invoice_number, reference, status, type, sub_total, tax_total,
                        total, amount_due, amount_paid, currency_code,
                        issue_date, due_date, fully_paid_on, notes, created_at, archived_at,
                        company:companies (id, name),
                        contact:contacts (id, first_name, last_name)
                    `)
                    .eq("id", id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle();
                if (error) return serverError(error, "entity-preview:invoice");
                if (!data) return notFoundError("Invoice");
                return previewResponse(type, data);
            }
            case "quote": {
                const { data, error } = await supabase
                    .from("quotes")
                    .select(`
                        id, title, description, scope_description, status, total_amount,
                        valid_until, notes, created_at, archived_at,
                        material_margin, labour_margin, contact_id, company_id, job_id,
                        company:companies (id, name),
                        contact:contacts (id, first_name, last_name, email, phone, job_title),
                        job:jobs (id, job_title, status)
                    `)
                    .eq("id", id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle();
                if (error) return serverError(error, "entity-preview:quote");
                if (!data) return notFoundError("Quote");
                return previewResponse(type, data);
            }
            case "user": {
                const [profileRes, membershipRes] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("id, full_name, email, avatar_url, position, hourly_rate, created_at")
                        .eq("id", id)
                        .eq("tenant_id", tenantId)
                        .maybeSingle(),
                    supabase
                        .from("tenant_memberships")
                        .select("role, joined_at")
                        .eq("user_id", id)
                        .eq("tenant_id", tenantId)
                        .maybeSingle(),
                ]);
                if (profileRes.error) return serverError(profileRes.error, "entity-preview:user");
                if (!profileRes.data || !membershipRes.data) return notFoundError("User");

                const profile = profileRes.data;
                const membership = membershipRes.data;
                const item = {
                    id: profile.id,
                    email: profile.email,
                    created_at: profile.created_at,
                    last_sign_in_at: null,
                    user_metadata: {
                        full_name: profile.full_name,
                        avatar_url: profile.avatar_url,
                        user_type: membership.role,
                        position: profile.position,
                        hourly_rate: profile.hourly_rate,
                    },
                    tenant_role: membership.role,
                    joined_at: membership.joined_at,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    role: membership.role,
                    position: profile.position,
                };
                return previewResponse(type, item);
            }
        }
    } catch (err) {
        return serverError(err, `entity-preview:${type}`);
    }
});
