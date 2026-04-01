"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";

export async function inviteUser(
    email: string,
    firstName: string,
    lastName: string,
    role: string
) {
    const validated = forgotPasswordSchema.safeParse({ email });
    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const tenantId = await getTenantId();
        const admin = await createAdminClient();

        // Derive the base URL from the incoming request
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = host.startsWith("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}/`;

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
            data: {
                first_name: firstName,
                last_name: lastName,
                user_type: role,
                tenant_id: tenantId,
                tenant_role: role,
                invited_by: user.id,
            },
            redirectTo: `${baseUrl}auth/callback?next=/onboarding`,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Create a tenant invite record
        await admin.from("tenant_invites").upsert({
            tenant_id: tenantId,
            email,
            role,
            invited_by: user.id,
        }, { onConflict: "tenant_id,email" });

        return { success: true, error: null, data };
    } catch (err: any) {
        return { success: false, error: err?.message || "Something went wrong" };
    }
}
