import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphFetch, OutlookReauthRequired } from "@/lib/microsoft-graph";
import { replyEmailSchema } from "@/lib/validation";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = replyEmailSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Validation failed", details: validation.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        const res = await graphFetch(supabase, user.id, `/me/messages/${id}/reply`, {
            method: "POST",
            body: JSON.stringify({ comment: validation.data.comment }),
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json(
                { error: err.error?.message || "Failed to send reply" },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        if (err instanceof OutlookReauthRequired) {
            return NextResponse.json({ error: err.message, code: "OUTLOOK_REAUTH_REQUIRED" }, { status: 401 });
        }
        const message = err instanceof Error ? err.message : "Failed to send reply";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
