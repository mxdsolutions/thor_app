import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError, missingParamError } from "@/app/api/_lib/errors";
import { noteSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!entityType || !entityId) {
        return missingParamError("entity_type and entity_id");
    }

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

    if (error) return serverError();

    const notes = (data || []).map(n => ({
        ...n,
        author: n.author || null,
    }));

    return NextResponse.json({ notes });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = noteSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { entity_type, entity_id, content, mentioned_user_ids } = validation.data;

    const [noteResult, profileResult] = await Promise.all([
        supabase
            .from("notes")
            .insert({ entity_type, entity_id, content, created_by: user.id, tenant_id: tenantId })
            .select("*")
            .single(),
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", user.id)
            .single(),
    ]);

    if (noteResult.error) return serverError();

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
                tenant_id: tenantId,
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
});
