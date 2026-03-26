"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation";
import { getURL } from "@/lib/utils";

export async function inviteUser(
    email: string,
    firstName: string,
    lastName: string,
    role: "admin" | "member"
) {
    const validated = forgotPasswordSchema.safeParse({ email });
    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        const supabase = await createAdminClient();

        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: {
                first_name: firstName,
                last_name: lastName,
                user_type: role,
            },
            redirectTo: `${getURL()}onboarding`,
        });

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, error: null, data };
    } catch (err: any) {
        return { success: false, error: err?.message || "Something went wrong" };
    }
}
