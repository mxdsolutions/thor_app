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
        .select("*", { count: "estimated" })
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

    return NextResponse.json({ items: data, total: count || 0 });
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
