import { createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedShareToken = {
    id: string;
    token: string;
    report_id: string;
    tenant_id: string;
    expires_at: string;
    submitted_at: string | null;
    submitted_by_email: string | null;
    submitted_by_name: string | null;
    revoked_at: string | null;
    first_opened_at: string | null;
    message: string | null;
    recipient_name: string | null;
    photo_count: number;
};

/** Distinguishes the "we know the token but it's no longer usable" cases from
 *  the "we don't know this token at all" case. The first three are surfaced to
 *  the recipient with branded explainer pages; "missing" returns a generic 404
 *  so we don't help an attacker map valid token shapes. */
export type TokenResolveOutcome = "ok" | "missing" | "revoked" | "expired";

export type TokenResolveResult =
    | { kind: "ok"; admin: SupabaseClient; row: ResolvedShareToken }
    | { kind: "revoked"; admin: SupabaseClient; row: ResolvedShareToken }
    | { kind: "expired"; admin: SupabaseClient; row: ResolvedShareToken }
    | { kind: "missing" };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{30,64}$/;

export async function resolveShareToken(token: string): Promise<TokenResolveResult> {
    if (!token || !TOKEN_PATTERN.test(token)) {
        return { kind: "missing" };
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
        .from("report_share_tokens")
        .select("id, token, report_id, tenant_id, expires_at, submitted_at, submitted_by_email, submitted_by_name, revoked_at, first_opened_at, message, recipient_name, photo_count")
        .eq("token", token)
        .maybeSingle();

    if (error || !data) return { kind: "missing" };

    const row = data as ResolvedShareToken;
    if (row.revoked_at) return { kind: "revoked", admin, row };
    if (new Date(row.expires_at).getTime() <= Date.now()) {
        return { kind: "expired", admin, row };
    }

    return { kind: "ok", admin, row };
}
