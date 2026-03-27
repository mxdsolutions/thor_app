import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch projects with client details
    const { data, error } = await supabase
        .from("projects")
        .select(`
            *,
            client:profiles!projects_client_id_fkey (
                id,
                full_name,
                email
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ projects: data });
}
