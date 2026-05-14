"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkPermission } from "@/app/api/_lib/permissions";

export type InviteUserResult =
    | { success: true; error: null; data: unknown }
    | { success: false; error: string; code?: "no_seats_available" | "no_subscription" | "forbidden" };

type ClaimSeatResult = {
    claimed: boolean;
    reason?: string;
    used?: number;
    quantity?: number;
    available?: number;
    billing_exempt?: boolean;
    has_subscription?: boolean;
};

export async function inviteUser(
    email: string,
    firstName: string,
    lastName: string,
    role: string
): Promise<InviteUserResult> {
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

        const permission = await checkPermission(
            supabase, user.id, tenantId, "settings.users", "write"
        );
        if (!permission.allowed) {
            return {
                success: false,
                code: "forbidden",
                error: "You don't have permission to invite users to this workspace",
            };
        }

        // Only owners can mint new owners. Mirrors the inline guard in
        // app/api/users/route.ts so the role-change and invite paths agree.
        if (role === "owner" && permission.role !== "owner") {
            return {
                success: false,
                code: "forbidden",
                error: "Only the workspace owner can invite another owner",
            };
        }

        // Atomic seat claim — wraps the count-and-decide in a transaction
        // advisory lock keyed on tenant_id so concurrent invites can't both
        // pass at quota - 1.
        const { data: claim, error: claimError } = await supabase
            .rpc("claim_seat", { p_tenant_id: tenantId })
            .single<ClaimSeatResult>();

        if (claimError) {
            return { success: false, error: claimError.message };
        }

        if (claim && !claim.claimed) {
            return {
                success: false,
                code: "no_seats_available",
                error: `You're using all ${claim.quantity} seats. Add more from Settings → Subscription before inviting.`,
            };
        }

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
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Something went wrong" };
    }
}
