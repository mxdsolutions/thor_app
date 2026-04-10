"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TenantContextData = {
    id: string;
    name: string;
    slug: string;
    company_name: string | null;
    logo_url: string | null;
    logo_dark_url: string | null;
    primary_color: string;
    plan: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
    reference_prefix: string | null;
    role: string;
    permissions: Record<string, { read?: boolean; write?: boolean; delete?: boolean }>;
};

const TenantContext = createContext<TenantContextData | null>(null);

export function TenantProvider({ tenant, children }: { tenant: TenantContextData; children: ReactNode }) {
    return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextData {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
    return ctx;
}

export function useTenantOptional(): TenantContextData | null {
    return useContext(TenantContext);
}

function resolvePermission(
    ctx: TenantContextData,
    resource: string,
    action: "read" | "write" | "delete"
): boolean {
    const { permissions, role } = ctx;
    // Owner always has full access
    if (role === "owner") return true;
    // Check specific resource first
    if (permissions[resource]?.[action]) return true;
    // Fall back to parent resource
    const parentResource = resource.split(".")[0];
    if (parentResource !== resource && permissions[parentResource]?.[action]) return true;
    return false;
}

/**
 * Check if the current user has a specific permission.
 * Resolution: specific key (e.g., "crm.companies") -> parent key ("crm") -> deny.
 * Throws if there is no TenantProvider — use {@link usePermissionOptional} in
 * code paths that may render before the provider mounts (e.g., auth shells).
 */
export function usePermission(resource: string, action: "read" | "write" | "delete"): boolean {
    return resolvePermission(useTenant(), resource, action);
}

/**
 * Same as {@link usePermission} but returns `fallback` (default `false`) when
 * there is no TenantProvider in the tree. Safe to call unconditionally from
 * components that may render before the tenant context is available.
 */
export function usePermissionOptional(
    resource: string,
    action: "read" | "write" | "delete",
    fallback: boolean = false
): boolean {
    const ctx = useContext(TenantContext);
    if (!ctx) return fallback;
    return resolvePermission(ctx, resource, action);
}
