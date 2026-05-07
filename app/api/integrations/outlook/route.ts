import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: connection } = await supabase
        .from("email_connections")
        .select("id, email_address, provider, created_at, signature_html")
        .eq("user_id", user.id)
        .eq("provider", "outlook")
        .single();

    if (!connection) {
        return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: true, connection });
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const signatureHtml = typeof body.signature_html === "string" ? body.signature_html : null;

    const { error } = await supabase
        .from("email_connections")
        .update({
            signature_html: signatureHtml,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "outlook");

    if (error) {
        return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Microsoft Identity has no clean per-token revoke for delegated tokens —
    // /me/revokeSignInSessions revokes ALL the user's MS sessions (incl.
    // Office.com), which is too heavy. We delete locally and rely on natural
    // refresh-token expiry. Document this for future review.

    const { error } = await supabase
        .from("email_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", "outlook");

    if (error) {
        return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
