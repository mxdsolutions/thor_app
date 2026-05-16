import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, notFoundError } from "@/app/api/_lib/errors";
import { getTenantBranding } from "@/lib/tenant";

/**
 * Branding for the caller's own tenant. Powers anywhere a client component
 * needs the active tenant's logo / address / report-cover URL etc. without
 * going through the platform-admin surface (which requires `is_platform_admin`).
 *
 * Used by the in-dashboard template builder to render the "Preview as PDF"
 * with realistic letterhead / cover. Tenant context comes from `withAuth` →
 * `getTenantId()`, UUID-validated upstream.
 */
export const GET = withAuth(async (_request, { tenantId }) => {
    try {
        const branding = await getTenantBranding(tenantId);
        if (!branding) return notFoundError("Tenant");
        return NextResponse.json({ item: branding });
    } catch (err) {
        return serverError(err, "GET /api/tenants/current");
    }
});
