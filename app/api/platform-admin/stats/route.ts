import { NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";

export const GET = withPlatformAuth(async (_request, { adminClient }) => {
    const [
        { count: totalTenants },
        { count: activeTenants },
        { count: suspendedTenants },
        { count: totalUsers },
    ] = await Promise.all([
        adminClient.from("tenants").select("*", { count: "exact", head: true }),
        adminClient.from("tenants").select("*", { count: "exact", head: true }).eq("status", "active"),
        adminClient.from("tenants").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        adminClient.from("tenant_memberships").select("*", { count: "exact", head: true }),
    ]);

    // Tenants created in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newTenantsThisMonth } = await adminClient
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

    // Trial / past-due tenant stats will be re-added once tenant_subscriptions
    // data is flowing — they need to query that table, not tenants.

    return NextResponse.json({
        total_tenants: totalTenants || 0,
        active_tenants: activeTenants || 0,
        suspended_tenants: suspendedTenants || 0,
        total_users: totalUsers || 0,
        new_tenants_this_month: newTenantsThisMonth || 0,
    });
});
