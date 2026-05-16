"use client";

import { useTenantOptional } from "@/lib/tenant-context";

const DEFAULT_PRIMARY = "hsl(16 87% 55%)";

export function TenantBrandingStyle() {
    const tenant = useTenantOptional();

    if (!tenant?.primary_color || tenant.primary_color === DEFAULT_PRIMARY) {
        return null;
    }

    // --color-ring is intentionally NOT overridden — focus rings are a system
    // constant (slate near-black) so they meet contrast on any tenant brand.
    return (
        <style dangerouslySetInnerHTML={{ __html: `
            :root {
                --color-primary: ${tenant.primary_color};
            }
        `}} />
    );
}
