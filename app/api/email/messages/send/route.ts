import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphFetch } from "@/lib/microsoft-graph";
import { sendEmailSchema } from "@/lib/validation";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = sendEmailSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Validation failed", details: validation.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

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
}
