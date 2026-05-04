"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { seedDefaultRoles } from "@/lib/tenant";

export type TenantSignupResult =
    | { success: true; tenantId: string }
    | { success: false; error: string };

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
}

function randomSuffix(): string {
    return Math.random().toString(36).slice(2, 6);
}

export async function tenantSignup(formData: FormData): Promise<TenantSignupResult> {
    const companyName = (formData.get("company_name") as string | null)?.trim() ?? "";
    const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
    const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    if (!companyName || !firstName || !lastName || !email || !password) {
        return { success: false, error: "All fields are required" };
    }
    if (password.length < 8) {
        return { success: false, error: "Password must be at least 8 characters" };
    }

    const baseSlug = slugify(companyName);
    if (baseSlug.length < 3) {
        return { success: false, error: "Company name must be at least 3 letters or numbers" };
    }

    try {
        const admin = await createAdminClient();

        // Pick a slug — try the base, then append a short suffix on collision.
        let slug = baseSlug;
        for (let i = 0; i < 4; i++) {
            const { data: existing } = await admin
                .from("tenants")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
            if (!existing) break;
            slug = `${baseSlug}-${randomSuffix()}`;
            if (i === 3) {
                return { success: false, error: "Couldn't generate a unique workspace URL — try a different company name." };
            }
        }

        const fullName = `${firstName} ${lastName}`;

        // No subscription is created here — the wizard's plan step kicks the
        // owner into Stripe Checkout, which starts the 30-day trial.
        const { data: tenant, error: tenantError } = await admin
            .from("tenants")
            .insert({
                name: companyName,
                slug,
                company_name: companyName,
                status: "active",
            })
            .select()
            .single();

        if (tenantError || !tenant) {
            return { success: false, error: "Failed to create company. Please try again." };
        }

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                user_type: "admin",
                tenant_id: tenant.id,
                tenant_role: "owner",
                onboarding_completed: true,
            },
            app_metadata: {
                active_tenant_id: tenant.id,
            },
        });

        if (authError || !authData.user) {
            await admin.from("tenants").delete().eq("id", tenant.id);
            return { success: false, error: authError?.message || "Failed to create account" };
        }

        await admin
            .from("tenants")
            .update({ owner_id: authData.user.id })
            .eq("id", tenant.id);

        await seedDefaultRoles(tenant.id);

        const supabase = await createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            return { success: false, error: "Account created but sign-in failed. Please log in manually." };
        }

        return { success: true, tenantId: tenant.id };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred" };
    }
}
