import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthContext = {
    supabase: SupabaseClient;
    user: User;
    tenantId: string;
};

type Handler = (
    request: NextRequest,
    ctx: AuthContext
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with auth + tenant context.
 * Eliminates boilerplate auth/tenant checks from every route.
 */
export function withAuth(handler: Handler) {
    return async (request: NextRequest) => {
        try {
            const supabase = await createClient();
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }

            const tenantId = await getTenantId();
            return await handler(request, { supabase, user, tenantId });
        } catch (err) {
            if (
                err instanceof Error &&
                err.message === "No tenant context available"
            ) {
                return NextResponse.json(
                    { error: "No tenant context" },
                    { status: 403 }
                );
            }
            console.error("API handler error:", err);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    };
}

// --- Platform Admin Handler ---

export type PlatformAuthContext = {
    supabase: SupabaseClient;
    user: User;
    adminClient: SupabaseClient;
};

type PlatformHandler = (
    request: NextRequest,
    ctx: PlatformAuthContext
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with platform admin auth.
 * Provides adminClient (service role) for cross-tenant queries.
 * No tenant context — platform admin operates across all tenants.
 */
export function withPlatformAuth(handler: PlatformHandler) {
    return async (request: NextRequest) => {
        try {
            const supabase = await createClient();
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }

            if (user.app_metadata?.is_platform_admin !== true) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            const adminClient = await createAdminClient();
            return await handler(request, { supabase, user, adminClient });
        } catch (err) {
            console.error("Platform admin handler error:", err);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    };
}
