import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch jobs with project and assignee details
    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            project:projects (
                id,
                title
            ),
            assigned_to:profiles!jobs_assigned_to_fkey (
                id,
                full_name,
                email
            )
        `)
        .order("scheduled_date", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: data });
}
