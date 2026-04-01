import { createClient } from "@/lib/supabase/server";

type PermissionAction = "read" | "write" | "delete";

/**
 * Check if a user has a specific permission within their tenant.
 */
export async function hasPermission(
    userId: string,
    tenantId: string,
    resource: string,
    action: PermissionAction
): Promise<boolean> {
    const supabase = await createClient();

    // Get user's role in this tenant
    const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

    if (!membership) return false;

    // Owner always has full access
    if (membership.role === "owner") return true;

    // Get role permissions
    const { data: roleData } = await supabase
        .from("tenant_roles")
        .select("permissions")
        .eq("tenant_id", tenantId)
        .eq("slug", membership.role)
        .single();

    if (!roleData?.permissions) return false;

    const permissions = roleData.permissions as Record<string, Record<string, boolean>>;

    // Check specific resource first
    if (permissions[resource]?.[action]) return true;

    // Fall back to parent resource
    const parentResource = resource.split(".")[0];
    if (parentResource !== resource && permissions[parentResource]?.[action]) return true;

    return false;
}
