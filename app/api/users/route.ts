import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";

const VALID_ROLES = ["owner", "admin", "manager", "member", "viewer"];

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data: memberships, error: memberError } = await supabase
        .from("tenant_memberships")
        .select("user_id, role, joined_at")
        .eq("tenant_id", tenantId);

    if (memberError) return serverError(memberError);

    const userIds = (memberships || []).map(m => m.user_id);

    const { data: profiles } = userIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, created_at, position, hourly_rate")
            .in("id", userIds)
        : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const users = (memberships || []).map(m => {
        const profile = profileMap.get(m.user_id);
        return {
            id: profile?.id || m.user_id,
            email: profile?.email,
            created_at: profile?.created_at,
            last_sign_in_at: null,
            user_metadata: {
                full_name: profile?.full_name,
                avatar_url: profile?.avatar_url,
                user_type: m.role,
                position: profile?.position,
                hourly_rate: profile?.hourly_rate,
            },
            tenant_role: m.role,
            joined_at: m.joined_at,
        };
    });

    return NextResponse.json({ users });
});

export const PATCH = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role || !VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: "Valid user_id and role are required" }, { status: 400 });
    }

    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "settings.users",
        "write"
    );
    if (denied) return denied;

    // Fetch caller's role for the owner-assignment edge case below.
    const { data: callerMembership } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    // Prevent changing your own role
    if (user_id === user.id) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    // Prevent non-owners from assigning the owner role
    if (role === "owner" && callerMembership?.role !== "owner") {
        return NextResponse.json({ error: "Only owners can assign the owner role" }, { status: 403 });
    }

    const { error } = await supabase
        .from("tenant_memberships")
        .update({ role })
        .eq("user_id", user_id)
        .eq("tenant_id", tenantId);

    if (error) return serverError(error);

    return NextResponse.json({ success: true });
});
