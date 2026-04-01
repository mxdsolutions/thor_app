import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError } from "@/app/api/_lib/errors";
import { graphFetch } from "@/lib/microsoft-graph";
import { sendEmailSchema } from "@/lib/validation";

export const POST = withAuth(async (request, { supabase, user }) => {
    const body = await request.json();
    const validation = sendEmailSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { to, cc, subject, body: emailBody, contentType } = validation.data;

    try {
        const res = await graphFetch(supabase, user.id, "/me/sendMail", {
            method: "POST",
            body: JSON.stringify({
                message: {
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
                },
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json(
                { error: err.error?.message || "Failed to send email" },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
});
