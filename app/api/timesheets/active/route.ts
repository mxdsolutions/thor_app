import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

const ACTIVE_SELECT =
    "*, job:jobs (id, job_title, reference_id)";

/** Returns the current user's open timer (end_at IS NULL) or `null`. */
export const GET = withAuth(async (_request, { supabase, user, tenantId }) => {
    const { data, error } = await supabase
        .from("timesheets")
        .select(ACTIVE_SELECT)
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .is("end_at", null)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return serverError(error);
    return NextResponse.json({ item: data ?? null });
});
