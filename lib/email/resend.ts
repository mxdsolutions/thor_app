import { renderReportShareEmail, type ReportShareEmailProps } from "./templates/ReportShareEmail";
import type { SupabaseClient } from "@supabase/supabase-js";

const RESEND_API = "https://api.resend.com/emails";

export class EmailAddressSuppressed extends Error {
    code = "EMAIL_ADDRESS_SUPPRESSED" as const;
    constructor(public address: string, public reason: string) {
        super(`Address ${address} is suppressed (${reason})`);
        this.name = "EmailAddressSuppressed";
    }
}

/**
 * Returns the suppression reason for an address, or null if it's deliverable.
 * Callers should check this before sending; the send path here also checks.
 */
export async function isEmailSuppressed(
    supabase: SupabaseClient,
    email: string,
): Promise<string | null> {
    const { data } = await supabase
        .from("email_suppressions")
        .select("reason")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
    return data?.reason ?? null;
}

type SendArgs = {
    to: string;
    recipientName: string | null;
    tenantName: string;
    tenantLogoUrl: string | null;
    tenantPrimaryColor: string;
    senderName: string;
    replyTo: string | null;
    reportTitle: string;
    message: string | null;
    shareUrl: string;
    expiresAt: string;
    /** When provided, the suppression list is checked before sending. */
    supabase?: SupabaseClient;
};

/** Sends the THOR-branded share-link email via Resend.
 *  Throws on transport / API error so callers can degrade gracefully.
 *  Throws EmailAddressSuppressed if the recipient is on the suppression list. */
export async function sendReportShareEmail(args: SendArgs): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    if (args.supabase) {
        const reason = await isEmailSuppressed(args.supabase, args.to);
        if (reason) {
            throw new EmailAddressSuppressed(args.to, reason);
        }
    }

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "noreply@buildthor.com.au";
    const fromName = `${args.tenantName} via THOR`;
    const subject = `${args.tenantName} — please complete: ${args.reportTitle}`;

    const props: ReportShareEmailProps = {
        recipientName: args.recipientName,
        tenantName: args.tenantName,
        tenantLogoUrl: args.tenantLogoUrl,
        tenantPrimaryColor: args.tenantPrimaryColor,
        senderName: args.senderName,
        reportTitle: args.reportTitle,
        message: args.message,
        shareUrl: args.shareUrl,
        expiresAt: args.expiresAt,
    };

    const html = renderReportShareEmail(props);

    const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [args.to],
            subject,
            html,
            ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        }),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Resend ${res.status}: ${errBody.slice(0, 200)}`);
    }
}
