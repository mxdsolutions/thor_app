# Tasks — Stripe Integration

**Source:** [PLAN.md](./PLAN.md)
**Date:** 2026-04-25
**Status:** in-progress

---

## Phase 1 — Foundations (Stripe side)

- [x] **T1** — Create 3 products + 6 prices (monthly + annual) in Stripe sandbox — *done via MCP*
- [x] **T2** — Wire all 6 price IDs + test API keys to `.env.local` — *done*
- [ ] **T3** — Configure Stripe Customer Portal (plan changes, cancel-at-period-end, payment method updates, invoice history) — dashboard or API
- [ ] **T4** — Install Stripe CLI locally (`brew install stripe/stripe-cli/stripe`); log in with sandbox account

## Phase 2 — Schema + webhook (CLM-79)

- [x] **T5** — Migration: create `tenant_subscriptions` table with columns per PLAN.md, RLS (read = tenant members, write = service role only), indexes on `stripe_customer_id` + `stripe_subscription_id` — *`supabase/migrations/014_stripe_subscriptions.sql`, applied*
- [x] **T6** — Migration: create `stripe_webhook_events` table (event ID unique, received_at timestamp) for idempotency — *same migration file*
- [x] **T7** — Install `stripe` SDK; add `lib/stripe.ts` with a single initialised client (reads `STRIPE_SECRET_KEY` from env) — *stripe@22.1.0, API pinned to `2026-04-22.dahlia`*
- [x] **T8** — Implement `POST /api/webhooks/stripe/route.ts`: raw-body signature verification, idempotency check, handlers for `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`
- [x] **T9** — Raw body handled via `request.text()`; App Router doesn't pre-parse so no extra config needed (matches Xero webhook pattern)
- [ ] **T10** — Local dev: run `stripe listen --forward-to localhost:8005/api/webhooks/stripe`, capture `whsec_` into `.env.local`, verify events land in `tenant_subscriptions`
- [x] **T11** — Smoke tests at `app/api/webhooks/stripe/route.test.ts` covering signature rejection + idempotency short-circuit + unhandled-event no-op. Deeper handler coverage deferred to Phase 8 (E2E via `stripe listen`)

## Phase 3 — Checkout (CLM-77)

- [x] **T12** — Implement `POST /api/stripe/checkout`: `withAuth` + `requirePermission("settings.subscription", "write")`, creates Checkout Session with `client_reference_id: tenantId`, 30-day trial (skipped if tenant already used one), current active-member count as initial `quantity` — *`app/api/stripe/checkout/route.ts`. Whitelists `price_id` via `lib/plans.ts`, reuses `stripe_customer_id` from `tenant_subscriptions` when present, blocks re-checkout for active/trialing tenants (sends them to the portal instead), seeds `subscription_data.metadata.tenant_id` so the early `customer.subscription.created` event has the tenant link if it lands before `checkout.session.completed`.*
- [x] **T13** — Client-side "Upgrade" / "Subscribe" buttons call the endpoint and `window.location.assign(url)` to redirect — *landed with the page rewrite (T25/T26)*
- [x] **T14** — Handle `?checkout=success` / `?checkout=cancelled` query params on return to subscription page — show toast, revalidate subscription SWR — *page also strips the param via `router.replace` and re-mutates twice (2s + 6s) to bridge the webhook latency*
- [x] **T15** — Zod schema for checkout request body (`price_id`, optional `billing_cycle`) — *`stripeCheckoutSchema` in `lib/validation.ts`. `billing_cycle` dropped — it's redundant given the `price_id` whitelist already encodes monthly vs annual.*

## Phase 4 — Portal (CLM-78)

- [x] **T16** — Implement `POST /api/stripe/portal`: resolves `stripe_customer_id`, creates Billing Portal session, returns `url` — *`app/api/stripe/portal/route.ts`. `withAuth` + `requirePermission("settings.subscription", "write")`, returns 409 when there's no `stripe_customer_id` yet.*
- [x] **T17** — "Manage Billing" button on subscription page calls endpoint and redirects — *`ManageBillingButton` in the rewritten page; appears in the active-state header and inside the past-due / cancellation banners.*
- [x] **T18** — Handle the edge case of a tenant without a Stripe customer yet (button hidden until subscription exists) — *empty state shows pricing cards (no "Manage Billing"); endpoint also returns 409 as defense-in-depth.*

## Phase 5 — Paid quota + Add Seats (CLM-80, rescoped 2026-04-28)

Replaces the auto-grow design. Tenants explicitly buy N seats; invites consume from the bucket; "Add seats" is a separate, deliberate action.

- [x] **T19** — Helper `getSeatUsage(supabase, tenantId)` in `lib/stripe-seats.ts`: returns `{ used, quantity, available, billing_exempt, has_subscription }`. `used` = active memberships + pending non-expired invites. `quantity` = `tenant_subscriptions.quantity` (only counted when status is `active`/`trialing`) or `Infinity` when `billing_exempt`
- [x] **T20** — Add cap check to `app/actions/inviteUser.ts`: calls `getSeatUsage`; returns `code: "no_subscription"` when there's no active sub, `code: "no_seats_available"` when full, so the modal can route to the right CTA
- [ ] **T21** — Backstop check on invite acceptance (auth callback / onboarding) — if seats are full, mark invite as expired and surface a clear page explaining the situation *(deferred — invite-time block + UI cap covers the common path; race-condition backstop is a follow-up)*
- [x] **T22** — Build `POST /api/stripe/seats` in `app/api/stripe/seats/route.ts`: `withAuth` + `requirePermission("settings.subscription", "write")`, body `{ delta: number }`, validates against current `used` count for negative deltas, calls `stripe.subscriptions.update` with `create_prorations`. Returns 409 for billing-exempt or non-active subs
- [x] **T23** — Extend `GET /api/tenant/subscription` to return `{ usage: { used, quantity, available } }` (Infinity surfaced as `null` so it round-trips through JSON cleanly)
- [x] **T24a** — Build `components/modals/AddSeatsModal.tsx`: number stepper, live cost preview (per-seat × delta × cycle), Confirm calls `/api/stripe/seats`, calls `mutate()` on success
- [x] **T24b** — Update subscription page active-state card: `SeatUsageStat` shows "N of M used · K available"; "Add seats" button beside Manage Billing opens the modal
- [x] **T24c** — Update `UserInviteModal`: shows "X seats available" hint; when 0 or no subscription, disables Send and renders an inline link to the subscription page

## Phase 6 — SWR + settings UI (CLM-81)

- [x] **T24** — Add `useTenantSubscription()` SWR hook to `lib/swr.ts` — *fetches `/api/tenant/subscription`, which returns `{ subscription, plans, eligible_for_trial }` so the page only needs one round-trip.*
- [x] **T25** — Replace stub at `app/dashboard/settings/company/subscription/page.tsx` with real UI: current plan, billing cycle toggle, seat count, status badge, renewal/cancel date, Change Plan + Manage Billing buttons — *active state renders plan summary card with status badge, per-seat / seats / total breakdown, and renewal-or-cancel date; Manage Billing routes through the portal endpoint.*
- [x] **T26** — Empty state: pricing cards (3 tiers × monthly/annual toggle) with "Start 30-day trial" / "Subscribe" CTAs — *`EmptyState` with monthly/annual toggle (annual labelled "2 months free"); CTA copy switches based on `eligible_for_trial`. Iron & Oak is highlighted as "Most popular".*
- [x] **T27** — Past-due banner when `status = "past_due"` / `unpaid` with direct link to portal — *rose-tinted banner with inline Manage Billing CTA; separate amber banner for `cancel_at_period_end`.*
- [x] **T28** — Gate action buttons via `usePermission("settings.subscription", "write")`; viewer/member see read-only view — *`usePermissionOptional("settings.subscription", "write", false)` hides Subscribe and Manage Billing buttons; pricing cards still render.*

## Phase 7 — Tenant lock enforcement

- [x] **T29** — Middleware check: if tenant's subscription status is `unpaid` or `incomplete_expired`, redirect all non-settings routes to `/dashboard/settings/company/subscription` with a banner — *`middleware.ts`. New `getTenantLockState(supabase, tenantId)` helper reads `tenants.billing_exempt` + `tenant_subscriptions.status` in parallel, cached 60s per tenant in module-scope `lockCache`. The page already shows a "Subscription locked" banner when status is `unpaid`, so no extra query param needed.*
- [x] **T30** — Ensure platform-admin routes + auth callbacks are unaffected by the lock — *the lock only fires when path matches `/dashboard/*` AND not `/dashboard/settings/*`. Platform-admin (`/platform-admin/*`), onboarding (`/onboarding/*`), auth callback (`/auth/*`), report viewer (`/report/*`), and all `/api/*` routes sit outside that branch and pass through untouched. `billing_exempt = true` tenants bypass the lock entirely.*

## Phase 8 — End-to-end testing (CLM-82)

- [ ] **T31** — Full Checkout path (successful card `4242 4242 4242 4242`) from pricing cards → sub created → row in `tenant_subscriptions` → UI reflects plan
- [ ] **T32** — Trial path — start trial, simulate day-31, verify first invoice + payment attempt
- [ ] **T33** — Seat increase — accept invite, verify Stripe sub quantity ticks up + proration invoice generated
- [ ] **T34** — Seat decrease — remove user, verify quantity ticks down
- [ ] **T35** — Plan change — upgrade Iron Ore → Forged via Portal, verify proration + webhook updates DB
- [ ] **T36** — Cancellation — cancel at period end, verify UI reflects it, verify access continues until period end
- [ ] **T37** — Failed payment — use `4000 0000 0000 0341` (charge_disputed) or trigger failure in Stripe, verify status → `past_due`, banner shown
- [ ] **T38** — Long past-due — simulate 30 days past-due, verify tenant locked out
- [ ] **T39** — Permission gating — non-owner attempts checkout / portal / upgrade, verify 403
- [ ] **T40** — Webhook idempotency — replay an event, verify no duplicate row

## Phase 9 — Production cutover (out-of-scope for v1 draft — tracked for visibility)

- [ ] **T41** — Decide tenant grandfathering approach (per PLAN.md Open Questions)
- [ ] **T42** — Create live-mode products + prices; wire live env vars to production
- [ ] **T43** — Create production webhook endpoint pointed at `https://admin.mxdsolutions.com.au/api/webhooks/stripe`; capture live `whsec_`
- [ ] **T44** — GST / tax decision (Stripe Tax vs manual)
- [ ] **T45** — Sign-off from owner + legal review if applicable; flip platform to live keys

## Phase 10 — Cleanup (legacy billing columns)

- [x] **T46** — Remove all reads of `tenants.plan` / `tenants.max_users` / `tenants.trial_ends_at` from app code (10 files: subscription page stub, lib/tenant.ts, lib/validation.ts, lib/tenant-context.tsx, both layouts, tenantSignup, platform-admin tenants/stats routes, CreateTenantModal, TenantSideSheet, platform tenants + dashboard pages)
- [x] **T47** — Apply migration `015_drop_legacy_billing_columns.sql` to drop the three columns. `tenants.status` kept (lifecycle, not billing).
