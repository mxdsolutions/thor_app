import { NextResponse } from "next/server";
import { resolveShareToken } from "./_resolve";
import { ipFromRequest, isOverLimit, recordMiss } from "./_rate-limit";
import { sharedReportAutosaveSchema } from "@/lib/validation";
import { getTenantBranding } from "@/lib/tenant";

const MAX_AUTOSAVE_BYTES = 1_000_000;

function notFound() {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function rateLimited() {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

/** Build a state-only payload for known tokens that aren't usable
 *  (revoked / expired / archived). Includes branding so the public page can
 *  render an on-brand explainer instead of a generic 404. */
async function stateOnlyPayload(state: "revoked" | "expired" | "archived", tenantId: string) {
    const branding = await getTenantBranding(tenantId);
    return NextResponse.json({ state, tenant: branding });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const ip = ipFromRequest(request);
    if (isOverLimit(ip)) return rateLimited();

    const resolved = await resolveShareToken(token);
    if (resolved.kind === "missing") {
        recordMiss(ip);
        return notFound();
    }

    if (resolved.kind === "revoked") {
        return stateOnlyPayload("revoked", resolved.row.tenant_id);
    }
    if (resolved.kind === "expired") {
        return stateOnlyPayload("expired", resolved.row.tenant_id);
    }

    const { admin, row } = resolved;

    // Stamp first_opened_at on first hit. Best-effort; race with autosave is fine.
    if (!row.first_opened_at) {
        await admin
            .from("report_share_tokens")
            .update({ first_opened_at: new Date().toISOString() })
            .eq("id", row.id)
            .is("first_opened_at", null);
    }

    const [{ data: report }, branding] = await Promise.all([
        admin
            .from("reports")
            .select("id, title, type, status, template_id, data, archived_at")
            .eq("id", row.report_id)
            .eq("tenant_id", row.tenant_id)
            .maybeSingle(),
        getTenantBranding(row.tenant_id),
    ]);

    if (!report) return notFound();

    if (report.archived_at) {
        return stateOnlyPayload("archived", row.tenant_id);
    }

    if (!report.template_id) return notFound();

    const { data: template } = await admin
        .from("report_templates")
        .select("id, name, schema")
        .eq("id", report.template_id)
        .eq("is_active", true)
        .maybeSingle();

    if (!template) return notFound();

    return NextResponse.json({
        state: "active",
        report: {
            id: report.id,
            title: report.title,
            type: report.type,
            status: report.status,
            data: (report.data && typeof report.data === "object") ? report.data : {},
        },
        template: {
            id: template.id,
            name: template.name,
            schema: template.schema,
        },
        tenant: branding,
        share: {
            expires_at: row.expires_at,
            message: row.message,
            recipient_name: row.recipient_name,
            submitted_at: row.submitted_at,
            submitted_by_name: row.submitted_by_name,
            submitted_by_email: row.submitted_by_email,
        },
    });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const ip = ipFromRequest(request);
    if (isOverLimit(ip)) return rateLimited();

    const raw = await request.text();
    if (raw.length > MAX_AUTOSAVE_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = sharedReportAutosaveSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const resolved = await resolveShareToken(token);
    if (resolved.kind === "missing") {
        recordMiss(ip);
        return notFound();
    }
    if (resolved.kind === "revoked" || resolved.kind === "expired") {
        return NextResponse.json({ error: "Link no longer accepts edits", state: resolved.kind }, { status: 410 });
    }

    const { admin, row } = resolved;

    // Block edits if the report has been archived by the dashboard.
    const { data: current } = await admin
        .from("reports")
        .select("status, archived_at")
        .eq("id", row.report_id)
        .eq("tenant_id", row.tenant_id)
        .maybeSingle();

    if (!current || current.archived_at) {
        return NextResponse.json({ error: "Report is no longer available", state: "archived" }, { status: 410 });
    }

    const updates: Record<string, unknown> = { data: validation.data.data };

    // Flip draft → in_progress on first save so the dashboard reflects activity.
    // Don't touch status if already submitted — keep the "submitted" badge.
    if (current.status === "draft") {
        updates.status = "in_progress";
    }

    const { error } = await admin
        .from("reports")
        .update(updates)
        .eq("id", row.report_id)
        .eq("tenant_id", row.tenant_id);

    if (error) {
        console.error("[public-reports.autosave]", error);
        return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
