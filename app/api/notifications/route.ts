import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (_request, { supabase, user }) => {
    const { data, error } = await supabase
        .from("notifications")
        .select("*, creator:created_by(id, full_name, email)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) return serverError(error);

    const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

    return NextResponse.json({ notifications: data || [], unread_count: count || 0 });
});
