-- CLM-79 / Phase 2 of the Stripe integration plan (docs/plans/stripe-integration_2026-04-25).
-- Creates the two tables the Stripe webhook handler writes to:
--   * tenant_subscriptions — projection of Stripe subscription state, one row per tenant.
--   * stripe_webhook_events — append-only log of processed event IDs for idempotency.
--
-- Stripe is authoritative; these tables are a read model. All writes happen from
-- the webhook handler using the service-role client (RLS bypass). Tenant members
-- have read access so the subscription settings UI can render without extra RPCs.
--
-- The existing tenants.plan / max_users / trial_ends_at columns are NOT touched —
-- they're left in place as dead weight until a follow-up cleanup migration drops
-- them once all readers have moved to tenant_subscriptions.

-- --------------------------------------------------------------------------
-- tenant_subscriptions
-- --------------------------------------------------------------------------

CREATE TABLE public.tenant_subscriptions (
    tenant_id              uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    stripe_customer_id     text NOT NULL UNIQUE,
    stripe_subscription_id text UNIQUE,
    stripe_item_id         text,
    stripe_price_id        text,
    status                 text NOT NULL CHECK (status IN (
        'trialing', 'active', 'past_due', 'unpaid', 'canceled',
        'incomplete', 'incomplete_expired', 'paused'
    )),
    quantity               integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    trial_end              timestamptz,
    current_period_end     timestamptz,
    cancel_at_period_end   boolean NOT NULL DEFAULT false,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_subscriptions_customer_idx
    ON public.tenant_subscriptions (stripe_customer_id);

CREATE INDEX tenant_subscriptions_subscription_idx
    ON public.tenant_subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX tenant_subscriptions_status_idx
    ON public.tenant_subscriptions (status);

-- Keep updated_at in sync on any UPDATE. Using a trigger so webhook code doesn't
-- have to remember to set it on every handler.
CREATE OR REPLACE FUNCTION public.touch_tenant_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_subscriptions_set_updated_at
    BEFORE UPDATE ON public.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.touch_tenant_subscriptions_updated_at();

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Members of the tenant can read the row (subscription UI, middleware lock check).
CREATE POLICY tenant_subscriptions_select
    ON public.tenant_subscriptions
    FOR SELECT
    TO authenticated
    USING (tenant_id = get_user_tenant_id());

-- No INSERT / UPDATE / DELETE policies for authenticated — webhook uses the
-- service role which bypasses RLS entirely. Any attempt to write from the
-- browser client will be rejected.

-- --------------------------------------------------------------------------
-- stripe_webhook_events
-- --------------------------------------------------------------------------
-- Append-only log. The handler inserts the event id before doing any work;
-- on conflict it short-circuits. PK on event_id guarantees exactly-once.

CREATE TABLE public.stripe_webhook_events (
    event_id      text PRIMARY KEY,
    event_type    text NOT NULL,
    received_at   timestamptz NOT NULL DEFAULT now(),
    processed_at  timestamptz,
    payload       jsonb,
    error_message text
);

CREATE INDEX stripe_webhook_events_received_at_idx
    ON public.stripe_webhook_events (received_at DESC);

CREATE INDEX stripe_webhook_events_type_idx
    ON public.stripe_webhook_events (event_type);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies at all — this table is service-role only. Nothing else should
-- ever need to query it. (Platform admins can inspect via the SQL editor if
-- they're debugging a delivery issue.)
