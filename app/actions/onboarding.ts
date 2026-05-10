"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { onboardingSchema } from "@/lib/validation";
import { setActiveTenant } from "@/lib/tenant";

export async function completeOnboarding(formData: FormData) {
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const avatar_url = formData.get("avatar_url") as string | null;

    const validated = onboardingSchema.safeParse({ first_name, last_name });
    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Update auth metadata
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                first_name,
                last_name,
                full_name: `${first_name} ${last_name}`,
                onboarding_completed: true,
            },
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        // Update profile record
        const profileUpdate: Record<string, string> = {
            full_name: `${first_name} ${last_name}`,
        };
        if (avatar_url) {
            profileUpdate.avatar_url = avatar_url;
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("id", user.id);

        if (profileError) {
            return { success: false, error: profileError.message };
        }

        // Invitees finished onboarding without `app_metadata.active_tenant_id`
        // ever being set — inviteUserByEmail puts `tenant_id` in `user_metadata`
        // but the middleware reads `app_metadata`. Without this, the dashboard
        // renders the "Workspace unavailable" panel because getTenantId() can't
        // resolve. Pick the tenant the invite pointed at (verifying membership)
        // and fall back to the user's earliest membership otherwise.
        const admin = await createAdminClient();
        const tenantIdFromMeta = (user.user_metadata?.tenant_id as string | undefined) ?? null;
        let tenantToActivate: string | null = null;

        if (tenantIdFromMeta) {
            const { data: membership } = await admin
                .from("tenant_memberships")
                .select("tenant_id")
                .eq("user_id", user.id)
                .eq("tenant_id", tenantIdFromMeta)
                .maybeSingle();
            if (membership) tenantToActivate = membership.tenant_id as string;
        }

        if (!tenantToActivate) {
            const { data: firstMembership } = await admin
                .from("tenant_memberships")
                .select("tenant_id")
                .eq("user_id", user.id)
                .order("joined_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            if (firstMembership) tenantToActivate = firstMembership.tenant_id as string;
        }

        if (tenantToActivate) {
            await setActiveTenant(user.id, tenantToActivate);
            // Rotate the JWT cookie so middleware sees the new
            // app_metadata.active_tenant_id on the next request.
            await supabase.auth.refreshSession();
        }
    } catch (err: unknown) {
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred" };
    }

    redirect("/dashboard");
}
