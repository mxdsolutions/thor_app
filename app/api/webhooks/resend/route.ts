import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Resend signs webhooks with the Svix scheme: id, timestamp, body.
// See https://resend.com/docs/dashboard/webhooks/verify-webhooks
const SIG_HEADER = "svix-signature";
const ID_HEADER = "svix-id";
const TIMESTAMP_HEADER = "svix-timestamp";

type ResendEventType =
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.bounced"
    | "email.complained";

const SUPPRESSION_EVENTS: Record<string, "bounced" | "complained" | "delivery_delayed"> = {
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.delivery_delayed": "delivery_delayed",
};

function verifySignature(secret: string, id: string, timestamp: string, body: string, sigHeader: string) {
    // Resend sends "v1,<base64sig> v1,<base64sig> …" — any one match is enough.
    const signedContent = `${id}.${timestamp}.${body}`;
    const cleanedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const expected = createHmac("sha256", Buffer.from(cleanedSecret, "base64"))
        .update(signedContent)
        .digest("base64");

    const candidates = sigHeader.split(" ").map((s) => {
        const idx = s.indexOf(",");
        return idx === -1 ? s : s.slice(idx + 1);
    });

    return candidates.some((cand) => {
        try {
            const a = Buffer.from(cand, "base64");
            const b = Buffer.from(expected, "base64");
            return a.length === b.length && timingSafeEqual(a, b);
        } catch {
            return false;
        }
    });
}

export async function POST(request: NextRequest) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
        console.error("RESEND_WEBHOOK_SECRET is not configured");
        return new NextResponse(null, { status: 500 });
    }

    const sig = request.headers.get(SIG_HEADER);
    const id = request.headers.get(ID_HEADER);
    const timestamp = request.headers.get(TIMESTAMP_HEADER);
    if (!sig || !id || !timestamp) {
        return new NextResponse(null, { status: 400 });
    }

    const body = await request.text();

    if (!verifySignature(secret, id, timestamp, body, sig)) {
        return new NextResponse(null, { status: 400 });
    }

    let event: { type: ResendEventType; data: { email_id?: string; to?: string[]; from?: string } & Record<string, unknown> };
    try {
        event = JSON.parse(body);
    } catch {
        return new NextResponse(null, { status: 400 });
    }

    const reason = SUPPRESSION_EVENTS[event.type];
    if (!reason) {
        // Acknowledge other events (sent, delivered) without action.
        return new NextResponse(null, { status: 200 });
    }

    const recipients = Array.isArray(event.data.to) ? event.data.to : [];
    if (recipients.length === 0) {
        return new NextResponse(null, { status: 200 });
    }

    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    for (const rawEmail of recipients) {
        const email = rawEmail.trim().toLowerCase();
        if (!email) continue;

        const { data: existing } = await supabase
            .from("email_suppressions")
            .select("occurrences")
            .eq("email", email)
            .maybeSingle();

        if (existing) {
            await supabase
                .from("email_suppressions")
                .update({
                    reason,
                    last_seen_at: now,
                    occurrences: (existing.occurrences ?? 0) + 1,
                    last_payload: event.data,
                })
                .eq("email", email);
        } else {
            await supabase.from("email_suppressions").insert({
                email,
                reason,
                first_seen_at: now,
                last_seen_at: now,
                occurrences: 1,
                last_payload: event.data,
            });
        }
    }

    return new NextResponse(null, { status: 200 });
}
