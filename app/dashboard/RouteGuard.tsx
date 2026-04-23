"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenantOptional } from "@/lib/tenant-context";
import { resolveRouteResource } from "@/lib/permissions";
import { ROUTES } from "@/lib/routes";

/**
 * Client-side guard for dashboard routes. If the current user lacks `read`
 * on the resource the current pathname maps to, they are sent back to
 * Overview. Owner always bypasses. Pages not in the route-to-resource map
 * (Overview, Analytics, Settings subpages) are left untouched.
 *
 * API routes remain the real safety net via `requirePermission`; this is
 * UX polish so users don't sit on pages that won't load for them.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const tenant = useTenantOptional();

    useEffect(() => {
        if (!tenant) return;
        if (tenant.role === "owner") return;
        const resource = resolveRouteResource(pathname);
        if (!resource) return;
        const allowed = tenant.permissions?.[resource]?.read === true;
        if (!allowed) router.replace(ROUTES.OVERVIEW);
    }, [pathname, tenant, router]);

    return <>{children}</>;
}
