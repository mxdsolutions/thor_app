import { NextRequest, NextResponse } from "next/server";
import { withPlatformAuth } from "@/app/api/_lib/handler";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { moduleConfigUpdateSchema } from "@/lib/validation";
import { DEFAULT_MODULES } from "@/lib/module-config";

export const GET = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
        return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const { data, error } = await adminClient
        .from("tenant_modules")
        .select("module_id, enabled")
        .eq("tenant_id", tenantId);

    if (error) return serverError(error);

    if (!data || data.length === 0) {
        return NextResponse.json({ modules: DEFAULT_MODULES, is_default: true });
    }

    return NextResponse.json({ modules: data, is_default: false });
});

export const PUT = withPlatformAuth(async (request: NextRequest, { adminClient }) => {
    const body = await request.json();
    const validation = moduleConfigUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { tenant_id, modules } = validation.data;

    // Upsert each module row
    const rows = modules.map((m) => ({
        tenant_id,
        module_id: m.module_id,
        enabled: m.enabled,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await adminClient
        .from("tenant_modules")
        .upsert(rows, { onConflict: "tenant_id,module_id" });

    if (error) {
        console.error("[platform-admin] Module config upsert error:", error);
        return serverError();
    }

    // Return the full updated list
    const { data: updated } = await adminClient
        .from("tenant_modules")
        .select("module_id, enabled")
        .eq("tenant_id", tenant_id);

    return NextResponse.json({ modules: updated || [] });
});
