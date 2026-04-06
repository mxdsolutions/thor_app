import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { DEFAULT_MODULES } from "@/lib/module-config";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data, error } = await supabase
        .from("tenant_modules")
        .select("module_id, enabled")
        .eq("tenant_id", tenantId);

    if (error || !data || data.length === 0) {
        return NextResponse.json({ modules: DEFAULT_MODULES });
    }

    // Merge with defaults so new modules appear automatically
    const existing = new Set(data.map((m) => m.module_id));
    const merged = [
        ...data,
        ...DEFAULT_MODULES.filter((m) => !existing.has(m.module_id)),
    ];

    return NextResponse.json({ modules: merged });
});
