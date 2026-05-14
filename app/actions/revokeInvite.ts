"use server";

import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkPermission } from "@/app/api/_lib/permissions";

export type RevokeInviteResult =
    | { success: true; error: null }
    | { success: false; error: string };

/**
 * Cancels a pending tenant invite or membership for someone who hasn't
 * signed in yet. Drops the tenant_invites row and tenant_memberships row
 * scoped to the caller's tenant. The auth.users row is left intact —
 * other tenants might still want to invite the same email, and the
 * handle_new_user trigger won't double-fire.
 *
 * Active members (last_sign_in_at set) are rejected — removing an active
 * user is a different flow (proper "remove member" dialog with
 * data-handover questions) and isn't built yet.
 */
export async function revokeInvite(email: string): Promise<RevokeInviteResult> {
    const validated = forgotPasswordSchema.safeParse({ email });
    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;
        if (authError || !user) {
            const cookieStore = await cookies();
            const supabaseCookies = cookieStore.getAll().filter(c => c.name.startsWith("sb-"));
            console.error("[revokeInvite] auth check failed", {
                authError: authError?.message,
                cookieCount: supabaseCookies.length,
            });
            return {
                success: false,
                error: authError?.message ?? "Unauthorized — try signing out and back in",
            };
        }

        const tenantId = await getTenantId();

        const permission = await checkPermission(
            supabase, user.id, tenantId, "settings.users", "write"
        );
        if (!permission.allowed) {
            return { success: false, error: "You don't have permission to revoke invites" };
        }

        const admin = await createAdminClient();

        const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (profile) {
            const { data: member } = await admin
                .from("tenant_memberships")
                .select("role")
                .eq("tenant_id", tenantId)
                .eq("user_id", profile.id)
                .maybeSingle();

            if (member) {
                const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
                if (authUser?.user?.last_sign_in_at) {
                    return {
                        success: false,
                        error: "This user has already signed in — remove them via the user detail panel instead.",
                    };
                }
            }
        }

        await admin
            .from("tenant_invites")
            .delete()
            .eq("tenant_id", tenantId)
            .eq("email", email);

        if (profile) {
            await admin
                .from("tenant_memberships")
                .delete()
                .eq("tenant_id", tenantId)
                .eq("user_id", profile.id);
        }

        return { success: true, error: null };
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Something went wrong",
        };
    }
}
