import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!entityType || !entityId) {
        return NextResponse.json({ error: "Missing entity_type or entity_id" }, { status: 400 });
    }

    // Use JOIN instead of sequential queries
    const { data, error } = await supabase
        .from("activity_logs")
        .select(`
            *,
            performer:profiles!activity_logs_performed_by_fkey (
                id,
                full_name,
                email
            )
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const activities = (data || []).map(a => ({
        ...a,
        performer: a.performer || null,
    }));

    return NextResponse.json({ activities });
}
