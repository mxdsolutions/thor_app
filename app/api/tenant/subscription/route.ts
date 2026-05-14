import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError } from "@/app/api/_lib/errors";
import { getPlans, type Plan } from "@/lib/plans";
import { getSeatUsage } from "@/lib/stripe-seats";

export const GET = withAuth(async (_request, { supabase, user, tenantId }) => {
    // Subscription details (plan, seat usage, billing status) are
    // owner/admin-only. The invite modal also calls this endpoint for the
    // pre-invite seat-quota check, but only owners/admins can invite, so
    // the same gate is sufficient.
    const denied = await requirePermission(supabase, user.id, tenantId, "settings.subscription", "read");
    if (denied) return denied;
    const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("billing_exempt")
        .eq("id", tenantId)
        .single();

    if (tenantErr) {
        console.error("Failed to load tenant for subscription:", tenantErr);
        return serverError();
    }

    const usage = await getSeatUsage(supabase, tenantId);

    // `Infinity` doesn't survive JSON.stringify — surface it as null so the
    // client can render "Unlimited" without parsing NaN.
    const usageJson = {
        used: usage.used,
        quantity: Number.isFinite(usage.quantity) ? usage.quantity : null,
        available: Number.isFinite(usage.available) ? usage.available : null,
    };

    if (tenant?.billing_exempt) {
        // Billing-exempt tenants can't checkout via Stripe, so the response
        // doesn't strictly need plan/price data. Try to load plans for the
        // tier display, but degrade gracefully when STRIPE_PRICE_* env vars
        // aren't configured — otherwise this whole endpoint 500s and the
        // invite modal silently blocks because subData stays undefined.
        let plans: Plan[] = [];
        let stripe_price_id: string | null = null;
        try {
            plans = getPlans();
            stripe_price_id = plans.find((p) => p.id === "forged")?.monthly.price_id ?? null;
        } catch (e) {
            console.error("[subscription] Falling back to empty plans for billing-exempt tenant:", e);
        }

        return NextResponse.json({
            subscription: {
                status: "active" as const,
                quantity: Math.max(1, usage.used),
                stripe_price_id,
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

    const plans = getPlans();

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
