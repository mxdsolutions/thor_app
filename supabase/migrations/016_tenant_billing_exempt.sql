-- Adds a per-tenant opt-out for Stripe billing.
--
-- Internal / comped tenants (e.g. the platform owner's own workspace, partner
-- accounts) shouldn't have a real Stripe customer or subscription. With this
-- flag set, the subscription endpoint returns a synthetic active-Forged row,
-- the Checkout + Portal endpoints 409, and the future middleware lock check
-- treats the tenant as always-paid.
--
-- Stripe is still authoritative for non-exempt tenants — this column is the
-- single bypass switch, set manually in the DB by a platform admin.

ALTER TABLE public.tenants
    ADD COLUMN billing_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.billing_exempt IS
    'True for tenants that bypass Stripe billing entirely (internal / comped accounts). When true, the subscription UI renders as Forged tier with no manage-billing button, and the Checkout + Portal endpoints 409.';
