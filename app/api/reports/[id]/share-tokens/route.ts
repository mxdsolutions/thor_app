import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, notFoundError } from "@/app/api/_lib/errors";
import { createShareTokenSchema } from "@/lib/validation";
import { generateShareToken, buildShareUrl } from "@/lib/reports/share-tokens";
import { sendReportShareEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/server";

const DEFAULT_EXPIRY_DAYS = 30;

// Per-recipient rate gate: max 5 share emails to the same address per report
// per hour. Stops accidental or malicious mail-bomb of an external recipient.
const MAX_TOKENS_PER_RECIPIENT_PER_HOUR = 5;

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { pathname } = new URL(request.url);
    const reportId = pathname.split("/")[3]; // /api/reports/[id]/share-tokens

    const { data, error } = await supabase
        .from("report_share_tokens")
        .select("id, token, recipient_email, recipient_name, message, expires_at, first_opened_at, submitted_at, submitted_by_email, submitted_by_name, revoked_at, email_sent_at, created_at, created_by")
        .eq("tenant_id", tenantId)
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });

    if (error) return serverError(error);
    return NextResponse.json({ items: data ?? [] });
});

export const POST = withAuth(async (request: NextRequest, { supabase, user, tenantId }) => {
    const { pathname } = new URL(request.url);
    const reportId = pathname.split("/")[3];

    const body = await request.json().catch(() => null);
    const validation = createShareTokenSchema.safeParse(body ?? {});
    if (!validation.success) return validationError(validation.error);

    const { recipient_email, recipient_name, message, expires_in_days } = validation.data;

    // Verify the report belongs to this tenant before issuing a token.
    const { data: report } = await supabase
        .from("reports")
        .select("id, title, template_id")
        .eq("id", reportId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (!report) return notFoundError("Report");
    if (!report.template_id) {
        return NextResponse.json(
            { error: "Reports without a template cannot be shared externally" },
            { status: 400 },
        );
    }

    // Rate gate: same (report, recipient_email) pair can't issue >N tokens/hour.
    if (recipient_email) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
            .from("report_share_tokens")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("report_id", reportId)
            .eq("recipient_email", recipient_email)
            .gte("created_at", oneHourAgo);

        if ((recentCount ?? 0) >= MAX_TOKENS_PER_RECIPIENT_PER_HOUR) {
            return NextResponse.json(
                {
                    error: `Too many share links sent to ${recipient_email} for this report. Try again in an hour.`,
                },
                { status: 429 },
            );
        }
    }

    const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name, slug, custom_domain, domain_verified, primary_color, logo_url")
        .eq("id", tenantId)
        .single();

    if (!tenant) return serverError(new Error("tenant not found"), "share-tokens.create");

    const days = expires_in_days ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const token = generateShareToken();
    const requestHost = request.headers.get("host") ?? "";
    const shareUrl = buildShareUrl(
        { custom_domain: tenant.custom_domain, domain_verified: tenant.domain_verified, slug: tenant.slug },
        token,
        requestHost,
    );

    const { data: inserted, error: insertError } = await supabase
        .from("report_share_tokens")
        .insert({
            token,
            report_id: reportId,
            tenant_id: tenantId,
            created_by: user.id,
            recipient_email: recipient_email || null,
            recipient_name: recipient_name || null,
            message: message || null,
            expires_at: expiresAt,
        })
        .select("id, token, recipient_email, recipient_name, message, expires_at, created_at, email_sent_at")
        .single();

    if (insertError || !inserted) return serverError(insertError, "share-tokens.create");

    // Best-effort email — failures don't block link creation.
    let emailSent = false;
    if (recipient_email) {
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", user.id)
                .maybeSingle();

            await sendReportShareEmail({
                to: recipient_email,
                recipientName: recipient_name || null,
                tenantName: tenant.name,
                tenantLogoUrl: tenant.logo_url,
                tenantPrimaryColor: tenant.primary_color,
                senderName: profile?.full_name || profile?.email || tenant.name,
                replyTo: profile?.email || null,
                reportTitle: report.title,
                message: message || null,
                shareUrl,
                expiresAt,
                supabase,
            });
            emailSent = true;
        } catch (err) {
            console.error("[share-tokens.create] email failed", err);
        }
    }

    if (emailSent) {
        const admin = await createAdminClient();
        await admin
            .from("report_share_tokens")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", inserted.id);
    }

    // Best-effort activity log — never fail the request because audit failed.
    await supabase
        .from("activity_logs")
        .insert({
            entity_type: "report",
            entity_id: reportId,
            action: "shared",
            changes: { recipient_email: recipient_email ?? null, expires_at: expiresAt, email_sent: emailSent },
            performed_by: user.id,
            tenant_id: tenantId,
        });

    return NextResponse.json(
        {
            item: { ...inserted, email_sent_at: emailSent ? new Date().toISOString() : null },
            share_url: shareUrl,
        },
        { status: 201 },
    );
});
