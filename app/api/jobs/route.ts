import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobSchema, jobUpdateSchema } from "@/lib/validation";

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
        .from("jobs")
        .select(`
            *,
            project:projects!jobs_project_id_fkey (
                id,
                title
            ),
            assignees:job_assignees (
                user:profiles (
                    id,
                    full_name,
                    email
                )
            ),
            opportunity:opportunities (
                id,
                title
            ),
            company:companies (
                id,
                name
            )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const jobs = (data || []).map((job: any) => ({
        ...job,
        assignees: (job.assignees || []).map((a: any) => a.user).filter(Boolean),
    }));

    return NextResponse.json({ jobs, total: count || 0 });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignee_ids, ...rest } = body;
    const validation = jobSchema.safeParse(rest);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("jobs")
        .insert({ ...validation.data, created_by: user.id })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
        await supabase
            .from("job_assignees")
            .insert(assignee_ids.map((uid: string) => ({ job_id: data.id, user_id: uid })));
    }

    return NextResponse.json({ job: data }, { status: 201 });
}

export async function PATCH(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignee_ids, ...rest } = body;
    const validation = jobUpdateSchema.safeParse(rest);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("jobs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (Array.isArray(assignee_ids)) {
        await supabase.from("job_assignees").delete().eq("job_id", id);
        if (assignee_ids.length > 0) {
            await supabase
                .from("job_assignees")
                .insert(assignee_ids.map((uid: string) => ({ job_id: id, user_id: uid })));
        }
    }

    return NextResponse.json({ job: data });
}
