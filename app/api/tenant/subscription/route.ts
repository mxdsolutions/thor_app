import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";
import { getPlans } from "@/lib/plans";
import { getSeatUsage } from "@/lib/stripe-seats";

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("billing_exempt")
        .eq("id", tenantId)
        .single();

    if (tenantErr) {
        console.error("Failed to load tenant for subscription:", tenantErr);
        return serverError();
    }

    const plans = getPlans();
    const usage = await getSeatUsage(supabase, tenantId);

    // `Infinity` doesn't survive JSON.stringify — surface it as null so the
    // client can render "Unlimited" without parsing NaN.
    const usageJson = {
        used: usage.used,
        quantity: Number.isFinite(usage.quantity) ? usage.quantity : null,
        available: Number.isFinite(usage.available) ? usage.available : null,
    };

    if (tenant?.billing_exempt) {
        const forged = plans.find((p) => p.id === "forged");
        if (!forged) return serverError();

        return NextResponse.json({
            subscription: {
                status: "active" as const,
                quantity: Math.max(1, usage.used),
                stripe_price_id: forged.monthly.price_id,
                trial_end: null,
                current_period_end: null,
                cancel_at_period_end: false,
            },
            plans,
            eligible_for_trial: false,
            billing_exempt: true,
            usage: usageJson,
        });
    }

    const { data: subscription, error } = await supabase
        .from("tenant_subscriptions")
        .select(
            "status, quantity, stripe_price_id, trial_end, current_period_end, cancel_at_period_end",
        )
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (error) {
        console.error("Failed to load tenant subscription:", error);
        return serverError();
    }

    return NextResponse.json({
        subscription,
        plans,
        eligible_for_trial: !subscription,
        billing_exempt: false,
        usage: usageJson,
    });
});
