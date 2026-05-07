import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, notFoundError } from "@/app/api/_lib/errors";

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const { pathname } = new URL(request.url);
    // /api/reports/[id]/share-tokens/[tokenId]/revoke
    const parts = pathname.split("/");
    const reportId = parts[3];
    const tokenId = parts[5];

    const { data, error } = await supabase
        .from("report_share_tokens")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("id", tokenId)
        .eq("report_id", reportId)
        .eq("tenant_id", tenantId)
        .is("revoked_at", null)
        .is("submitted_at", null)
        .select("id, revoked_at")
        .maybeSingle();

    if (error) return serverError(error);
    if (!data) return notFoundError("Share link");

    return NextResponse.json({ item: data });
});
