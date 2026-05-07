import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { unauthorizedError, forbiddenError, serverError } from "./errors";
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
                return unauthorizedError();
            }

            const tenantId = await getTenantId();
            return await handler(request, { supabase, user, tenantId });
        } catch (err) {
            if (
                err instanceof Error &&
                err.message === "No tenant context available"
            ) {
                return forbiddenError("No tenant context");
            }
            return serverError(err, "withAuth");
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
                return unauthorizedError();
            }

            if (user.app_metadata?.is_platform_admin !== true) {
                return forbiddenError();
            }

            const adminClient = await createAdminClient();
            return await handler(request, { supabase, user, adminClient });
        } catch (err) {
            return serverError(err, "withPlatformAuth");
        }
    };
}
