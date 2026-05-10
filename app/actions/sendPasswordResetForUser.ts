"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";

export type SendPasswordResetForUserResult =
    | { success: true; error: null }
    | { success: false; error: string };

/**
 * Triggers a Supabase Auth password-reset email for another user in the
 * caller's tenant. Distinct from the public `resetPasswordForEmail` that
 * users hit on the forgot-password page — this one is gated on the target
 * being a member of the same tenant, so a viewer in tenant A can't trigger
 * recovery emails for arbitrary addresses.
 */
export async function sendPasswordResetForUser(
    email: string,
): Promise<SendPasswordResetForUserResult> {
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

        const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
        if (!profile) return { success: false, error: "User not found" };

        const { data: member } = await admin
            .from("tenant_memberships")
            .select("user_id")
            .eq("tenant_id", tenantId)
            .eq("user_id", profile.id)
            .maybeSingle();
        if (!member) {
            return { success: false, error: "That email isn't part of this tenant" };
        }

        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = host.startsWith("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}/`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${baseUrl}reset-password`,
        });

        if (error) return { success: false, error: error.message };

        return { success: true, error: null };
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Something went wrong",
        };
    }
}
