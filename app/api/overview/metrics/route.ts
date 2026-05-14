import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (_request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "dashboard.financials", "read");
    if (denied) return denied;

    const { data, error } = await supabase.rpc("get_overview_metrics", {
        p_tenant_id: tenantId,
    });
    if (error) return serverError(error);
    return NextResponse.json(data || {});
});
