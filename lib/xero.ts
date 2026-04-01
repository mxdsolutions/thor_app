import { SupabaseClient } from "@supabase/supabase-js";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_URL = "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

const SCOPES =
    "openid profile email offline_access accounting.contacts accounting.transactions";

export function buildXeroAuthUrl(state: string): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.XERO_CLIENT_ID!,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
        scope: SCOPES,
        state,
    });

    return `${XERO_AUTH_URL}?${params.toString()}`;
}

export async function exchangeXeroCodeForTokens(code: string) {
    const res = await fetch(XERO_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
                `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
            ).toString("base64")}`,
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.XERO_REDIRECT_URI!,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(
            `Xero token exchange failed: ${error.error_description || error.error}`
        );
    }

    return res.json() as Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        id_token: string;
    }>;
}

async function refreshXeroToken(refreshToken: string) {
    const res = await fetch(XERO_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
                `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
            ).toString("base64")}`,
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(
            `Xero token refresh failed: ${error.error_description || error.error}`
        );
    }

    return res.json() as Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
    }>;
}

/**
 * Get a valid Xero access token for a tenant, refreshing if needed.
 * Returns { accessToken, xeroTenantId } or throws.
 */
export async function getValidXeroToken(
    supabase: SupabaseClient,
    tenantId: string
): Promise<{ accessToken: string; xeroTenantId: string }> {
    const { data: connection, error } = await supabase
        .from("xero_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

    if (error || !connection) {
        throw new Error("No active Xero connection found");
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    // Token is still valid
    if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
        return {
            accessToken: connection.access_token,
            xeroTenantId: connection.xero_tenant_id,
        };
    }

    // Refresh the token
    const tokens = await refreshXeroToken(connection.refresh_token);
    const newExpiresAt = new Date(
        Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await supabase
        .from("xero_connections")
        .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

    return {
        accessToken: tokens.access_token,
        xeroTenantId: connection.xero_tenant_id,
    };
}

/**
 * Fetch from the Xero API with automatic auth and tenant headers.
 * Handles rate limit retries (429).
 */
export async function xeroFetch(
    supabase: SupabaseClient,
    tenantId: string,
    endpoint: string,
    options?: RequestInit & { retries?: number }
): Promise<Response> {
    const { accessToken, xeroTenantId } = await getValidXeroToken(
        supabase,
        tenantId
    );
    const maxRetries = options?.retries ?? 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(`${XERO_API_URL}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "xero-tenant-id": xeroTenantId,
                "Content-Type": "application/json",
                Accept: "application/json",
                ...options?.headers,
            },
        });

        if (res.status === 429 && attempt < maxRetries) {
            const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
        }

        return res;
    }

    throw new Error("Xero API: max retries exceeded");
}

/**
 * Get the list of Xero tenants (organizations) the user has access to.
 */
export async function getXeroTenants(
    accessToken: string
): Promise<Array<{ tenantId: string; tenantName: string; tenantType: string }>> {
    const res = await fetch(XERO_CONNECTIONS_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error("Failed to fetch Xero tenants");
    }

    return res.json();
}

/**
 * Check if a Xero connection exists for a tenant. Returns the connection or null.
 */
export async function getXeroConnection(
    supabase: SupabaseClient,
    tenantId: string
) {
    const { data } = await supabase
        .from("xero_connections")
        .select("id, xero_tenant_id, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

    return data;
}
