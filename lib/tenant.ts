import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
    DEFAULT_JOB_STATUSES,
} from "@/lib/status-config";
import { DEFAULT_MODULES } from "@/lib/module-config";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";

export type TenantBranding = {
    id: string;
    name: string;
    slug: string;
    company_name: string | null;
    logo_url: string | null;
    logo_dark_url: string | null;
    report_cover_url: string | null;
    primary_color: string;
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

// Postgres `uuid` shape — same regex as `pgUuid` in lib/validation.ts. Kept
// inline here to avoid pulling the full Zod-dependent validation module into
// every server component / action that calls getTenantId(). Update both if
// the canonical shape ever changes.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Get the current tenant ID from request headers (set by middleware).
 * Falls back to JWT app_metadata if the header is missing or malformed.
 *
 * Header values are UUID-validated as a defense-in-depth layer: middleware
 * always overwrites or deletes `x-tenant-id` (see middleware.ts), but if
 * anything upstream regresses an attacker-supplied value here could be
 * interpolated into PostgREST filters by downstream routes. Treat a malformed
 * header as no header — fall through to the signed-JWT claim, which is
 * trustworthy.
 */
export async function getTenantId(): Promise<string> {
    const headersList = await headers();
    const fromHeader = headersList.get("x-tenant-id");
    if (fromHeader && UUID_RE.test(fromHeader)) return fromHeader;

    // Fallback: read from user's JWT claims. The claim is server-signed, so
    // we don't re-validate the shape — but a malformed claim is still treated
    // as "no tenant" rather than propagating garbage.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const fromJwt = user?.app_metadata?.active_tenant_id;
    if (fromJwt && UUID_RE.test(fromJwt)) return fromJwt;

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
        .select("id, name, slug, company_name, logo_url, logo_dark_url, report_cover_url, primary_color, status, custom_domain, domain_verified, address, phone, email, abn, reference_prefix")
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
        { name: "Owner", slug: "owner", permissions: DEFAULT_PERMISSIONS_BY_ROLE.owner },
        { name: "Admin", slug: "admin", permissions: DEFAULT_PERMISSIONS_BY_ROLE.admin },
        { name: "Manager", slug: "manager", permissions: DEFAULT_PERMISSIONS_BY_ROLE.manager },
        { name: "Member", slug: "member", permissions: DEFAULT_PERMISSIONS_BY_ROLE.member },
        { name: "Viewer", slug: "viewer", permissions: DEFAULT_PERMISSIONS_BY_ROLE.viewer },
    ];

    await admin.from("tenant_roles").insert(
        defaultRoles.map((r) => ({ tenant_id: tenantId, is_system: true, ...r }))
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
