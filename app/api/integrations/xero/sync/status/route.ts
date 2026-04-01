import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    // Get connection info
    const { data: connection } = await supabase
        .from("xero_connections")
        .select("last_sync_at, status, xero_tenant_name")
        .eq("tenant_id", tenantId)
        .single();

    if (!connection) {
        return NextResponse.json({ connected: false });
    }

    // Get sync mapping counts
    const entityTypes = ["company", "contact", "invoice", "quote"];
    const counts: Record<string, number> = {};

    for (const type of entityTypes) {
        const { count } = await supabase
            .from("xero_sync_mappings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("entity_type", type);
        counts[type] = count || 0;
    }

    // Get recent errors
    const { data: recentErrors } = await supabase
        .from("xero_sync_log")
        .select("entity_type, error_message, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(5);

    return NextResponse.json({
        connected: true,
        status: connection.status,
        xero_tenant_name: connection.xero_tenant_name,
        last_sync_at: connection.last_sync_at,
        synced_counts: counts,
        recent_errors: recentErrors || [],
    });
});
