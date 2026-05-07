import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeXeroCodeForTokens, getXeroTenants } from "@/lib/xero";
import { getTenantId } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8005";
    const redirectUrl = `${appUrl}/dashboard/settings/company/integrations`;

    if (error) {
        const description =
            searchParams.get("error_description") || "Unknown error";
        return NextResponse.redirect(
            `${redirectUrl}?xero_error=${encodeURIComponent(description)}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${redirectUrl}?xero_error=Missing+code+or+state`
        );
    }

    // Validate CSRF state and pull the PKCE verifier
    const cookieStore = await cookies();
    const savedState = cookieStore.get("xero_oauth_state")?.value;
    const codeVerifier = cookieStore.get("xero_pkce_verifier")?.value;
    cookieStore.delete("xero_oauth_state");
    cookieStore.delete("xero_pkce_verifier");

    if (state !== savedState) {
        return NextResponse.redirect(
            `${redirectUrl}?xero_error=Invalid+state`
        );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.redirect(
            `${redirectUrl}?xero_error=Unauthorized`
        );
    }

    try {
        const tokens = await exchangeXeroCodeForTokens(code, codeVerifier);
        const expiresAt = new Date(
            Date.now() + tokens.expires_in * 1000
        ).toISOString();

        // Get available Xero organizations
        const xeroTenants = await getXeroTenants(tokens.access_token);
        const tenantId = await getTenantId();

        if (xeroTenants.length === 1) {
            // Auto-select single org
            const xeroOrg = xeroTenants[0];
            const { error: dbError } = await supabase
                .from("xero_connections")
                .upsert(
                    {
                        tenant_id: tenantId,
                        user_id: user.id,
                        xero_tenant_id: xeroOrg.tenantId,
                        xero_tenant_name: xeroOrg.tenantName,
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        token_expires_at: expiresAt,
                        scopes:
                            "openid profile email offline_access accounting.contacts accounting.invoices",
                        status: "active",
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "tenant_id" }
                );

            if (dbError) {
                return NextResponse.redirect(
                    `${redirectUrl}?xero_error=Failed+to+save+connection`
                );
            }

            return NextResponse.redirect(
                `${redirectUrl}?xero_success=true`
            );
        }

        // Multiple orgs — store tokens temporarily and let user pick
        // Store tokens so select-tenant can finalize
        const { error: dbError } = await supabase
            .from("xero_connections")
            .upsert(
                {
                    tenant_id: tenantId,
                    user_id: user.id,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    token_expires_at: expiresAt,
                    scopes:
                        "openid profile email offline_access accounting.contacts accounting.invoices",
                    status: "pending_org_selection",
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "tenant_id" }
            );

        if (dbError) {
            return NextResponse.redirect(
                `${redirectUrl}?xero_error=Failed+to+save+connection`
            );
        }

        // Redirect with flag to show org picker
        const orgData = encodeURIComponent(
            JSON.stringify(
                xeroTenants.map((t) => ({
                    id: t.tenantId,
                    name: t.tenantName,
                }))
            )
        );
        return NextResponse.redirect(
            `${redirectUrl}?xero_select=true&xero_orgs=${orgData}`
        );
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        return NextResponse.redirect(
            `${redirectUrl}?xero_error=${encodeURIComponent(message)}`
        );
    }
}
