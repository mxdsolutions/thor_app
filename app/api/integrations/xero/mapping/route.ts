import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { missingParamError, serverError } from "@/app/api/_lib/errors";

const ALLOWED_TYPES = ["company", "contact", "invoice", "quote"] as const;

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const thorId = searchParams.get("mxd_id");

    if (!entityType) return missingParamError("entity_type");
    if (!thorId) return missingParamError("mxd_id");
    if (!ALLOWED_TYPES.includes(entityType as typeof ALLOWED_TYPES[number])) {
        return NextResponse.json({ mapping: null });
    }

    const { data, error } = await supabase
        .from("xero_sync_mappings")
        .select("xero_id, last_synced_at, sync_direction")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .eq("mxd_id", thorId)
        .maybeSingle();

    if (error) return serverError();

    return NextResponse.json({ mapping: data || null });
});
