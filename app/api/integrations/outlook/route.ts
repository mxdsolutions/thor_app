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
        .select("id, email_address, provider, created_at")
        .eq("user_id", user.id)
        .eq("provider", "outlook")
        .single();

    if (!connection) {
        return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: true, connection });
}

export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
