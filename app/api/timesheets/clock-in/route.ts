import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, validationError, notFoundError } from "@/app/api/_lib/errors";
import { timesheetClockInSchema } from "@/lib/validation";

const ACTIVE_SELECT =
    "*, job:jobs (id, job_title, reference_id)";

/**
 * Open a clock-in timer for the current user. The DB has a partial unique
 * index on (tenant_id, user_id) where end_at IS NULL, so a second open
 * timer for the same user errors out. We translate that into a 409.
 */
export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json().catch(() => ({}));
    const validation = timesheetClockInSchema.safeParse(body ?? {});
    if (!validation.success) return validationError(validation.error);

    if (validation.data.job_id) {
        const { data: jobRow } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", validation.data.job_id)
            .eq("tenant_id", tenantId)
            .maybeSingle();
        if (!jobRow) return notFoundError("Job");
    }

    const { data, error } = await supabase
        .from("timesheets")
        .insert({
            tenant_id: tenantId,
            user_id: user.id,
            created_by: user.id,
            job_id: validation.data.job_id ?? null,
            notes: validation.data.notes ?? null,
            start_at: new Date().toISOString(),
            end_at: null,
            source: "clock",
        })
        .select(ACTIVE_SELECT)
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "You already have an active timer. Clock out first." },
                { status: 409 },
            );
        }
        return serverError(error);
    }
    return NextResponse.json({ item: data }, { status: 201 });
});
