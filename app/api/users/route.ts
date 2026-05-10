import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";

const VALID_ROLES = ["owner", "admin", "manager", "member", "viewer"];

type TenantUserRow = {
    user_id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    hourly_rate: number | null;
    profile_created_at: string | null;
    role: string;
    joined_at: string;
    last_sign_in_at: string | null;
};

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    // Members come from a SECURITY DEFINER RPC that joins tenant_memberships
    // + profiles + auth.users in one round-trip. We can't read auth.users via
    // PostgREST (auth schema isn't exposed) so the function does it for us.
    // Outstanding invites still come from tenant_invites — they don't have a
    // membership row yet — and render as "Invited" rows so the owner sees the
    // new teammate immediately after sending the invite.
    const nowIso = new Date().toISOString();
    const [membersRes, invitesRes] = await Promise.all([
        supabase.rpc("get_tenant_users", { p_tenant_id: tenantId }),
        supabase
            .from("tenant_invites")
            .select("id, email, role, created_at")
            .eq("tenant_id", tenantId)
            .is("accepted_at", null)
            .gt("expires_at", nowIso),
    ]);

    if (membersRes.error) return serverError(membersRes.error);
    if (invitesRes.error) return serverError(invitesRes.error);

    const members = (membersRes.data ?? []) as TenantUserRow[];
    const invites = invitesRes.data ?? [];

    // Invitee profiles by email — the auth user already exists from
    // inviteUserByEmail and the handle_new_user trigger creates a profile row.
    const inviteEmails = invites.map(i => i.email);
    const inviteProfilesRes = inviteEmails.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, created_at, position, hourly_rate")
            .in("email", inviteEmails)
        : { data: [] as Array<Record<string, unknown>> };

    const profileByEmail = new Map(
        (inviteProfilesRes.data || []).map(p => [p.email as string, p]),
    );

    const memberUsers = members.map(m => ({
        id: m.user_id,
        email: m.email,
        created_at: m.profile_created_at,
        last_sign_in_at: m.last_sign_in_at,
        user_metadata: {
            full_name: m.full_name,
            avatar_url: m.avatar_url,
            user_type: m.role,
            position: m.job_title,
            hourly_rate: m.hourly_rate,
        },
        tenant_role: m.role,
        joined_at: m.joined_at,
        is_pending: false,
    }));

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
                created_at: (profile?.created_at as string | undefined) ?? i.created_at,
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
