import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
    DEFAULT_JOB_STATUSES,
} from "@/lib/status-config";
import { DEFAULT_MODULES } from "@/lib/module-config";

export type TenantBranding = {
    id: string;
    name: string;
    slug: string;
    company_name: string | null;
    logo_url: string | null;
    logo_dark_url: string | null;
    report_cover_url: string | null;
    primary_color: string;
    plan: string;
    max_users: number;
    status: string;
    custom_domain: string | null;
    domain_verified: boolean;
    address: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
    reference_prefix: string | null;
};

export type TenantMembership = {
    tenant_id: string;
    role: string;
    permissions: Record<string, { read?: boolean; write?: boolean; delete?: boolean }>;
};

/**
 * Get the current tenant ID from request headers (set by middleware).
 * Falls back to JWT app_metadata if header is not set.
 */
export async function getTenantId(): Promise<string> {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (tenantId) return tenantId;

    // Fallback: read from user's JWT claims
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const fromJwt = user?.app_metadata?.active_tenant_id;
    if (fromJwt) return fromJwt;

    throw new Error("No tenant context available");
}

/**
 * Get authenticated context with tenant info for API routes.
 */
export async function getAuthenticatedContext() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error("Unauthorized");
    }
    const tenantId = await getTenantId();
    return { supabase, user, tenantId };
}

/**
 * Fetch tenant branding data for the current tenant.
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, company_name, logo_url, logo_dark_url, report_cover_url, primary_color, plan, max_users, status, custom_domain, domain_verified, address, phone, email, abn, reference_prefix")
        .eq("id", tenantId)
        .single();

    if (error || !data) return null;
    return data;
}

/**
 * Get the current user's membership and permissions for a tenant.
 */
export async function getTenantMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
    const supabase = await createClient();

    // Get membership with role
    const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("tenant_id, role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

    if (!membership) return null;

    // Get role permissions
    const { data: roleData } = await supabase
        .from("tenant_roles")
        .select("permissions")
        .eq("tenant_id", tenantId)
        .eq("slug", membership.role)
        .single();

    return {
        tenant_id: membership.tenant_id,
        role: membership.role,
        permissions: (roleData?.permissions as Record<string, { read?: boolean; write?: boolean; delete?: boolean }>) || {},
    };
}

/**
 * Set the active tenant for a user (updates JWT app_metadata).
 */
export async function setActiveTenant(userId: string, tenantId: string) {
    const admin = await createAdminClient();
    await admin.auth.admin.updateUserById(userId, {
        app_metadata: { active_tenant_id: tenantId },
    });
}

/**
 * Seed default roles for a new tenant.
 */
export async function seedDefaultRoles(tenantId: string) {
    const admin = await createAdminClient();

    const defaultRoles = [
        {
            name: "Owner", slug: "owner", is_system: true,
            permissions: {
                crm: { read: true, write: true, delete: true },
                operations: { read: true, write: true, delete: true },
                settings: { read: true, write: true, delete: true },
                "settings.users": { read: true, write: true, delete: true },
                "settings.branding": { read: true, write: true },
            },
        },
        {
            name: "Admin", slug: "admin", is_system: true,
            permissions: {
                crm: { read: true, write: true, delete: true },
                operations: { read: true, write: true, delete: true },
                settings: { read: true, write: true },
                "settings.users": { read: true, write: true, delete: true },
                "settings.branding": { read: true },
            },
        },
        {
            name: "Manager", slug: "manager", is_system: true,
            permissions: {
                crm: { read: true, write: true, delete: true },
                operations: { read: true, write: true, delete: true },
                settings: { read: true },
                "settings.users": { read: true },
            },
        },
        {
            name: "Member", slug: "member", is_system: true,
            permissions: {
                crm: { read: true, write: true },
                operations: { read: true, write: true },
            },
        },
        {
            name: "Viewer", slug: "viewer", is_system: true,
            permissions: {
                crm: { read: true },
                operations: { read: true },
            },
        },
    ];

    await admin.from("tenant_roles").insert(
        defaultRoles.map((r) => ({ tenant_id: tenantId, ...r }))
    );
}

/**
 * Seed default status configs for a new tenant.
 */
export async function seedDefaultStatuses(tenantId: string) {
    const admin = await createAdminClient();

    await admin.from("tenant_status_configs").insert([
        { tenant_id: tenantId, entity_type: "job", statuses: DEFAULT_JOB_STATUSES },
    ]);
}

/**
 * Seed default module access for a new tenant (all enabled).
 */
export async function seedDefaultModules(tenantId: string) {
    const admin = await createAdminClient();

    await admin.from("tenant_modules").insert(
        DEFAULT_MODULES.map((m) => ({
            tenant_id: tenantId,
            module_id: m.module_id,
            enabled: m.enabled,
        })),
    );
}
