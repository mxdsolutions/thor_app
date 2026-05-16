import { NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { reportTemplateCreateSchema } from "@/lib/validation";
import { insertTemplateWithUniqueSlug } from "@/lib/report-templates/slug";
import { buildEmptyTemplateSchema } from "@/lib/report-templates/defaults";

export const GET = withPlatformAuth(async (request, { adminClient }) => {
    const { limit, offset, search } = parsePagination(request);
    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    let query = adminClient
        .from("report_templates")
        .select("*, tenant:tenants(id, name, company_name)", { count: "estimated" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category) {
        query = query.eq("category", category);
    }

    const { data, error, count } = await query;
    if (error) return serverError(error);

    // `created_by` references auth.users(id), not profiles, so we can't embed
    // profiles via PostgREST FK syntax. Batch-fetch matching profile rows
    // (profile.id matches auth.users.id by Supabase convention) and zip them
    // in — same pattern as /api/platform-admin/tenants for owner profiles.
    const creatorIds = Array.from(
        new Set(
            (data || [])
                .map((t: { created_by: string | null }) => t.created_by)
                .filter((id: string | null): id is string => Boolean(id)),
        ),
    );

    const { data: creators } = creatorIds.length > 0
        ? await adminClient.from("profiles").select("id, full_name, email").in("id", creatorIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

    const creatorMap: Record<string, { id: string; full_name: string | null; email: string | null }> = {};
    for (const p of creators || []) {
        creatorMap[p.id] = p;
    }

    const items = (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        created_by_user: t.created_by ? creatorMap[t.created_by as string] || null : null,
    }));

    return NextResponse.json({ items, total: count || 0 });
});

export const POST = withPlatformAuth(async (request, { adminClient, user }) => {
    const body = await request.json();
    const validation = reportTemplateCreateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await insertTemplateWithUniqueSlug(adminClient, {
        ...validation.data,
        schema: validation.data.schema || buildEmptyTemplateSchema(),
        created_by: user.id,
    });

    if (error) return serverError(error);

    return NextResponse.json({ item: data }, { status: 201 });
});
