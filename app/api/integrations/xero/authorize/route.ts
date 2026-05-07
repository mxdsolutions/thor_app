import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { requirePermission } from "@/app/api/_lib/permissions";
import { buildXeroAuthUrl, generatePkceVerifier, pkceChallengeFromVerifier } from "@/lib/xero";
import { v4 as uuid } from "uuid";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantId();
    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "integrations.xero.connect",
        "write"
    );
    if (denied) return denied;

    const state = uuid();
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = pkceChallengeFromVerifier(codeVerifier);

    const cookieStore = await cookies();
    const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 600,
        path: "/",
    };
    cookieStore.set("xero_oauth_state", state, cookieOpts);
    cookieStore.set("xero_pkce_verifier", codeVerifier, cookieOpts);

    const authUrl = buildXeroAuthUrl(state, codeChallenge);
    return NextResponse.redirect(authUrl);
}
