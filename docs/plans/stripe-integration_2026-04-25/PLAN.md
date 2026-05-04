# Stripe Integration

**Date:** 2026-04-25
**Author:** Dylan
**Status:** in-progress

**Linear:** [CLM-75](https://linear.app/calibre-media/issue/CLM-75/stripe-integration-subscriptions-checkout-portal-seat-enforcement) (parent) + sub-issues CLM-76 → CLM-82.

---

## Goal

Replace the stubbed subscription page at `app/dashboard/settings/company/subscription/page.tsx` with a working Stripe integration so tenants can self-serve plan changes, billing, and seat purchases — unblocking the conversion path that the auth-hardening work in [CLM-68](https://linear.app/calibre-media/issue/CLM-68) relies on.

## Why now

- Today, a tenant can't actually pay — all subscription actions are TODO placeholders.
- Seat count (`tenants.max_users`) exists but is detached from any billing event, so it drifts and can't gate anything reliably.
- Auth friction on shared accounts is only a conversion lever if upgrading is frictionless.

## Billing model

**Per-seat with paid quota** (revised 2026-04-28; was previously "per-seat, no caps"). Each tenant picks a tier and explicitly buys N seats. Invites consume from that bucket; new invites are blocked when the bucket is full and the owner is prompted to "Add seats". Seats are not auto-added on invite — the spend stays predictable and the tenant always sees a "X of Y used" line.

Why the change: auto-grow surprises customers with a larger invoice after every invite. Paid quota mirrors Slack / Linear / Notion and gives a clean upsell moment ("Add 1 seat for $X/month") at the time a teammate is being invited.

### Plans (AUD, sandbox account `acct_1TPs9PKVFWTEIhkT`)

| Plan | Monthly (per seat) | Annual (per seat, 10× monthly = 2 months free) | Product ID | Price ID (monthly) | Price ID (annual) |
|---|---|---|---|---|---|
| **Iron Ore** | $49 | $490 | `prod_UOgSKjCHb0hqRp` | `price_1TPt5gKVFWTEIhkTQsrczVzp` | `price_1TPtHvKVFWTEIhkTOY9xU8KE` |
| **Iron & Oak** | $99 | $990 | `prod_UOgTKB53rL4Dj2` | `price_1TPt6gKVFWTEIhkT6569NRmY` | `price_1TPtHyKVFWTEIhkTQ4LewZwd` |
| **Forged** | $129 | $1,290 | `prod_UOgUwvz7bZJeSh` | `price_1TPt7FKVFWTEIhkT3s21zGjT` | `price_1TPtI1KVFWTEIhkTT1DAg4r2` |

All prices are `recurring`, `billing_scheme=per_unit`, `usage_type=licensed` — correct for per-seat `quantity` billing. All IDs are already wired to `.env.local` as `STRIPE_PRICE_{TIER}_{MONTHLY|ANNUAL}`.

### Billing policies

- **Trial:** 30 days, applied via `subscription_data.trial_period_days` on the Checkout Session (not baked into price). No card required to start trial; payment method collected at the end of trial.
- **Proration:** immediate on seat count changes and on tier changes — Stripe's default (`proration_behavior: "create_prorations"`). Mid-cycle upgrades generate a one-time proration invoice.
- **Past-due policy:** 30 days. Stripe's smart retries handle attempts; after 30 days past-due the subscription goes to `unpaid` and the tenant is locked (read-only access to the app + past-due banner directing to the portal).
- **Cancellation:** `cancel_at_period_end=true` by default (access continues until the paid period ends).

## Architecture

### `tenant_subscriptions` table (new)

Source of truth in-app for subscription state. Stripe is authoritative; our DB is a projection populated by the webhook handler.

```sql
create table tenant_subscriptions (
  tenant_id              uuid primary key references tenants(id) on delete cascade,
  stripe_customer_id     text not null unique,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  status                 text not null,       -- trialing | active | past_due | unpaid | canceled | incomplete
  quantity               integer not null default 1,
  trial_end              timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- RLS: read open to tenant members (tenant_id = get_user_tenant_id()); writes service-role only (webhook handler).
```

- `tenants` currently has `plan`, `max_users`, `trial_ends_at`, `status` columns from an earlier billing scheme. These are **deprecated but not dropped** — the webhook never writes to them. New callers (middleware lock check, seat sync, UI) read from `tenant_subscriptions` only. A follow-up cleanup migration drops the dead columns once all readers are moved over.
- Index on `stripe_customer_id` and `stripe_subscription_id` for webhook lookups.

### Checkout flow (CLM-77)

`POST /api/stripe/checkout` → `withAuth`, `requirePermission("settings.subscription", "write")`. Body: `{ price_id, billing_cycle?: "monthly" | "annual" }`. Creates a Checkout Session:

- `mode: "subscription"`
- `client_reference_id: tenantId` (webhook uses this to resolve the tenant)
- `customer: existing_stripe_customer_id` (if we already have one) OR `customer_email: user.email`
- `line_items: [{ price: price_id, quantity: current_active_member_count }]`
- `subscription_data: { trial_period_days: 30 }` (skipped if tenant has already used a trial)
- `allow_promotion_codes: true`
- `success_url: /dashboard/settings/company/subscription?checkout=success`
- `cancel_url: /dashboard/settings/company/subscription?checkout=cancelled`

Client opens the returned `url` via `window.location.assign`.

### Customer Portal (CLM-78)

`POST /api/stripe/portal` → `withAuth`, `requirePermission("settings.subscription", "write")`. Looks up `stripe_customer_id` for the tenant, creates a Billing Portal session with `return_url` back to the subscription page. Portal is configured in Stripe dashboard to allow: plan changes, cancel-at-period-end, update payment method, invoice history.

### Webhook handler (CLM-79)

`POST /api/webhooks/stripe/route.ts`. Requirements:

- **Raw body** via `request.text()` — signature verification needs the unmodified bytes. Must opt out of Next's body parsing.
- Verify with `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`. Return 400 on any verification error.
- **Idempotent on `event.id`** — store processed event IDs in a small `stripe_webhook_events` table (or rely on a unique index) and no-op on duplicates.
- Uses a service-role Supabase client (`createAdminClient`) — webhook has no user session.
- Events to handle:
  - `checkout.session.completed` → create/update `tenant_subscriptions` (resolve `tenant_id` from `client_reference_id`).
  - `customer.subscription.created | updated | deleted` → upsert status, quantity, price, period end, cancel flag.
  - `invoice.payment_succeeded` → (for now, just log; useful later for receipt emails).
  - `invoice.payment_failed` → flip status to `past_due`; UI shows banner.
- On any mutation, `updated_at = now()`.

### Seat enforcement + Add Seats (CLM-80 — rescoped 2026-04-28)

Replaces the auto-grow design above. Two pieces:

**1. Seat-cap enforcement on invite (`app/actions/inviteUser.ts`)**

Before sending an invite, compute current seat usage and block when at cap:

```
used      = count(active tenant_memberships) + count(unaccepted, non-expired tenant_invites)
quantity  = tenant_subscriptions.quantity  (or Infinity if billing_exempt)
available = max(0, quantity - used)
```

If `available <= 0`, return a structured error the modal renders as: *"You're using all N seats. Add more from Settings → Subscription before inviting."* The same check runs on invite acceptance as a backstop — if a race emptied the bucket between send and accept, the second acceptance is rejected with a clear message.

Tenants with no `tenant_subscriptions` row (fresh signup, before checkout) get `quantity = 0` — they must subscribe before they can invite. The signup flow itself doesn't go through invite (it creates the founder's membership directly), so this doesn't block onboarding.

**2. Add Seats endpoint (`POST /api/stripe/seats`)**

Body: `{ delta: number }` — positive to add, negative to remove. Permissioned by `requirePermission("settings.subscription", "write")`. Logic:

- Resolve `tenant_subscriptions` row → `stripe_subscription_id`, `stripe_item_id`, current `quantity`.
- Reject if no active subscription (status not `active` or `trialing`) — empty-state pricing cards apply, not seat top-up.
- Reject negative delta that would take quantity below current `used` count.
- Call `stripe.subscriptions.update(subId, { items: [{ id: itemId, quantity: newQty }], proration_behavior: "create_prorations" })`.
- Return `{ quantity: newQty }`. The webhook is what actually writes `tenant_subscriptions.quantity` — the response is just for optimistic UI.

Add Seats UI: a modal launched from the subscription page with a number stepper, a live "≈ $X / month added (prorated to renewal)" line, and Confirm. We don't render an invoice preview API call inline — Stripe's prorated charge is calculated server-side at update time and surfaces on the next invoice in the portal.

### Subscription settings UI (CLM-81)

Replaces the stub at `app/dashboard/settings/company/subscription/page.tsx`. See CLM-81 for full scope — with these revisions:

- **Seat usage** line is **"N of M seats used · K available"** with a primary "Add seats" button beside it. The active-state summary card breaks down: per-seat price · paid quantity · used (memberships + pending invites) · available · total per cycle. Reverted from the earlier "no cap" wording (2026-04-28).
- Pricing cards on the empty state show monthly / annual toggle so the user can choose billing cycle on Checkout.
- The invite modal (Settings → Users) renders a "X seats available" line below the email field; if 0, the Send button is disabled and a "Add seats" link points to the subscription page.

## Key Decisions

- **Per-seat, not flat tiers with caps.** Matches competitor SaaS norms, scales linearly with customer value, avoids awkward cap conversations. ([Superseded earlier CLM-75 draft which assumed Solo/Team/Business with 1/5/20 seats.]())
- **Annual pricing at 10× monthly** (two months free) — standard SaaS discount, promotes cash-flow-friendly annual commitments.
- **30-day trial via Checkout Session metadata, not via the Price.** Keeps trial policy a platform concern (can change without re-creating prices) and lets us skip trials for tenants who've already used one.
- **Past-due → `unpaid` → locked at 30 days.** Long enough for legitimate failures (card expiry, travel) without unlimited access for churned accounts.
- **Stripe is authoritative, DB is a projection.** All state mutations flow through the webhook. Never write `tenant_subscriptions` from a user-facing handler.
- **Service-role client for webhook writes only.** User-facing routes never bypass RLS; the webhook is the single exception and runs outside tenant context.
- **Sandbox only for v1.** Live-mode cutover happens in a follow-up after end-to-end testing and internal sign-off.

## Open Questions

- **Starter tenant grandfathering:** existing tenants in dev have hand-edited `max_users`. Decision before cutover: do we auto-enrol them into a plan, or gate the app behind a "choose your plan" modal on first login post-launch? Leaning toward the latter — explicit opt-in.
- **Tax / GST:** AUD pricing — do we need to charge GST? Likely yes for AU tenants. Stripe Tax can handle it but is out-of-scope for v1. Need legal/accounting call.
- **Email receipts / dunning emails:** Stripe's built-in emails work out of the box. Do we also want in-app notifications for payment failures? Nice-to-have, not v1.

---

## Prerequisite status (CLM-76)

| Item | Status |
|---|---|
| Stripe account (sandbox) | ✅ `M.J Statham & D Wilkinson sandbox` |
| Products created (Iron Ore, Iron & Oak, Forged) | ✅ |
| Monthly prices (AUD, per-seat, licensed) | ✅ |
| Annual prices (AUD, 10× monthly) | ✅ |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` in `.env.local` | ✅ (test keys) |
| All 6 price IDs in `.env.local` | ✅ |
| Customer Portal configured | ❌ (manual dashboard step or via API — defer to CLM-78) |
| Webhook endpoint + `STRIPE_WEBHOOK_SECRET` | ❌ (needs webhook handler code first — CLM-79) |
| Live-mode setup | ❌ (out of scope until v1 passes UAT) |
