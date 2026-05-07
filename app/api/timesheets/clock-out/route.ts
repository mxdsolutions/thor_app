import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

const ACTIVE_SELECT =
    "*, job:jobs (id, job_title, reference_id)";

/**
 * Close the current user's open timer. If no timer is open we 404 — the
 * caller almost always wants to know that the action was a no-op.
 */
export const POST = withAuth(async (_request, { supabase, user, tenantId }) => {
    const { data: open, error: findErr } = await supabase
        .from("timesheets")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .is("end_at", null)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (findErr) return serverError(findErr);
    if (!open) {
        return NextResponse.json({ error: "No active timer" }, { status: 404 });
    }

    const { data, error } = await supabase
        .from("timesheets")
        .update({ end_at: new Date().toISOString() })
        .eq("id", open.id)
        .eq("tenant_id", tenantId)
        .select(ACTIVE_SELECT)
        .single();

    if (error) return serverError(error);
    return NextResponse.json({ item: data });
});
