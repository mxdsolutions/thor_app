import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { missingParamError, serverError } from "@/app/api/_lib/errors";
import { isValidItemKey } from "../items";

async function isOwner(supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>, userId: string, tenantId: string) {
    const { data } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .single();
    return data?.role === "owner";
}

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key : null;
    if (!key) return missingParamError("key");
    if (!isValidItemKey(key)) {
        return NextResponse.json({ error: "Unknown item key" }, { status: 400 });
    }

    if (!(await isOwner(supabase, user.id, tenantId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
        .from("tenant_setup_skips")
        .upsert(
            { tenant_id: tenantId, item_key: key, skipped_by: user.id, skipped_at: new Date().toISOString() },
            { onConflict: "tenant_id,item_key" }
        );
    if (error) return serverError();
    return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (request, { supabase, user, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return missingParamError("key");
    if (!isValidItemKey(key)) {
        return NextResponse.json({ error: "Unknown item key" }, { status: 400 });
    }

    if (!(await isOwner(supabase, user.id, tenantId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
        .from("tenant_setup_skips")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("item_key", key);
    if (error) return serverError();
    return NextResponse.json({ ok: true });
});
