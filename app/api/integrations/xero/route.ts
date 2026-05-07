import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { revokeXeroToken } from "@/lib/xero";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data: connection } = await supabase
        .from("xero_connections")
        .select(
            "id, xero_tenant_name, status, last_sync_at, created_at, updated_at"
        )
        .eq("tenant_id", tenantId)
        .single();

    if (!connection || connection.status === "pending_org_selection") {
        return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: true, connection });
});

export const DELETE = withAuth(async (_request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "integrations.xero.connect",
        "write"
    );
    if (denied) return denied;

    // Best-effort revoke at Xero before nuking the local row, so a leaked
    // DB snapshot can't be replayed. Failure is non-fatal — the local
    // delete below still runs.
    const { data: connection } = await supabase
        .from("xero_connections")
        .select("refresh_token")
        .eq("tenant_id", tenantId)
        .maybeSingle();
    if (connection?.refresh_token) {
        await revokeXeroToken(connection.refresh_token);
    }

    // Delete sync mappings first
    await supabase
        .from("xero_sync_mappings")
        .delete()
        .eq("tenant_id", tenantId);

    // Delete connection
    const { error } = await supabase
        .from("xero_connections")
        .delete()
        .eq("tenant_id", tenantId);

    if (error) {
        return NextResponse.json(
            { error: "Failed to disconnect" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
});
