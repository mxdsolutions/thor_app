import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { exchangeCodeForTokens, parseIdTokenEmail } from "@/lib/microsoft-graph";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8005";
    const redirectUrl = `${appUrl}/dashboard/settings/company/integrations`;

    if (error) {
        const description = searchParams.get("error_description") || "Unknown error";
        return NextResponse.redirect(`${redirectUrl}?error=${encodeURIComponent(description)}`);
    }

    if (!code || !state) {
        return NextResponse.redirect(`${redirectUrl}?error=Missing+code+or+state`);
    }

    // Validate CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;
    cookieStore.delete("oauth_state");

    if (state !== savedState) {
        return NextResponse.redirect(`${redirectUrl}?error=Invalid+state`);
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.redirect(`${redirectUrl}?error=Unauthorized`);
    }

    let tenantId: string;
    try {
        tenantId = await getTenantId();
    } catch {
        return NextResponse.redirect(`${redirectUrl}?error=No+tenant+context`);
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const emailAddress = parseIdTokenEmail(tokens.id_token);

        if (!emailAddress) {
            return NextResponse.redirect(`${redirectUrl}?error=Could+not+determine+email+address`);
        }

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Upsert connection
        const { error: dbError } = await supabase
            .from("email_connections")
            .upsert(
                {
                    tenant_id: tenantId,
                    user_id: user.id,
                    provider: "outlook",
                    email_address: emailAddress,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    token_expires_at: expiresAt,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,provider" }
            );

        if (dbError) {
            console.error("[outlook/callback] Failed to save connection", dbError);
            return NextResponse.redirect(`${redirectUrl}?error=Failed+to+save+connection`);
        }

        return NextResponse.redirect(`${redirectUrl}?success=true`);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        return NextResponse.redirect(`${redirectUrl}?error=${encodeURIComponent(message)}`);
    }
}
