import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, missingParamError } from "@/app/api/_lib/errors";

type AggregatedRow = {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    changes: Record<string, { old: unknown; new: unknown }> | null;
    performed_by: string | null;
    tenant_id: string;
    created_at: string;
    performer_full_name: string | null;
    performer_email: string | null;
};

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const aggregate = searchParams.get("aggregate");

    if (!entityType || !entityId) {
        return missingParamError("entity_type and entity_id");
    }

    // Aggregated job feed: returns events for the job + every related entity
    // (quotes, invoices, reports, appointments, line items, assignees, sections).
    if (aggregate === "related" && entityType === "job") {
        const { data, error } = await supabase.rpc("get_job_activity", {
            p_job_id: entityId,
            p_limit: 100,
        });
        if (error) return serverError(error);

        const activities = ((data ?? []) as AggregatedRow[]).map((row) => ({
            id: row.id,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            action: row.action,
            changes: row.changes,
            created_at: row.created_at,
            performer: row.performed_by
                ? {
                      id: row.performed_by,
                      full_name: row.performer_full_name ?? row.performer_email ?? "Unknown",
                  }
                : null,
        }));
        return NextResponse.json({ activities });
    }

    // Default: events scoped to a single entity (existing behavior).
    const { data, error } = await supabase
        .from("activity_logs")
        .select(`
            *,
            performer:profiles!activity_logs_performed_by_fkey (
                id,
                full_name,
                email
            )
        `)
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) return serverError(error);

    const activities = (data || []).map(a => ({
        ...a,
        performer: a.performer || null,
    }));

    return NextResponse.json({ activities });
});
