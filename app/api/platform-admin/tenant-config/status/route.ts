import { NextRequest, NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { statusConfigUpdateSchema } from "@/lib/validation";
import { DEFAULTS_BY_ENTITY, type EntityType } from "@/lib/status-config";

export const GET = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant_id");
    const entityType = url.searchParams.get("entity_type") as EntityType | null;

    if (!tenantId) {
        return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    if (entityType) {
        // Return config for a specific entity type
        if (!DEFAULTS_BY_ENTITY[entityType]) {
            return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
        }

        const { data, error } = await adminClient
            .from("tenant_status_configs")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("entity_type", entityType)
            .single();

        if (error || !data) {
            return NextResponse.json({ statuses: DEFAULTS_BY_ENTITY[entityType], is_default: true });
        }

        return NextResponse.json({ ...data, is_default: false });
    }

    // Return all configs for the tenant
    const { data, error } = await adminClient
        .from("tenant_status_configs")
        .select("*")
        .eq("tenant_id", tenantId);

    if (error) return serverError(error);

    return NextResponse.json({ items: data || [] });
});

export const PUT = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const body = await request.json();
    const validation = statusConfigUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { tenant_id, entity_type, statuses } = validation.data;

    const { data, error } = await adminClient
        .from("tenant_status_configs")
        .upsert(
            {
                tenant_id,
                entity_type,
                statuses,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id,entity_type" },
        )
        .select()
        .single();

    if (error) {
        console.error("[platform-admin] Status config upsert error:", error);
        return serverError();
    }

    return NextResponse.json({ item: data });
});
