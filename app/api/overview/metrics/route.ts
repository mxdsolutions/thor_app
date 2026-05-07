import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data, error } = await supabase.rpc("get_overview_metrics", {
        p_tenant_id: tenantId,
    });
    if (error) return serverError(error);
    return NextResponse.json(data || {});
});
