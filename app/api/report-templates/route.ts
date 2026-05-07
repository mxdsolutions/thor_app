import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";

export const GET = withAuth(async () => {
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient
        .from("report_templates")
        .select("id, name, slug, description, category, schema, version")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) return serverError(error);

    return NextResponse.json({ items: data || [] });
});
