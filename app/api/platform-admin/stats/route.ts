import { NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";

export const GET = withPlatformAuth(async (_request, { adminClient }) => {
    const [
        { count: totalTenants },
        { count: activeTenants },
        { count: trialTenants },
        { count: suspendedTenants },
        { count: totalUsers },
    ] = await Promise.all([
        adminClient.from("tenants").select("*", { count: "exact", head: true }),
        adminClient.from("tenants").select("*", { count: "exact", head: true }).eq("status", "active"),
        adminClient.from("tenants").select("*", { count: "exact", head: true }).eq("plan", "trial"),
        adminClient.from("tenants").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        adminClient.from("tenant_memberships").select("*", { count: "exact", head: true }),
    ]);

    // Tenants created in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newTenantsThisMonth } = await adminClient
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

    // Tenants with trial ending in the next 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expiringTrials } = await adminClient
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("plan", "trial")
        .eq("status", "active")
        .lte("trial_ends_at", sevenDaysFromNow)
        .gte("trial_ends_at", new Date().toISOString());

    return NextResponse.json({
        total_tenants: totalTenants || 0,
        active_tenants: activeTenants || 0,
        trial_tenants: trialTenants || 0,
        suspended_tenants: suspendedTenants || 0,
        total_users: totalUsers || 0,
        new_tenants_this_month: newTenantsThisMonth || 0,
        expiring_trials: expiringTrials || 0,
    });
});
