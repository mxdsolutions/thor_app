import { NextResponse } from "next/server";
import { resolveShareToken } from "../_resolve";
import { ipFromRequest, isOverLimit, recordMiss } from "../_rate-limit";
import { submitSharedReportSchema } from "@/lib/validation";
import { validateReportSubmission } from "@/lib/reports/validate-submission";
import type { TemplateSchema } from "@/lib/report-templates/types";

const MAX_BYTES = 1_000_000;

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const ip = ipFromRequest(request);
    if (isOverLimit(ip)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = submitSharedReportSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Validation failed", details: validation.error.flatten().fieldErrors },
            { status: 400 },
        );
    }

    const { data, submitted_by_email, submitted_by_name } = validation.data;

    const resolved = await resolveShareToken(token);
    if (resolved.kind === "missing") {
        recordMiss(ip);
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (resolved.kind === "revoked" || resolved.kind === "expired") {
        return NextResponse.json({ error: "Link no longer accepts submissions", state: resolved.kind }, { status: 410 });
    }

    const { admin, row } = resolved;

    // Block re-submits against an archived report.
    const { data: report } = await admin
        .from("reports")
        .select("template_id, archived_at")
        .eq("id", row.report_id)
        .eq("tenant_id", row.tenant_id)
        .maybeSingle();

    if (!report || report.archived_at) {
        return NextResponse.json({ error: "Report is no longer available", state: "archived" }, { status: 410 });
    }

    if (!report.template_id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: template } = await admin
        .from("report_templates")
        .select("schema")
        .eq("id", report.template_id)
        .eq("is_active", true)
        .maybeSingle();

    const schema = (template?.schema && (template.schema as TemplateSchema).version === 1
        ? (template.schema as TemplateSchema)
        : null);

    if (!schema) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const errors = validateReportSubmission(schema, data);
    if (errors.length > 0) {
        return NextResponse.json(
            { error: "Validation failed", issues: errors },
            { status: 400 },
        );
    }

    // mark_share_submission is now soft: first call stamps submitted_at +
    // notifies; subsequent calls just persist new data and skip the notification.
    const { data: rpcData, error: rpcError } = await admin.rpc("mark_share_submission", {
        p_token: token,
        p_data: data,
        p_email: submitted_by_email,
        p_name: submitted_by_name,
    });

    if (rpcError) {
        const msg = rpcError.message || "";
        if (msg.includes("token_revoked") || msg.includes("token_expired") || msg.includes("invalid_token")) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        console.error("[public-reports.submit]", rpcError);
        return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }

    const firstSubmission = !!(rpcData && typeof rpcData === "object" && "first_submission" in rpcData && rpcData.first_submission);

    // Activity log only on first submission to avoid noise on every edit.
    if (firstSubmission) {
        await admin
            .from("activity_logs")
            .insert({
                entity_type: "report",
                entity_id: row.report_id,
                action: "submitted",
                changes: {
                    submitted_by_email,
                    submitted_by_name,
                    share_token_id: row.id,
                },
                performed_by: null,
                tenant_id: row.tenant_id,
            });
    }

    return NextResponse.json({ ok: true, first_submission: firstSubmission });
}
