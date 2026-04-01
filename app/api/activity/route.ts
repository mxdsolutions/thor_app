import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, missingParamError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase }) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!entityType || !entityId) {
        return missingParamError("entity_type and entity_id");
    }

    const { data, error } = await supabase
        .from("activity_logs")
        .select(`
            *,
            performer:profiles!activity_logs_performed_by_fkey (
                id,
                full_name,
                email
            )
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) return serverError();

    const activities = (data || []).map(a => ({
        ...a,
        performer: a.performer || null,
    }));

    return NextResponse.json({ activities });
});
