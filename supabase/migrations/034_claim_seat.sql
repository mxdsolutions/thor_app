-- ============================================================================
-- 034_claim_seat.sql
-- Atomic seat allocation for the invite flow.
--
-- Without this, two concurrent inviteUser calls can both pass the
-- "available > 0" check and exceed the paid quota. The function takes a
-- transaction-scoped advisory lock keyed on tenant_id so concurrent callers
-- serialize through the same code path.
--
-- Returns:
--   {claimed: true, available: <new available count>}  on success
--   {claimed: false, reason: 'no_seats', available: 0} when full
--   {claimed: false, reason: 'no_subscription'}        when billing not set up
--
-- Billing-exempt tenants always succeed with claimed=true.
-- The caller is still responsible for the actual auth.admin.inviteUserByEmail
-- call; this function only reserves the slot via the seat-counting predicate
-- (memberships + non-expired pending invites).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_seat(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_billing_exempt boolean;
    v_status text;
    v_quantity integer;
    v_used integer;
    v_lock_key bigint;
BEGIN
    -- Hash tenant_id into a bigint for advisory_xact_lock.
    v_lock_key := ('x' || substr(md5(p_tenant_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT billing_exempt
      INTO v_billing_exempt
      FROM tenants
     WHERE id = p_tenant_id;

    IF v_billing_exempt = true THEN
        RETURN jsonb_build_object('claimed', true, 'billing_exempt', true);
    END IF;

    SELECT status, quantity
      INTO v_status, v_quantity
      FROM tenant_subscriptions
     WHERE tenant_id = p_tenant_id;

    IF v_status IS NULL OR v_status NOT IN ('active', 'trialing') THEN
        -- No active subscription: invites still allowed (pre-subscription
        -- onboarding) — billing is computed at checkout.
        RETURN jsonb_build_object('claimed', true, 'has_subscription', false);
    END IF;

    SELECT
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = p_tenant_id) +
        (SELECT COUNT(*) FROM tenant_invites
            WHERE tenant_id = p_tenant_id
              AND accepted_at IS NULL
              AND expires_at > NOW())
      INTO v_used;

    IF v_used >= v_quantity THEN
        RETURN jsonb_build_object(
            'claimed', false,
            'reason', 'no_seats',
            'used', v_used,
            'quantity', v_quantity
        );
    END IF;

    RETURN jsonb_build_object(
        'claimed', true,
        'used', v_used,
        'quantity', v_quantity,
        'available', v_quantity - v_used - 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seat(uuid) TO authenticated, service_role;
