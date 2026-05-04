import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SupabaseAdmin = Awaited<ReturnType<typeof createAdminClient>>;

// Events the handler writes to tenant_subscriptions for. Anything else is
// logged and no-op'd. Subscription lifecycle + invoice payment covers
// everything we render in the UI or gate on in middleware.
const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
]);

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured");
        return new NextResponse(null, { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return new NextResponse(null, { status: 400 });
    }

    // Raw body required for signature verification — any JSON parsing or
    // whitespace normalisation breaks the HMAC.
    const payload = await request.text();

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return new NextResponse(null, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Idempotency guard: PK conflict on event_id means we've already seen this
    // delivery and processed it (or are still processing a retry). Return 200
    // so Stripe stops retrying.
    const { error: insertErr } = await supabase
        .from("stripe_webhook_events")
        .insert({
            event_id: event.id,
            event_type: event.type,
            payload: event as unknown as Record<string, unknown>,
        });

    if (insertErr) {
        if (insertErr.code === "23505") {
            return new NextResponse(null, { status: 200 });
        }
        console.error("Failed to log Stripe webhook event:", insertErr);
        return new NextResponse(null, { status: 500 });
    }

    try {
        if (HANDLED_EVENTS.has(event.type)) {
            await dispatch(supabase, event);
        }

        await supabase
            .from("stripe_webhook_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", event.id);

        return new NextResponse(null, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Stripe webhook handler error for ${event.type}:`, err);
        await supabase
            .from("stripe_webhook_events")
            .update({ error_message: message })
            .eq("event_id", event.id);
        // 500 tells Stripe to retry with backoff — appropriate for transient
        // DB errors. Signature / parse errors are already 400 above.
        return new NextResponse(null, { status: 500 });
    }
}

async function dispatch(supabase: SupabaseAdmin, event: Stripe.Event): Promise<void> {
    switch (event.type) {
        case "checkout.session.completed":
            await handleCheckoutCompleted(supabase, event.data.object);
            return;
        case "customer.subscription.created":
        case "customer.subscription.updated":
            await handleSubscriptionUpsert(supabase, event.data.object);
            return;
        case "customer.subscription.deleted":
            await handleSubscriptionDeleted(supabase, event.data.object);
            return;
        case "invoice.payment_failed":
            await handleInvoicePaymentFailed(supabase, event.data.object);
            return;
        case "invoice.payment_succeeded":
            // Nothing to do today — receipts are handled by Stripe's built-in
            // emails. Kept in HANDLED_EVENTS so it's logged as "processed".
            return;
    }
}

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

async function handleCheckoutCompleted(
    supabase: SupabaseAdmin,
    session: Stripe.Checkout.Session,
): Promise<void> {
    if (session.mode !== "subscription") return;

    const tenantId = session.client_reference_id;
    if (!tenantId) {
        throw new Error(`Checkout session ${session.id} has no client_reference_id`);
    }

    const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    if (!customerId) {
        throw new Error(`Checkout session ${session.id} has no customer`);
    }

    const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) {
        throw new Error(`Checkout session ${session.id} has no subscription`);
    }

    // The Checkout Session's subscription field often isn't expanded, so fetch
    // the full subscription to get items, status, period end, etc.
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionRow(supabase, tenantId, customerId, subscription);
}

async function handleSubscriptionUpsert(
    supabase: SupabaseAdmin,
    subscription: Stripe.Subscription,
): Promise<void> {
    const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    // Look up the tenant via an existing row. If there isn't one yet, this
    // event likely arrived before checkout.session.completed — no-op here
    // and let that event create the row (it carries the tenant link).
    const { data: existing } = await supabase
        .from("tenant_subscriptions")
        .select("tenant_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

    if (!existing) return;

    await upsertSubscriptionRow(supabase, existing.tenant_id, customerId, subscription);
}

async function handleSubscriptionDeleted(
    supabase: SupabaseAdmin,
    subscription: Stripe.Subscription,
): Promise<void> {
    const { error } = await supabase
        .from("tenant_subscriptions")
        .update({
            status: "canceled",
            cancel_at_period_end: false,
        })
        .eq("stripe_subscription_id", subscription.id);

    if (error) throw new Error(`Failed to mark subscription canceled: ${error.message}`);
}

async function handleInvoicePaymentFailed(
    supabase: SupabaseAdmin,
    invoice: Stripe.Invoice,
): Promise<void> {
    const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) return;

    const { error } = await supabase
        .from("tenant_subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", customerId);

    if (error) throw new Error(`Failed to mark subscription past_due: ${error.message}`);
}

// --------------------------------------------------------------------------
// Shared upsert
// --------------------------------------------------------------------------

async function upsertSubscriptionRow(
    supabase: SupabaseAdmin,
    tenantId: string,
    customerId: string,
    subscription: Stripe.Subscription,
): Promise<void> {
    const item = subscription.items.data[0];
    if (!item) {
        throw new Error(`Subscription ${subscription.id} has no items`);
    }

    const row = {
        tenant_id: tenantId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_item_id: item.id,
        stripe_price_id: item.price.id,
        status: subscription.status,
        quantity: item.quantity ?? 1,
        trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        // current_period_end lives on the SubscriptionItem in API 2026-04-22;
        // it moved off the Subscription object itself.
        current_period_end: item.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
    };

    const { error } = await supabase
        .from("tenant_subscriptions")
        .upsert(row, { onConflict: "tenant_id" });

    if (error) {
        throw new Error(`Failed to upsert tenant_subscriptions: ${error.message}`);
    }
}
