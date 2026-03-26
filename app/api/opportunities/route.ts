import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("opportunities")
        .select(`
            *,
            contact:contacts (
                id,
                first_name,
                last_name
            ),
            company:companies (
                id,
                name
            ),
            lead:leads (
                id,
                title
            ),
            assignee:profiles!opportunities_assigned_to_fkey (
                id,
                full_name
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ opportunities: data });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await supabase
        .from("opportunities")
        .insert({ ...body, created_by: user.id })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ opportunity: data }, { status: 201 });
}
