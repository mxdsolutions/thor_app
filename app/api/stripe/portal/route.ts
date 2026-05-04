import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";
import { getStripe } from "@/lib/stripe";

export const POST = withAuth(async (_request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "settings.subscription",
        "write",
    );
    if (denied) return denied;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        console.error("NEXT_PUBLIC_APP_URL is not configured");
        return serverError();
    }

    const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("billing_exempt")
        .eq("id", tenantId)
        .single();

    if (tenantErr) {
        console.error("Failed to load tenant for portal:", tenantErr);
        return serverError();
    }

    if (tenant?.billing_exempt) {
        return NextResponse.json(
            { error: "This tenant is billing-exempt — no Stripe portal to open." },
            { status: 409 },
        );
    }

    const { data: row, error } = await supabase
        .from("tenant_subscriptions")
        .select("stripe_customer_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (error) {
        console.error("Failed to load tenant_subscriptions:", error);
        return serverError();
    }

    if (!row?.stripe_customer_id) {
        return NextResponse.json(
            { error: "No Stripe customer for this tenant. Subscribe first." },
            { status: 409 },
        );
    }

    try {
        const session = await getStripe().billingPortal.sessions.create({
            customer: row.stripe_customer_id,
            return_url: `${appUrl}/dashboard/settings/company/subscription`,
        });
        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error("Failed to create Stripe Billing Portal session:", err);
        return serverError();
    }
});
