import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { z } from "zod";
import { validationError } from "@/app/api/_lib/errors";

const selectTenantSchema = z.object({
    xero_tenant_id: z.string().min(1, "Xero tenant ID is required"),
    xero_tenant_name: z.string().min(1, "Xero tenant name is required"),
});

export const POST = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = selectTenantSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { xero_tenant_id, xero_tenant_name } = validation.data;

    const { error } = await supabase
        .from("xero_connections")
        .update({
            xero_tenant_id,
            xero_tenant_name,
            status: "active",
            updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);

    if (error) {
        return NextResponse.json(
            { error: "Failed to select organization" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
});
