"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tenantId = await getTenantId();
        const admin = await createAdminClient();

        // Confirm there's an outstanding invite this caller's tenant owns
        // before re-sending — a viewer in tenant A shouldn't be able to
        // re-trigger emails for tenant B.
        const { data: invite, error: inviteError } = await admin
            .from("tenant_invites")
            .select("id, role, accepted_at, invited_by")
            .eq("tenant_id", tenantId)
            .eq("email", email)
            .maybeSingle();

        if (inviteError) return { success: false, error: inviteError.message };
        if (!invite) return { success: false, error: "No pending invite for that email" };
        if (invite.accepted_at) {
            return { success: false, error: "This invitation has already been accepted" };
        }

        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = host.startsWith("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}/`;

        const { error } = await admin.auth.admin.inviteUserByEmail(email, {
            data: {
                user_type: invite.role,
                tenant_id: tenantId,
                tenant_role: invite.role,
                invited_by: invite.invited_by,
            },
            redirectTo: `${baseUrl}auth/callback?next=/onboarding`,
        });

        if (error) return { success: false, error: error.message };

        // Bump expiry so the row keeps showing as a pending invite.
        await admin
            .from("tenant_invites")
            .update({ expires_at: new Date(Date.now() + SEVEN_DAYS_MS).toISOString() })
            .eq("id", invite.id);

        return { success: true, error: null };
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Something went wrong",
        };
    }
}
