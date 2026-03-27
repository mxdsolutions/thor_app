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

    const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Resolve performer names from profiles
    const userIds = [...new Set((data || []).map(a => a.performed_by).filter(Boolean))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
    }

    const activities = (data || []).map(a => ({
        ...a,
        performer: a.performed_by ? { id: a.performed_by, full_name: profileMap[a.performed_by] || "Unknown" } : null,
    }));

    return NextResponse.json({ activities });
}
