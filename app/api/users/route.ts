import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_ROLES = ["owner", "admin", "manager", "member", "viewer"];

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    // Fetch members and outstanding invites in parallel. Outstanding invites
    // (no accepted_at, not expired) get rendered as "Invited" rows so the
    // owner can see the new teammate immediately after sending the invite,
    // before they accept and a tenant_membership exists.
    const nowIso = new Date().toISOString();
    const [memberRes, inviteRes] = await Promise.all([
        supabase
            .from("tenant_memberships")
            .select("user_id, role, joined_at")
            .eq("tenant_id", tenantId),
        supabase
            .from("tenant_invites")
            .select("id, email, role, created_at")
            .eq("tenant_id", tenantId)
            .is("accepted_at", null)
            .gt("expires_at", nowIso),
    ]);

    if (memberRes.error) return serverError(memberRes.error);
    if (inviteRes.error) return serverError(inviteRes.error);

    const memberships = memberRes.data || [];
    const invites = inviteRes.data || [];

    const userIds = memberships.map(m => m.user_id);
    const inviteEmails = invites.map(i => i.email);

    // Profiles + auth.users.last_sign_in_at all in parallel. Profiles are
    // fetched twice (by id for members, by email for invitees — handle_new_user
    // trigger creates the row when inviteUserByEmail provisions the auth user).
    // last_sign_in_at lives on auth.users, which only the service-role client
    // can read; without this, every member shows as "Pending" forever.
    const adminClient = await createAdminClient();
    const [byIdRes, byEmailRes, authRes] = await Promise.all([
        userIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url, created_at, position, hourly_rate")
                .in("id", userIds)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        inviteEmails.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url, created_at, position, hourly_rate")
                .in("email", inviteEmails)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        userIds.length > 0
            ? adminClient
                .schema("auth")
                .from("users")
                .select("id, last_sign_in_at")
                .in("id", userIds)
            : Promise.resolve({ data: [] as Array<{ id: string; last_sign_in_at: string | null }> }),
    ]);

    const profileById = new Map((byIdRes.data || []).map(p => [p.id as string, p]));
    const profileByEmail = new Map((byEmailRes.data || []).map(p => [p.email as string, p]));
    const lastSignInById = new Map(
        (authRes.data || []).map((u) => [
            (u as { id: string }).id,
            (u as { last_sign_in_at: string | null }).last_sign_in_at,
        ]),
    );

    const memberUsers = memberships.map(m => {
        const profile = profileById.get(m.user_id);
        return {
            id: (profile?.id as string) || m.user_id,
            email: (profile?.email as string | undefined) ?? null,
            created_at: profile?.created_at,
            last_sign_in_at: lastSignInById.get(m.user_id) ?? null,
            user_metadata: {
                full_name: profile?.full_name,
                avatar_url: profile?.avatar_url,
                user_type: m.role,
                position: profile?.position,
                hourly_rate: profile?.hourly_rate,
            },
            tenant_role: m.role,
            joined_at: m.joined_at,
            is_pending: false,
        };
    });

    const memberEmailSet = new Set(memberUsers.map(u => u.email).filter(Boolean));
    const inviteUsers = invites
        // Hide invites that have already been accepted but the row wasn't
        // cleaned up — the membership row is the source of truth.
        .filter(i => !memberEmailSet.has(i.email))
        .map(i => {
            const profile = profileByEmail.get(i.email);
            return {
                id: (profile?.id as string) || `invite:${i.id}`,
                email: i.email,
                created_at: profile?.created_at ?? i.created_at,
                last_sign_in_at: null,
                user_metadata: {
                    full_name: profile?.full_name,
                    avatar_url: profile?.avatar_url,
                    user_type: i.role,
                    position: profile?.position,
                    hourly_rate: profile?.hourly_rate,
                },
                tenant_role: i.role,
                joined_at: i.created_at,
                is_pending: true,
            };
        });

    return NextResponse.json({ users: [...memberUsers, ...inviteUsers] });
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
