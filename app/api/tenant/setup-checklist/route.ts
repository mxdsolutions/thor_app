import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";
import { SETUP_ITEMS, type SetupItemKey, type SetupItemStatus } from "./items";

type ChecklistResponseItem = {
    key: SetupItemKey;
    label: string;
    description: string;
    href: string;
    status: SetupItemStatus;
};

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const [tenantRes, membershipsRes, jobsRes, xeroRes, skipsRes] =
        await Promise.all([
            supabase
                .from("tenants")
                .select("reference_prefix, address, phone, email, logo_url, report_cover_url")
                .eq("id", tenantId)
                .single(),
            supabase
                .from("tenant_memberships")
                .select("user_id", { count: "exact", head: true })
                .eq("tenant_id", tenantId),
            supabase
                .from("jobs")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", tenantId),
            supabase
                .from("xero_connections")
                .select("status")
                .eq("tenant_id", tenantId)
                .maybeSingle(),
            supabase
                .from("tenant_setup_skips")
                .select("item_key")
                .eq("tenant_id", tenantId),
        ]);

    if (tenantRes.error) return serverError(tenantRes.error);

    const tenant = tenantRes.data;
    const memberCount = membershipsRes.count ?? 0;
    const jobCount = jobsRes.count ?? 0;
    const xeroConnected =
        !!xeroRes.data && xeroRes.data.status !== "pending_org_selection";
    const skipped = new Set<string>(
        (skipsRes.data ?? []).map((r) => r.item_key)
    );

    const completed: Record<SetupItemKey, boolean> = {
        prefix: !!tenant.reference_prefix,
        company_info: !!tenant.address && !!tenant.phone && !!tenant.email,
        logo: !!tenant.logo_url,
        report_cover: !!tenant.report_cover_url,
        invite_members: memberCount > 1,
        first_job: jobCount > 0,
        xero_sync: xeroConnected,
    };

    const items: ChecklistResponseItem[] = SETUP_ITEMS.map((item) => {
        let status: SetupItemStatus = "pending";
        if (completed[item.key]) status = "complete";
        else if (skipped.has(item.key)) status = "skipped";
        return { ...item, status };
    });

    const total = items.length;
    const done = items.filter((i) => i.status !== "pending").length;
    const completeCount = items.filter((i) => i.status === "complete").length;

    return NextResponse.json({
        items,
        progress: { done, total, complete: completeCount },
    });
});
