import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { contactSchema, contactUpdateSchema } from "@/lib/validation";
import { pushCompanyToXero } from "@/lib/xero-sync";

export const GET = withAuth(async (request, { supabase }) => {
    const { limit, offset, search } = parsePagination(request);

    let query = supabase
        .from("contacts")
        .select(`
            *,
            company:companies (
                id,
                name
            )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return serverError();

    return NextResponse.json({ contacts: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = contactSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("contacts")
        .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
        .select()
        .single();

    if (error) return serverError();

    // If contact has a company, push the company to Xero (which includes ContactPersons)
    if (data.company_id) {
        (async () => {
            const { data: company } = await supabase
                .from("companies")
                .select("name, email, phone, website, address, postcode")
                .eq("id", data.company_id)
                .single();
            if (company) {
                await pushCompanyToXero(supabase, tenantId, data.company_id, company);
            }
        })().catch(console.error);
    }

    return NextResponse.json({ contact: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase }) => {
    const body = await request.json();
    const validation = contactUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError();

    return NextResponse.json({ contact: data });
});
