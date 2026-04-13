import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError } from "@/app/api/_lib/errors";
import { graphFetch, OutlookReauthRequired } from "@/lib/microsoft-graph";
import { sendEmailSchema } from "@/lib/validation";

export const POST = withAuth(async (request, { supabase, user }) => {
    const body = await request.json();
    const validation = sendEmailSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { to, cc, subject, body: emailBody, contentType, attachments } = validation.data;

    try {
        const message: Record<string, unknown> = {
            subject,
            body: {
                contentType: contentType || "HTML",
                content: emailBody,
            },
            toRecipients: to.map((addr) => ({
                emailAddress: { address: addr },
            })),
            ccRecipients: cc?.map((addr) => ({
                emailAddress: { address: addr },
            })) || [],
        };

        if (attachments && attachments.length > 0) {
            message.attachments = attachments.map((att) => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: att.name,
                contentType: att.contentType,
                contentBytes: att.contentBytes,
            }));
        }

        const res = await graphFetch(supabase, user.id, "/me/sendMail", {
            method: "POST",
            body: JSON.stringify({ message }),
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json(
                { error: err.error?.message || "Failed to send email" },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        if (err instanceof OutlookReauthRequired) {
            return NextResponse.json({ error: err.message, code: "OUTLOOK_REAUTH_REQUIRED" }, { status: 401 });
        }
        const message = err instanceof Error ? err.message : "Failed to send email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
