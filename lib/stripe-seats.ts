import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SeatUsage = {
    used: number;
    quantity: number;
    available: number;
    billing_exempt: boolean;
    has_subscription: boolean;
};

/**
 * Compute seat usage for a tenant: how many seats they're paying for vs. how
 * many are filled by memberships + outstanding invites.
 *
 * `used` counts both:
 *   - active rows in `tenant_memberships` (people who've accepted)
 *   - rows in `tenant_invites` where `accepted_at IS NULL` and the invite
 *     hasn't expired (pending invites — count toward the cap so an owner
 *     can't oversend invitations)
 *
 * For `billing_exempt` tenants there's no cap — we report Infinity for
 * `quantity` and `available` so callers can `available > 0` without special-
 * casing. For tenants with no `tenant_subscriptions` row yet (fresh signup,
 * pre-checkout) `quantity` is 0 and `has_subscription` is false — the UI
 * uses that to route to the pricing cards instead of the Add Seats modal.
 */
export async function getSeatUsage(
    supabase: SupabaseClient,
    tenantId: string,
): Promise<SeatUsage> {
    const [tenantRes, subRes, memberRes, inviteRes] = await Promise.all([
        supabase
            .from("tenants")
            .select("billing_exempt")
            .eq("id", tenantId)
            .single(),
        supabase
            .from("tenant_subscriptions")
            .select("quantity, status")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
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

    const billingExempt = tenantRes.data?.billing_exempt === true;
    const memberCount = memberRes.count ?? 0;
    const inviteCount = inviteRes.count ?? 0;
    const used = memberCount + inviteCount;

    if (billingExempt) {
        return {
            used,
            quantity: Number.POSITIVE_INFINITY,
            available: Number.POSITIVE_INFINITY,
            billing_exempt: true,
            has_subscription: true,
        };
    }

    const sub = subRes.data;
    const hasActiveSub = !!sub && (sub.status === "active" || sub.status === "trialing");
    const quantity = hasActiveSub ? sub.quantity : 0;
    const available = Math.max(0, quantity - used);

    return {
        used,
        quantity,
        available,
        billing_exempt: false,
        has_subscription: hasActiveSub,
    };
}
