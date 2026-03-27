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

export async function getValidToken(supabase: SupabaseClient, userId: string): Promise<string> {
    const { data: connection, error } = await supabase
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "outlook")
        .single();

    if (error || !connection) {
        throw new Error("No Outlook connection found");
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    // Token is still valid
    if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
        return connection.access_token;
    }

    // Refresh the token
    const tokens = await refreshAccessToken(connection.refresh_token);

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase
        .from("email_connections")
        .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

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
