"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { onboardingSchema } from "@/lib/validation";

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
    } catch (err: any) {
        if (err.message === "NEXT_REDIRECT") throw err;
        return { success: false, error: err.message || "An unexpected error occurred" };
    }

    redirect("/dashboard");
}
