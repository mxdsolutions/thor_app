import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, missingParamError, notFoundError, validationError } from "@/app/api/_lib/errors";
import { z } from "zod";

const sectionCreateSchema = z.object({
    quote_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    sort_order: z.number().int().min(0).optional(),
});

const sectionUpdateSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    sort_order: z.number().int().min(0).optional(),
});

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const quoteId = request.nextUrl.searchParams.get("quote_id");
    if (!quoteId) return missingParamError("quote_id");

    const { data, error } = await supabase
        .from("quote_sections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

    if (error) return serverError();
    return NextResponse.json({ sections: data });
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = sectionCreateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const d = validation.data;

    const { data, error } = await supabase
        .from("quote_sections")
        .insert({
            quote_id: d.quote_id,
            name: d.name,
            sort_order: d.sort_order ?? 0,
            tenant_id: tenantId,
        })
        .select()
        .single();

    if (error) return serverError();
    return NextResponse.json({ section: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = sectionUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("quote_sections")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError();
    return NextResponse.json({ section: data });
});

export const DELETE = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return missingParamError("id");

    const { data: section } = await supabase
        .from("quote_sections")
        .select("id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (!section) return notFoundError("Section");

    const { error } = await supabase
        .from("quote_sections")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (error) return serverError();
    return NextResponse.json({ success: true });
});
