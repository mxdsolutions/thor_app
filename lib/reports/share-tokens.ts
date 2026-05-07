import { randomBytes } from "node:crypto";

/** 256-bit random URL-safe token (43 chars base64url). Unguessable by design;
 *  rate-limit + 30-day expiry handle the rest. */
export function generateShareToken(): string {
    return randomBytes(32).toString("base64url");
}

type ShareUrlTenant = {
    custom_domain: string | null;
    domain_verified: boolean | null;
    slug: string;
};

/** Build the public completion URL for a freshly minted token.
 *
 *  Preference order:
 *    1. Tenant's verified custom_domain (e.g. https://app.clientco.com/r/...)
 *    2. {slug}.{platform_domain}
 *    3. Request host (dev / preview)
 */
export function buildShareUrl(
    tenant: ShareUrlTenant,
    token: string,
    requestHost: string,
): string {
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "admin.mxdsolutions.com.au";

    if (tenant.custom_domain && tenant.domain_verified) {
        return `https://${tenant.custom_domain}/r/${token}`;
    }

    if (tenant.slug && !requestHost.startsWith("localhost")) {
        return `https://${tenant.slug}.${platformDomain}/r/${token}`;
    }

    // Dev fallback — keep the host the user is currently on so localhost works.
    const protocol = requestHost.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${requestHost}/r/${token}`;
}
