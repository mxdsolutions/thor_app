import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation";

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
        .from("contacts")
        .select(`
            *,
            company:companies (
                id,
                name
            )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ contacts: data, total: count || 0 });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("contacts")
        .insert({ ...validation.data, created_by: user.id })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ contact: data }, { status: 201 });
}
