import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { DEFAULTS_BY_ENTITY, type EntityType } from "@/lib/status-config";

export const GET = withAuth(async (request: NextRequest, { supabase, tenantId }) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type") as EntityType | null;

    if (!entityType || !DEFAULTS_BY_ENTITY[entityType]) {
        return NextResponse.json(
            { error: "Invalid entity_type. Must be one of: lead, job" },
            { status: 400 },
        );
    }

    const { data, error } = await supabase
        .from("tenant_status_configs")
        .select("statuses")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .single();

    if (error || !data) {
        // Fall back to defaults if no config exists
        return NextResponse.json({ statuses: DEFAULTS_BY_ENTITY[entityType] });
    }

    return NextResponse.json({ statuses: data.statuses });
});
