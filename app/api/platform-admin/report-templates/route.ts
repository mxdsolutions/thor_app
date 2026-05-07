import { NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { reportTemplateCreateSchema } from "@/lib/validation";

export const GET = withPlatformAuth(async (request, { adminClient }) => {
    const { limit, offset, search } = parsePagination(request);
    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    let query = adminClient
        .from("report_templates")
        .select("*", { count: "exact" })
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

    const { data, error } = await adminClient
        .from("report_templates")
        .insert({
            ...validation.data,
            schema: validation.data.schema || { version: 1, sections: [] },
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
        }
        return serverError();
    }

    return NextResponse.json({ item: data }, { status: 201 });
});
