"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { seedDefaultRoles } from "@/lib/tenant";

export async function tenantSignup(formData: FormData) {
    const companyName = formData.get("company_name") as string;
    const slug = formData.get("slug") as string;
    const fullName = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!companyName || !slug || !fullName || !email || !password) {
        return { error: "All fields are required" };
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3 || slug.length > 48) {
        return { error: "Slug must be 3-48 characters, lowercase letters, numbers, and hyphens only" };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    try {
        const admin = await createAdminClient();

        // Check if slug is taken
        const { data: existing } = await admin
            .from("tenants")
            .select("id")
            .eq("slug", slug)
            .single();

        if (existing) {
            return { error: "This company URL is already taken. Try a different one." };
        }

        // Create the tenant. No subscription is created here — the new owner
        // lands on the subscription settings page and chooses a plan via Stripe
        // Checkout (CLM-77), which starts a 30-day trial via the Checkout Session.
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
            return { error: "Failed to create company. Please try again." };
        }

        // Parse name
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        // Create the auth user with tenant metadata
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
            },
            app_metadata: {
                active_tenant_id: tenant.id,
            },
        });

        if (authError || !authData.user) {
            // Clean up the tenant if user creation fails
            await admin.from("tenants").delete().eq("id", tenant.id);
            return { error: authError?.message || "Failed to create account" };
        }

        // Update tenant owner_id
        await admin
            .from("tenants")
            .update({ owner_id: authData.user.id })
            .eq("id", tenant.id);

        // Seed default roles for the new tenant
        await seedDefaultRoles(tenant.id);

        // Sign the user in
        const supabase = await createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            return { error: "Account created but sign-in failed. Please log in manually." };
        }

        return { success: true, tenantId: tenant.id };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
    }
}
