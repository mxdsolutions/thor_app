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
                    plan: branding.plan,
                    address: branding.address,
                    phone: branding.phone,
                    email: branding.email,
                    abn: branding.abn,
                    reference_prefix: branding.reference_prefix,
                    role: membership.role,
                    permissions: membership.permissions,
                };
            }
        } catch {
            // Tenant context not available — will render with defaults
        }
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
