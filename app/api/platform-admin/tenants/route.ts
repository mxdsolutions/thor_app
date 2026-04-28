import { NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { platformTenantCreateSchema } from "@/lib/validation";
import { seedDefaultRoles, seedDefaultStatuses, seedDefaultModules } from "@/lib/tenant";

export const GET = withPlatformAuth(async (request, { adminClient }) => {
    const { limit, offset, search } = parsePagination(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = adminClient
        .from("tenants")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,company_name.ilike.%${search}%`);
    }
    if (status) {
        query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) return serverError();

    const tenantIds = (data || []).map((t: { id: string }) => t.id);
    const ownerIds = (data || []).map((t: { owner_id: string | null }) => t.owner_id).filter(Boolean) as string[];

    // Fetch member counts and owner profiles in parallel
    const [membershipsResult, ownersResult] = await Promise.all([
        tenantIds.length > 0
            ? adminClient.from("tenant_memberships").select("tenant_id").in("tenant_id", tenantIds)
            : { data: [] },
        ownerIds.length > 0
            ? adminClient.from("profiles").select("id, full_name, email").in("id", ownerIds)
            : { data: [] },
    ]);

    const memberCounts: Record<string, number> = {};
    if (membershipsResult.data) {
        for (const m of membershipsResult.data) {
            memberCounts[m.tenant_id] = (memberCounts[m.tenant_id] || 0) + 1;
        }
    }

    const ownerMap: Record<string, { full_name: string; email: string }> = {};
    if (ownersResult.data) {
        for (const o of ownersResult.data) {
            ownerMap[o.id] = { full_name: o.full_name, email: o.email };
        }
    }

    const items = (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        owner: ownerMap[(t as { owner_id: string }).owner_id] || null,
        member_count: memberCounts[(t as { id: string }).id] || 0,
    }));

    return NextResponse.json({ items, total: count || 0 });
});

export const POST = withPlatformAuth(async (request, { adminClient, user }) => {
    const body = await request.json();
    const validation = platformTenantCreateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { company_name, slug, owner_email, owner_name } = validation.data;

    // Create the tenant (slug has a UNIQUE constraint — handle conflicts).
    // Subscription is set up separately by the owner via Stripe Checkout —
    // no plan / seat fields live on the tenant row anymore.
    const { data: tenant, error: tenantError } = await adminClient
        .from("tenants")
        .insert({
            name: company_name,
            slug,
            company_name,
            status: "active",
        })
        .select()
        .single();

    if (tenantError) {
        if (tenantError.code === "23505") {
            return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
        }
        return serverError();
    }
    if (!tenant) return serverError();

    // Create the owner user
    const nameParts = owner_name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: owner_email,
        email_confirm: true,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: owner_name,
            user_type: "admin",
            tenant_id: tenant.id,
            tenant_role: "owner",
        },
        app_metadata: {
            active_tenant_id: tenant.id,
        },
    });

    if (authError || !authData.user) {
        // Clean up tenant on failure
        await adminClient.from("tenants").delete().eq("id", tenant.id);
        console.error(`[platform-admin] Failed to create owner for tenant ${tenant.id}:`, authError?.message);
        return NextResponse.json(
            { error: "Failed to create owner account. The email may already be in use." },
            { status: 400 }
        );
    }

    // Update tenant owner_id
    await adminClient
        .from("tenants")
        .update({ owner_id: authData.user.id })
        .eq("id", tenant.id);

    // Create profile for the owner
    await adminClient
        .from("profiles")
        .upsert({
            id: authData.user.id,
            full_name: owner_name,
            email: owner_email,
        });

    // Create tenant membership
    await adminClient
        .from("tenant_memberships")
        .insert({
            tenant_id: tenant.id,
            user_id: authData.user.id,
            role: "owner",
        });

    // Seed defaults
    await seedDefaultRoles(tenant.id);
    await seedDefaultStatuses(tenant.id);
    await seedDefaultModules(tenant.id);

    console.log(`[platform-admin] Tenant ${tenant.id} (${slug}) created by ${user.id}`);

    return NextResponse.json({ item: { ...tenant, owner_id: authData.user.id } }, { status: 201 });
});
