import { SupabaseClient } from "@supabase/supabase-js";

const TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;
const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = "openid profile email offline_access Mail.Read Mail.Send Mail.ReadWrite";

export function buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        response_type: "code",
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        scope: SCOPES,
        response_mode: "query",
        state,
        prompt: "consent",
    });

    return `${MICROSOFT_AUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
    const res = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            code,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
            grant_type: "authorization_code",
            scope: SCOPES,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return res.json() as Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        id_token: string;
    }>;
}

async function refreshAccessToken(refreshToken: string) {
    const res = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            scope: SCOPES,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    return res.json() as Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
    }>;
}

export class OutlookReauthRequired extends Error {
    code = "OUTLOOK_REAUTH_REQUIRED" as const;
    constructor(message: string) {
        super(message);
        this.name = "OutlookReauthRequired";
    }
}

export async function getValidToken(supabase: SupabaseClient, userId: string): Promise<string> {
    const { data: connection, error } = await supabase
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "outlook")
        .single();

    if (error || !connection) {
        throw new OutlookReauthRequired("No Outlook connection found. Please reconnect your account.");
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    // Token is still valid — return immediately
    if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
        return connection.access_token;
    }

    // Token needs refresh — use optimistic locking on the refresh_token column
    // to ensure only one concurrent caller wins the refresh race.
    const oldRefreshToken = connection.refresh_token;

    let tokens;
    try {
        tokens = await refreshAccessToken(oldRefreshToken);
    } catch {
        // Refresh failed — could be revoked, expired, or a race loser.
        // Re-read to check if another request already refreshed successfully.
        const { data: updated } = await supabase
            .from("email_connections")
            .select("access_token, refresh_token, token_expires_at")
            .eq("user_id", userId)
            .eq("provider", "outlook")
            .single();

        if (updated && updated.refresh_token !== oldRefreshToken) {
            // Another request already refreshed — use the new token
            return updated.access_token;
        }

        // Genuinely revoked/expired — user must re-authenticate
        throw new OutlookReauthRequired(
            "Your Outlook connection has expired or been revoked. Please reconnect your account."
        );
    }

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Optimistic lock: only update if refresh_token still matches what we used.
    // If another request already refreshed, this update affects 0 rows — that's fine,
    // the other request's tokens are already persisted.
    const { error: updateError, count } = await supabase
        .from("email_connections")
        .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id)
        .eq("refresh_token", oldRefreshToken);

    if (updateError) {
        // Critical: we got new tokens from Microsoft but failed to persist them.
        // Log loudly — but we can still return the access token for this request.
        console.error(
            "[microsoft-graph] CRITICAL: Failed to persist refreshed tokens for user",
            userId,
            updateError.message
        );
    } else if (count === 0) {
        // Another request won the race and already persisted newer tokens.
        // Our access token is still valid for this request — Microsoft issued it.
    }

    return tokens.access_token;
}

export async function graphFetch(
    supabase: SupabaseClient,
    userId: string,
    endpoint: string,
    options?: RequestInit
): Promise<Response> {
    const token = await getValidToken(supabase, userId);

    return fetch(`${GRAPH_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
}

export function parseIdTokenEmail(idToken: string): string | null {
    try {
        const payload = JSON.parse(
            Buffer.from(idToken.split(".")[1], "base64").toString()
        );
        return payload.email || payload.preferred_username || null;
    } catch {
        return null;
    }
}
