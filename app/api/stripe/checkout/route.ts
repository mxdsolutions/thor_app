import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { stripeCheckoutSchema } from "@/lib/validation";
import { getStripe } from "@/lib/stripe";
import { isAllowedPriceId } from "@/lib/plans";

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
    const validation = stripeCheckoutSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    // Whitelist the price ID against env-configured plans so a malicious caller
    // can't checkout against an arbitrary Stripe price (e.g. a $0 one).
    if (!isAllowedPriceId(validation.data.price_id)) {
        return NextResponse.json({ error: "Unknown price_id" }, { status: 400 });
    }

    // Block billing-exempt tenants from creating a real Stripe subscription.
    const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("billing_exempt")
        .eq("id", tenantId)
        .single();

    if (tenantErr) {
        console.error("Failed to load tenant for checkout:", tenantErr);
        return serverError();
    }

    if (tenant?.billing_exempt) {
        return NextResponse.json(
            { error: "This tenant is billing-exempt and doesn't need a subscription." },
            { status: 409 },
        );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        console.error("NEXT_PUBLIC_APP_URL is not configured");
        return serverError();
    }

    // Existing subscription row (any state) means we already have a Stripe
    // customer for this tenant — reuse it so the portal / invoices stay
    // attached to one customer record. It also disqualifies the tenant from
    // another free trial.
    const { data: existing, error: existingErr } = await supabase
        .from("tenant_subscriptions")
        .select("stripe_customer_id, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (existingErr) {
        console.error("Failed to load tenant_subscriptions:", existingErr);
        return serverError();
    }

    // Block re-checkout for active / trialing subs — those tenants should
    // change plans through the Customer Portal instead.
    if (existing && (existing.status === "active" || existing.status === "trialing")) {
        return NextResponse.json(
            { error: "Tenant already has an active subscription. Use the Customer Portal to change plans." },
            { status: 409 },
        );
    }

    // Bill for both active members and outstanding invites — owners can
    // invite teammates during onboarding before subscribing, and we don't
    // want them to land on `no_seats_available` the moment an invitee
    // accepts. Mirrors the `used` calc in `getSeatUsage`.
    const [memberRes, inviteRes] = await Promise.all([
        supabase
            .from("tenant_memberships")
            .select("user_id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
        supabase
            .from("tenant_invites")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString()),
    ]);

    if (memberRes.error || inviteRes.error) {
        console.error("Failed to count seats for checkout:", memberRes.error ?? inviteRes.error);
        return serverError();
    }

    const quantity = Math.max(1, (memberRes.count ?? 0) + (inviteRes.count ?? 0));
    const eligibleForTrial = !existing;

    const successUrl = validation.data.from_signup
        ? `${appUrl}/dashboard?welcome=1&session_id={CHECKOUT_SESSION_ID}`
        : `${appUrl}/dashboard/settings/account/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = validation.data.from_signup
        ? `${appUrl}/signup?step=plan&checkout=cancelled`
        : `${appUrl}/dashboard/settings/account/plan?checkout=cancelled`;

    try {
        const session = await getStripe().checkout.sessions.create({
            mode: "subscription",
            client_reference_id: tenantId,
            ...(existing?.stripe_customer_id
                ? { customer: existing.stripe_customer_id }
                : { customer_email: user.email ?? undefined }),
            line_items: [
                {
                    price: validation.data.price_id,
                    quantity,
                },
            ],
            allow_promotion_codes: true,
            subscription_data: {
                metadata: { tenant_id: tenantId },
                ...(eligibleForTrial ? { trial_period_days: 30 } : {}),
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        if (!session.url) {
            console.error("Stripe Checkout session has no url:", session.id);
            return serverError();
        }

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error("Failed to create Stripe Checkout session:", err);
        return serverError();
    }
});
