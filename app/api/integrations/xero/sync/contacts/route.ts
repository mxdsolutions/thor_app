import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { pullContactsFromXero } from "@/lib/xero-sync";

export const POST = withAuth(async (_request, { supabase, user, tenantId }) => {
    // Check connection exists
    const { data: connection } = await supabase
        .from("xero_connections")
        .select("last_sync_at, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

    if (!connection) {
        return NextResponse.json(
            { error: "No active Xero connection" },
            { status: 400 }
        );
    }

    try {
        const result = await pullContactsFromXero(
            supabase,
            tenantId,
            user.id,
            connection.last_sync_at || undefined
        );

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Sync failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
