import { getTenantId, getTenantBranding } from "@/lib/tenant";

export async function TenantBrandingStyle() {
    let tenantId: string;
    try {
        tenantId = await getTenantId();
    } catch {
        return null;
    }

    const tenant = await getTenantBranding(tenantId);
    if (!tenant?.primary_color || tenant.primary_color === 'hsl(16 87% 55%)') {
        // Default color, no override needed
        return null;
    }

    return (
        <style dangerouslySetInnerHTML={{ __html: `
            @theme {
                --color-primary: ${tenant.primary_color};
                --color-ring: ${tenant.primary_color};
            }
        `}} />
    );
}
