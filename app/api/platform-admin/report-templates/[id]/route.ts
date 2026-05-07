import { NextRequest, NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { serverError, validationError, notFoundError } from "@/app/api/_lib/errors";
import { reportTemplateUpdateSchema } from "@/lib/validation";

export const GET = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const id = request.nextUrl.pathname.split("/").pop();

    const { data, error } = await adminClient
        .from("report_templates")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) return notFoundError("Report template");

    return NextResponse.json({ item: data });
});

export const PATCH = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const id = request.nextUrl.pathname.split("/").pop();
    const body = await request.json();
    const validation = reportTemplateUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await adminClient
        .from("report_templates")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return serverError(error);
    if (!data) return notFoundError("Report template");

    return NextResponse.json({ item: data });
});

export const DELETE = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const id = request.nextUrl.pathname.split("/").pop();

    const { error } = await adminClient
        .from("report_templates")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return serverError(error);

    return NextResponse.json({ success: true });
});
