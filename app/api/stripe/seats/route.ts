import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { stripeSeatsUpdateSchema } from "@/lib/validation";
import { getStripe } from "@/lib/stripe";
import { getSeatUsage } from "@/lib/stripe-seats";

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(
        supabase,
        user.id,
        tenantId,
        "settings.subscription",
        "write",
    );
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const validation = stripeSeatsUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);
    const { delta } = validation.data;

    const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("billing_exempt")
        .eq("id", tenantId)
        .single();
    if (tenantErr) {
        console.error("Failed to load tenant for seats update:", tenantErr);
        return serverError();
    }
    if (tenant?.billing_exempt) {
        return NextResponse.json(
            { error: "This tenant is billing-exempt and doesn't manage seats via Stripe." },
            { status: 409 },
        );
    }

    const { data: sub, error: subErr } = await supabase
        .from("tenant_subscriptions")
        .select("stripe_subscription_id, stripe_item_id, quantity, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();
    if (subErr) {
        console.error("Failed to load tenant_subscriptions for seats update:", subErr);
        return serverError();
    }
    if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
        return NextResponse.json(
            { error: "No active subscription. Subscribe before adding seats." },
            { status: 409 },
        );
    }
    if (!sub.stripe_subscription_id || !sub.stripe_item_id) {
        console.error("tenant_subscriptions row missing Stripe IDs:", { tenantId });
        return serverError();
    }

    const newQuantity = sub.quantity + delta;
    if (newQuantity < 1) {
        return NextResponse.json(
            { error: "Quantity must be at least 1." },
            { status: 400 },
        );
    }

    // Negative delta: don't let the owner shrink below the active seat count.
    if (delta < 0) {
        const usage = await getSeatUsage(supabase, tenantId);
        if (newQuantity < usage.used) {
            return NextResponse.json(
                {
                    error: `Can't reduce to ${newQuantity} seats — ${usage.used} are in use. Remove members or pending invites first.`,
                },
                { status: 400 },
            );
        }
    }

    try {
        await getStripe().subscriptions.update(sub.stripe_subscription_id, {
            items: [{ id: sub.stripe_item_id, quantity: newQuantity }],
            proration_behavior: "create_prorations",
        });
    } catch (err) {
        console.error("Failed to update Stripe subscription quantity:", err);
        return serverError();
    }

    // Webhook (`customer.subscription.updated`) is the source of truth for
    // `tenant_subscriptions.quantity` — return the optimistic value so the UI
    // can update immediately while we wait for the webhook to land.
    return NextResponse.json({ quantity: newQuantity });
});
