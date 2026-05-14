"use server";

import { cookies, headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkPermission } from "@/app/api/_lib/permissions";

export type ResendInviteResult =
    | { success: true; error: null }
    | { success: false; error: string };

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function resendInvite(email: string): Promise<ResendInviteResult> {
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
            console.error("[resendInvite] auth check failed", {
                authError: authError?.message,
                cookieCount: supabaseCookies.length,
                cookieNames: supabaseCookies.map(c => c.name),
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
            return { success: false, error: "You don't have permission to resend invites" };
        }

        const admin = await createAdminClient();

        // Two valid cases:
        //   1. Pending invite (tenant_invites row, no membership yet)
        //   2. Pending member (tenant_membership row but never signed in
        //      — handle_new_user creates the membership at invite time, so
        //      lots of "still chasing them up" users land here).
        // Either way, re-sending the invite email is the right move; Supabase
        // re-sends to unconfirmed auth.users automatically.
        const [inviteRes, profileRes] = await Promise.all([
            admin
                .from("tenant_invites")
                .select("id, role, invited_by")
                .eq("tenant_id", tenantId)
                .eq("email", email)
                .maybeSingle(),
            admin
                .from("profiles")
                .select("id")
                .eq("email", email)
                .maybeSingle(),
        ]);

        let role: string | null = inviteRes.data?.role ?? null;
        const invitedBy: string = inviteRes.data?.invited_by ?? user.id;

        if (!role && profileRes.data) {
            const { data: member } = await admin
                .from("tenant_memberships")
                .select("role")
                .eq("tenant_id", tenantId)
                .eq("user_id", profileRes.data.id)
                .maybeSingle();
            if (member) role = member.role;
        }

        if (!role) {
            return { success: false, error: "That email isn't part of this tenant" };
        }

        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = host.startsWith("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}/`;

        const { error } = await admin.auth.admin.inviteUserByEmail(email, {
            data: {
                user_type: role,
                tenant_id: tenantId,
                tenant_role: role,
                invited_by: invitedBy,
            },
            redirectTo: `${baseUrl}auth/callback?next=/onboarding`,
        });

        if (error) return { success: false, error: error.message };

        if (inviteRes.data) {
            await admin
                .from("tenant_invites")
                .update({ expires_at: new Date(Date.now() + SEVEN_DAYS_MS).toISOString() })
                .eq("id", inviteRes.data.id);
        }

        return { success: true, error: null };
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Something went wrong",
        };
    }
}
