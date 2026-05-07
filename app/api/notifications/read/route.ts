import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

export const PATCH = withAuth(async (request, { supabase, user }) => {
    const body = await request.json();
    const { notification_ids, mark_all } = body as { notification_ids?: string[]; mark_all?: boolean };

    if (mark_all) {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", user.id)
            .eq("read", false);

        if (error) return serverError(error);
    } else if (notification_ids && notification_ids.length > 0) {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", user.id)
            .in("id", notification_ids);

        if (error) return serverError(error);
    } else {
        return NextResponse.json({ error: "Provide notification_ids or mark_all" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
});
