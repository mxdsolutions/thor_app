import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { noteSchema } from "@/lib/validation";

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
        .from("notes")
        .select(`
            *,
            author:profiles!notes_created_by_fkey (
                id,
                full_name,
                email
            )
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const notes = (data || []).map(n => ({
        ...n,
        author: n.author || null,
    }));

    return NextResponse.json({ notes });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = noteSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { entity_type, entity_id, content, mentioned_user_ids } = validation.data;

    // Insert note and fetch author profile in parallel
    const [noteResult, profileResult] = await Promise.all([
        supabase
            .from("notes")
            .insert({ entity_type, entity_id, content, created_by: user.id })
            .select("*")
            .single(),
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", user.id)
            .single(),
    ]);

    if (noteResult.error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const profile = profileResult.data;
    const authorName = profile?.full_name || profile?.email || "Someone";

    if (mentioned_user_ids && mentioned_user_ids.length > 0) {
        const uniqueMentions = [...new Set(mentioned_user_ids)].filter(id => id !== user.id);
        if (uniqueMentions.length > 0) {
            const notifications = uniqueMentions.map(userId => ({
                user_id: userId,
                type: "mention",
                title: `${authorName} mentioned you in a note`,
                body: content.length > 120 ? content.slice(0, 120) + "..." : content,
                entity_type,
                entity_id,
                note_id: noteResult.data.id,
                created_by: user.id,
            }));
            await supabase.from("notifications").insert(notifications);
        }
    }

    return NextResponse.json({
        note: {
            ...noteResult.data,
            author: profile ? { id: profile.id, full_name: profile.full_name || profile.email || "Unknown" } : null,
        }
    }, { status: 201 });
}
