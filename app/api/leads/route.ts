import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadSchema, leadUpdateSchema } from "@/lib/validation";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const search = searchParams.get("search")?.trim().slice(0, 100);

    let query = supabase
        .from("leads")
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
            assignee:profiles!leads_assigned_to_fkey (
                id,
                full_name
            )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`title.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ leads: data, total: count || 0 });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = leadSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("leads")
        .insert({ ...validation.data, created_by: user.id })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
}

export async function PATCH(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = leadUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
}
