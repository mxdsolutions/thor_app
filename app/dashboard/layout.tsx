import Link from "next/link";
import { getTenantId, getTenantBranding, getTenantMembership } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { TenantProvider, type TenantContextData } from "@/lib/tenant-context";
import { TenantBrandingStyle } from "@/components/TenantBrandingStyle";
import { isPlatformAdminUser } from "@/lib/platform-admin";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const showPlatformAdminLink = user ? isPlatformAdminUser(user) : false;
    let tenantData: TenantContextData | null = null;

    if (user) {
        try {
            const tenantId = await getTenantId();
            const [branding, membership] = await Promise.all([
                getTenantBranding(tenantId),
                getTenantMembership(user.id, tenantId),
            ]);
            if (branding && membership) {
                tenantData = {
                    id: branding.id,
                    name: branding.name,
                    slug: branding.slug,
                    company_name: branding.company_name,
                    logo_url: branding.logo_url,
                    logo_dark_url: branding.logo_dark_url,
                    report_cover_url: branding.report_cover_url,
                    primary_color: branding.primary_color,
                    address: branding.address,
                    phone: branding.phone,
                    email: branding.email,
                    abn: branding.abn,
                    reference_prefix: branding.reference_prefix,
                    role: membership.role,
                    permissions: membership.permissions,
                };
            } else {
                console.error("DashboardLayout: missing tenant data", {
                    userId: user.id,
                    tenantId,
                    hasBranding: !!branding,
                    hasMembership: !!membership,
                });
            }
        } catch (err) {
            console.error("DashboardLayout: failed to resolve tenant", {
                userId: user.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    if (user && !tenantData) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-xl font-display">Workspace unavailable</h1>
                    <p className="text-sm text-muted-foreground">
                        We couldn&apos;t load your workspace. This usually means your account
                        isn&apos;t linked to an active tenant. Try signing out and back in, or
                        contact support if the problem persists.
                    </p>
                    <Link
                        href="/"
                        className="inline-block text-sm font-medium underline underline-offset-4"
                    >
                        Return to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {tenantData && (
                <TenantProvider tenant={tenantData}>
                    <TenantBrandingStyle />
                    <DashboardShell showPlatformAdminLink={showPlatformAdminLink}>{children}</DashboardShell>
                </TenantProvider>
            )}
            {!tenantData && (
                <DashboardShell showPlatformAdminLink={showPlatformAdminLink}>{children}</DashboardShell>
            )}
        </>
    );
}
