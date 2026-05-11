import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionAction, RoleSlug } from "@/lib/permissions";
import { forbiddenError, serverError } from "./errors";

type RolePermissions = Record<
    string,
    { read?: boolean; write?: boolean; delete?: boolean }
>;

export type PermissionCheck =
    | { allowed: true; role: RoleSlug }
    | { allowed: false; reason: "no_membership" | "no_role" | "denied"; role: RoleSlug | null };

const ROLE_RANK: Record<RoleSlug, number> = {
    owner: 5,
    admin: 4,
    manager: 3,
    member: 2,
    viewer: 1,
};

export function isRoleAtLeast(role: RoleSlug | string | null | undefined, minimum: RoleSlug): boolean {
    if (!role || !(role in ROLE_RANK)) return false;
    return ROLE_RANK[role as RoleSlug] >= ROLE_RANK[minimum];
}

function resolve(
    permissions: RolePermissions,
    role: string,
    resource: string,
    action: PermissionAction
): boolean {
    if (role === "owner") return true;
    if (permissions[resource]?.[action]) return true;
    const parent = resource.split(".")[0];
    if (parent !== resource && permissions[parent]?.[action]) return true;
    return false;
}

/**
 * Boolean-returning core of the permission system. Use this directly from
 * server actions or anywhere a `NextResponse` isn't appropriate. API route
 * handlers should prefer `requirePermission` which wraps this and returns
 * a ready-to-return 403/500.
 */
export async function checkPermission(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
    resource: string,
    action: PermissionAction
): Promise<PermissionCheck> {
    const { data: membership, error: membershipError } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

    if (membershipError || !membership) {
        return { allowed: false, reason: "no_membership", role: null };
    }

    const role = membership.role as RoleSlug;

    const { data: roleRow, error: roleError } = await supabase
        .from("tenant_roles")
        .select("permissions")
        .eq("tenant_id", tenantId)
        .eq("slug", role)
        .single();

    if (roleError || !roleRow) {
        return { allowed: false, reason: "no_role", role };
    }

    const allowed = resolve(
        (roleRow.permissions as RolePermissions) || {},
        role,
        resource,
        action
    );

    if (!allowed) return { allowed: false, reason: "denied", role };
    return { allowed: true, role };
}

/**
 * Gate an API route on a tenant-role permission. Returns `null` when the
 * request is allowed, or a 403/500 `NextResponse` the handler should return
 * as-is.
 *
 * ```ts
 * export const POST = withAuth(async (req, { supabase, user, tenantId }) => {
 *   const denied = await requirePermission(
 *     supabase, user.id, tenantId, "integrations.xero.sync", "write"
 *   );
 *   if (denied) return denied;
 *   // ... handler logic
 * });
 * ```
 *
 * Resolution rules: owner role bypasses the check; otherwise the specific
 * resource key is consulted first, falling back to its top-level prefix
 * (e.g. `crm.clients` -> `crm`) before denying.
 */
export async function requirePermission(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
    resource: string,
    action: PermissionAction
): Promise<NextResponse | null> {
    const result = await checkPermission(supabase, userId, tenantId, resource, action);
    if (result.allowed) return null;

    // no_role is a tenant misconfiguration (the role row is missing) — surface as
    // 500 so it pages, not as 403. The other two ("no_membership" / "denied") are
    // collapsed into a single generic 403: distinguishing them tells a probing
    // caller whether they're a member of a tenant they shouldn't know about.
    if (result.reason === "no_role") {
        return serverError(
            `Missing tenant_roles row for tenant=${tenantId} role=${result.role}`,
            "requirePermission"
        );
    }
    return forbiddenError("You do not have permission to perform this action");
}

/**
 * Hard owner-only gate. Used for capabilities that must never be granted to
 * non-owners regardless of what is stored in `tenant_roles.permissions` —
 * primarily the Roles & Permissions editor itself.
 */
export async function requireOwner(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string
): Promise<NextResponse | null> {
    const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

    if (!membership || membership.role !== "owner") {
        return forbiddenError("Only the workspace owner can perform this action");
    }

    return null;
}

/**
 * Look up the caller's role in the given tenant. Returns `null` if the user
 * isn't a member. Useful for server actions that need to compare roles
 * (e.g. preventing a Manager from assigning the Owner role).
 */
export async function getCallerRole(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string
): Promise<RoleSlug | null> {
    const { data } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();
    return (data?.role as RoleSlug | undefined) ?? null;
}
