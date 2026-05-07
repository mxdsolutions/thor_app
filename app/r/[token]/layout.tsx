import { createAdminClient } from "@/lib/supabase/server";
import { getTenantBranding } from "@/lib/tenant";
import { TenantProvider, type TenantContextData } from "@/lib/tenant-context";
import { TenantBrandingStyle } from "@/components/TenantBrandingStyle";

export default async function ExternalReportLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    // Best-effort branding hydration. We deliberately do NOT validate the token
    // here — the page handles the various failure modes itself. We only need
    // tenant_id so the layout can apply the right branding before paint.
    let tenantData: TenantContextData | null = null;

    try {
        const admin = await createAdminClient();
        const { data: row } = await admin
            .from("report_share_tokens")
            .select("tenant_id")
            .eq("token", token)
            .maybeSingle();

        if (row?.tenant_id) {
            const branding = await getTenantBranding(row.tenant_id);
            if (branding) {
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
                    role: "external_guest",
                    permissions: {},
                };
            }
        }
    } catch (err) {
        console.error("[r/layout] branding resolve failed", err);
    }

    if (!tenantData) {
        return <>{children}</>;
    }

    return (
        <TenantProvider tenant={tenantData}>
            <TenantBrandingStyle />
            {children}
        </TenantProvider>
    );
}
