# Code Audit — THOR Integrations Layer

**Date**: 2026-05-08
**Project type**: Next.js 15 multi-tenant CRM (Supabase, Stripe, Xero, Microsoft Graph, Resend, Anthropic Claude)
**Audit depth**: Standard, scoped to **third-party integrations only**
**Companion audit**: [docs/audits/code-audit_2026-05-08_complete/AUDIT.md](docs/audits/code-audit_2026-05-08_complete/AUDIT.md) covered the API/frontend/cross-cutting layers; this report does not duplicate those findings.

---

## Executive Summary

Five third-party integrations live in this codebase: **Xero** (accounting), **Stripe** (subscriptions + per-seat billing), **Microsoft Graph** (Outlook email), **Resend** (transactional email), and the **Anthropic Claude assistant** (AI feature). Quality is uneven across them.

**Stripe** and the **AI assistant** are well-built — the kind of code that ages well. Stripe webhook idempotency uses a PK constraint correctly, signature verification is done before any state is touched, the price-ID whitelist is enforced at both the route and library layer, and the Stripe API version is pinned. The AI assistant has tight cost controls (`max_tokens`, max tool turns), every server-side tool filters by `tenant_id`, the model identifier is intentionally hidden from logs and UI per the user's "Haiku, never mention it" rule, and the prompt-injection surface is minimal (user input only reaches the model via tool results, not the system prompt).

**Microsoft Graph** is mostly solid — the OAuth flow is clean, scopes are reasonably tight, and the **token-refresh race condition is genuinely well-handled with optimistic locking** ([microsoft-graph.ts:103-160](lib/microsoft-graph.ts:103)). The two real gaps are the absence of any 429/`Retry-After` handling and the lack of Microsoft-side token revocation on disconnect.

**Xero** is the weakest integration in the codebase. There are five tenant-isolation gaps in the sync paths — `companies` updates, `contacts` updates, `invoices` updates, and an `invoice_line_items` delete all run without `.eq("tenant_id", tenantId)`. The token-refresh function at [lib/xero.ts:107-128](lib/xero.ts:107) is a textbook check-then-act race that will hand out double-refreshes under load and burn the refresh token; ironically, [microsoft-graph.ts:103-160](lib/microsoft-graph.ts:103) shows exactly the right pattern — Xero just doesn't use it. The rate-limit retry loop at [lib/xero.ts:152-171](lib/xero.ts:152) is the one bright spot.

**Resend** is small but has one notable production gap: no webhook handler for bounces / complaints / delivery failures, which means sender reputation degrades silently.

**Severity counts**: 🔴 5 critical · 🟡 12 major · 🟢 6 minor

## Top Priorities

1. 🔴 **Xero sync code has 5 missing `.eq("tenant_id", tenantId)` filters** — [lib/xero-sync-contacts.ts:329-332](lib/xero-sync-contacts.ts:329), [:373-376](lib/xero-sync-contacts.ts:373), [:430-438](lib/xero-sync-contacts.ts:430); [lib/xero-sync-invoices.ts:328-335](lib/xero-sync-invoices.ts:328), [:386-389](lib/xero-sync-invoices.ts:386). Cross-tenant data corruption risk if mapping rows are ever wrong.
2. 🔴 **Xero token refresh has a check-then-act race** — [lib/xero.ts:107-128](lib/xero.ts:107). Two concurrent requests can both call `refreshXeroToken()`; second call burns the refresh token and dies with `invalid_grant`. Mirror the pattern at [microsoft-graph.ts:103-160](lib/microsoft-graph.ts:103) (optimistic lock on `refresh_token` column).
3. 🔴 **Resend has no bounce/complaint webhook** — sender reputation degrades silently. Production email systems must consume these.
4. 🟡 **Stripe seat-quota check is racy** — [app/actions/inviteUser.ts:37-44](app/actions/inviteUser.ts:37). Two concurrent invites can both pass the `available > 0` check and exceed the paid quota. Stripe will prorate the overage at period end, but the UX is wrong.
5. 🟡 **No Microsoft Graph rate-limit handling** — [lib/microsoft-graph.ts](lib/microsoft-graph.ts) has zero `Retry-After` / 429 logic. Bulk email operations will fail hard under throttling.
6. 🟡 **Xero / Outlook tokens not revoked at the provider on disconnect** — local row delete only. If the DB is ever exfiltrated, refresh tokens stay valid until natural expiry (~60d for Xero refresh tokens).

---

## Per-Integration Findings

### 1. Xero (accounting)

**Files**: [lib/xero.ts](lib/xero.ts), [lib/xero-sync-contacts.ts](lib/xero-sync-contacts.ts), [lib/xero-sync-invoices.ts](lib/xero-sync-invoices.ts), [lib/xero-sync-quotes.ts](lib/xero-sync-quotes.ts), [app/api/integrations/xero/**](app/api/integrations/xero).

#### 🔴 Tenant isolation gaps in sync code (5 sites)

Every one of these is a real defense-in-depth violation. All five run inside the `withAuth` wrapper so `tenantId` is in scope; none of them use it on their `UPDATE` / `DELETE`:

- [lib/xero-sync-contacts.ts:329-332](lib/xero-sync-contacts.ts:329) — `companies.update().eq("id", existing.mxd_id)` — no `tenant_id`.
- [lib/xero-sync-contacts.ts:373-376](lib/xero-sync-contacts.ts:373) — same shape, "match" branch.
- [lib/xero-sync-contacts.ts:430-438](lib/xero-sync-contacts.ts:430) — `contacts.update().eq("id", existingContacts[0].id)` — no `tenant_id`.
- [lib/xero-sync-invoices.ts:328-335](lib/xero-sync-invoices.ts:328) — `invoices.update().eq("id", existing.mxd_id)` — no `tenant_id`.
- [lib/xero-sync-invoices.ts:386-389](lib/xero-sync-invoices.ts:386) — `invoice_line_items.delete().eq("invoice_id", invoiceId)` — no `tenant_id`. Mirror of the Xero webhook delete that was already fixed in the prior audit ([app/api/integrations/xero/webhook/route.ts:213](app/api/integrations/xero/webhook/route.ts:213) — that one is now correct, but this sync path still isn't).

In practice, the upstream `xero_sync_mappings` lookup is itself tenant-scoped, so the `mxd_id` should always belong to the right tenant. But the project's stated rule (CLAUDE.md) is "every SELECT/UPDATE/DELETE includes `.eq("tenant_id", tenantId)` for defense-in-depth" — this whole defense exists precisely to absorb mistakes upstream. Fix them all together; the change is one `.eq()` per call.

#### 🔴 Token refresh race condition

[lib/xero.ts:107-128](lib/xero.ts:107) — classic check-then-act:

```
if (expiresAt.getTime() - now.getTime() > fiveMinutes) return ...;
const tokens = await refreshXeroToken(connection.refresh_token);
await supabase.from("xero_connections").update({ ... }).eq("id", connection.id);
```

Under concurrent load (two requests arrive after the 5-min skew window), both read the expired token, both call `refreshXeroToken`, and only one wins at Xero. The losing request gets `invalid_grant` and the user sees a Xero-disconnected error even though their connection was healthy seconds earlier. The DB write is also unprotected — last-writer-wins.

Fix template already exists in [lib/microsoft-graph.ts:103-160](lib/microsoft-graph.ts:103). It uses optimistic locking: the update predicate includes `.eq("refresh_token", oldRefreshToken)`, so only one writer wins; losers re-read and pick up the winner's tokens. Apply the same shape to Xero.

#### 🟡 Tokens stored plaintext at rest

Both `xero_connections.access_token` and `.refresh_token` are plain text columns. Supabase encrypts at the disk/role level by default, so this is not a wide-open hole, but it does mean any Postgres role with `SELECT` on the table sees usable tokens. For tokens that grant write access to a tenant's accounting system, application-layer encryption (libsodium / AES-GCM with a key derived from `SUPABASE_SERVICE_ROLE_KEY` or a separate KMS) would be the bar. Same applies to Outlook tokens in `email_connections`.

#### 🟡 Tokens not revoked at Xero on disconnect

[app/api/integrations/xero/route.ts](app/api/integrations/xero/route.ts) DELETE handler nukes the local row but never calls Xero's `POST /identity/revoke`. The refresh token remains live at Xero until natural expiry (~60 days). Combined with the plaintext storage above, that's a window where a leaked DB snapshot still has a working credential.

#### 🟡 No PKCE on the OAuth flow

[lib/xero.ts:11-21](lib/xero.ts:11) `buildXeroAuthUrl` doesn't include `code_challenge`. The state cookie + httpOnly + sameSite=lax provide CSRF protection ([authorize/route.ts:29-37](app/api/integrations/xero/authorize/route.ts:29)) which covers the most common attack, but PKCE is the modern OAuth 2.1 baseline and Xero supports it. Low urgency, easy add.

#### 🟡 AUD currency hardcoded for quote push

[lib/xero-sync-quotes.ts:76](lib/xero-sync-quotes.ts:76) — `CurrencyCode: "AUD"` hardcoded. The invoice path correctly defaults from the source data ([lib/xero-sync-invoices.ts](lib/xero-sync-invoices.ts)), so the inconsistency will silently mis-tag any quote pushed from a non-AUD tenant. Today the product is AU-only so this is latent, but it'll bite the moment the first NZ or US tenant signs up.

#### 🟡 Webhook idempotency relies on natural constraints

[app/api/integrations/xero/webhook/route.ts](app/api/integrations/xero/webhook/route.ts) processes invoice webhooks by deleting all line items and reinserting them. Same Xero retry → same end state, so it's *effectively* idempotent for that case. But there is no `xero_webhook_events` table to dedupe replays of older events, unlike Stripe. Low risk because the Xero handler is small, but a `Stripe`-style event-id PK would be cheap defense.

#### 🟢 Strengths
- Webhook signature verification correct ([webhook/route.ts:11-21](app/api/integrations/xero/webhook/route.ts:11)) — HMAC-SHA256, 401 on mismatch, fails closed if `XERO_WEBHOOK_KEY` missing.
- Rate-limit retry loop with `Retry-After` honoured ([lib/xero.ts:152-171](lib/xero.ts:152)) — max 3 retries.
- OAuth state CSRF protection clean ([authorize/route.ts:29-37](app/api/integrations/xero/authorize/route.ts:29)).
- No tokens in any logs.
- Secrets read from env with non-null assertions; no fallbacks.

---

### 2. Stripe (subscriptions + per-seat billing)

**Files**: [lib/stripe.ts](lib/stripe.ts), [lib/stripe-seats.ts](lib/stripe-seats.ts), [lib/plans.ts](lib/plans.ts), [app/api/stripe/{checkout,portal,seats}/route.ts](app/api/stripe), [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts), [middleware.ts](middleware.ts) (`getTenantLockState`).

#### 🟡 Seat-quota race in inviteUser

[app/actions/inviteUser.ts:33-44](app/actions/inviteUser.ts:33) — read `getSeatUsage()`, then check `usage.available <= 0`, then issue invite. Two concurrent invites at quota - 1 both pass and both go through. End state: one over the paid quota.

In practice Stripe will prorate the overage at the period boundary, so it's not free riding — but it is a billing surprise the owner didn't approve. A single Postgres advisory lock keyed on `tenant_id` around the invite path closes it cleanly.

#### 🟡 Webhook trusts `client_reference_id` without re-validation

[app/api/webhooks/stripe/route.ts:121-124](app/api/webhooks/stripe/route.ts:121) — `tenantId = session.client_reference_id`. The checkout route does gate on `requirePermission`, so the only way to forge a session with a bogus `client_reference_id` is to compromise the checkout route itself. But defense-in-depth would `SELECT 1 FROM tenants WHERE id = $1` before upserting the subscription row.

#### 🟡 Lock-state cache 60s window in middleware

[middleware.ts:35-63](middleware.ts:35) — when a webhook flips a tenant to `unpaid`, the in-memory lock cache can hold `locked: false` for up to 60s on every middleware-running worker. So there's a worst-case 60s read-window where a tenant who just had payment fail can still browse their data. Reverse case: just-paid tenants stay locked for up to 60s.

The 60s SLA is acceptable for a CRM and the cache is a real performance win, but the middleware should at least call out the tradeoff in a comment, and ideally the webhook should `mutate` / clear the cache key on status change. Currently the cache is module-scoped, so cross-process invalidation needs Redis or a Postgres LISTEN — out of scope to "fix" but worth documenting.

#### 🟡 Dangling Stripe customer on first-checkout race

[app/api/stripe/checkout/route.ts:54-116](app/api/stripe/checkout/route.ts:54) — two concurrent first-checkouts from the same tenant both miss the `tenant_subscriptions` row and create two Stripe customers. The webhook upsert dedupes on `tenant_id` PK, so only one gets linked, but the orphan customer accumulates. Cosmetic, not financial.

#### 🟡 Cancellation doesn't revoke access mid-cycle

[app/api/webhooks/stripe/route.ts:168-181](app/api/webhooks/stripe/route.ts:168) — `customer.subscription.deleted` flips status to `canceled` and that's it. [middleware.ts](middleware.ts) only locks on `unpaid` / `incomplete_expired`, so canceled tenants retain access until period end. Whether that's correct depends on your business decision — it's a *design* choice masquerading as a default, and the doc should call it out.

Note that `getSeatUsage` does treat `canceled` as "no active subscription" ([lib/stripe-seats.ts:71](lib/stripe-seats.ts:71)), so new invites are blocked, but existing members keep working. That hybrid behaviour is reasonable for a soft-cancel UX; pin the decision in CLAUDE.md so it's intentional.

#### 🟡 Missing webhook events: `trial_will_end`, `payment_action_required`

[app/api/webhooks/stripe/route.ts:11-18](app/api/webhooks/stripe/route.ts:11) `HANDLED_EVENTS` doesn't include:
- `customer.subscription.trial_will_end` — no in-app warning before trial → paid transition.
- `invoice.payment_action_required` — 3DS / SCA challenges not surfaced to the tenant.

Both have Stripe-side email fallbacks, so missing them is a UX dent rather than a billing bug.

#### 🟡 Sandbox / production price-ID switch is manual

[lib/plans.ts:13-17](lib/plans.ts:13) — six `STRIPE_PRICE_*` env vars. Promoting to prod means swapping the Stripe account and updating all six. There is no startup-time validation that the configured price IDs actually exist in the connected Stripe account; the first checkout against a missing price will surface as a Stripe 400. A bootup probe (one Stripe API call per price ID) would catch this on deploy rather than at first-customer.

#### 🟡 Webhook handler tests cover only error boundaries

[app/api/webhooks/stripe/route.test.ts](app/api/webhooks/stripe/route.test.ts) covers: missing signature, signature failure, duplicate event, unknown event type. None of the dispatch handlers (`handleCheckoutCompleted`, `handleSubscriptionUpsert`, `handleSubscriptionDeleted`, `handleInvoicePaymentFailed`) are tested. Each has DB writes and tenant-resolution logic that's worth one happy-path test.

#### 🟡 Error logs lack tenant / customer context

Multiple `console.error` calls across the Stripe code log just the error object. Adding `{ tenantId, customerId, eventId }` to the structured fields would make production debugging tractable.

#### 🟢 Strengths
- Webhook signature verification done before any state read or DB write ([route.ts:38](app/api/webhooks/stripe/route.ts:38)).
- Webhook idempotency via PK on `stripe_webhook_events.event_id` — duplicate event → 23505 → 200 OK back to Stripe ([route.ts:49-59](app/api/webhooks/stripe/route.ts:49)). Textbook.
- Price-ID whitelist enforced at both `lib/plans.ts` and the checkout route ([plans.ts:63-67](lib/plans.ts:63), [checkout/route.ts:25](app/api/stripe/checkout/route.ts:25)) — can't checkout for an arbitrary price.
- Stripe API version pinned in client init ([lib/stripe.ts](lib/stripe.ts)).
- `tenant_subscriptions` PK is `tenant_id` — exactly one row per tenant, no ambiguity.
- Customer portal access gated on `settings.subscription:write` permission ([portal/route.ts](app/api/stripe/portal/route.ts)).

---

### 3. Microsoft Graph (Outlook)

**Files**: [lib/microsoft-graph.ts](lib/microsoft-graph.ts), [app/api/integrations/outlook/**](app/api/integrations/outlook), [app/api/email/**](app/api/email).

#### 🔴 No Graph API rate-limit handling

[lib/microsoft-graph.ts](lib/microsoft-graph.ts) `graphFetch` has no 429 / `Retry-After` handling whatsoever. Microsoft Graph throttles at multiple levels (per-app, per-tenant, per-mailbox); under any bulk operation the request just fails up to the user. The Xero implementation ([lib/xero.ts:152-171](lib/xero.ts:152)) is the right shape — copy it.

#### 🟡 `email_connections` queries scoped only by `user_id`, not `tenant_id`

[lib/microsoft-graph.ts:82-88](lib/microsoft-graph.ts:82) — `getValidToken` filters by `user_id` + `provider`, no `tenant_id`. Today users belong to a single tenant via session context, so this is currently safe. As soon as cross-tenant membership is allowed (the permissions-revamp plan hints at this), the query can hand back the wrong tenant's Outlook tokens. Add `tenant_id` to the filter as defense-in-depth.

#### 🟡 No token revocation on disconnect

[app/api/integrations/outlook/route.ts](app/api/integrations/outlook/route.ts) DELETE removes the local row but doesn't call Microsoft's `/oauth2/v2.0/revoke`. Same shape as Xero.

#### 🟡 No tests

The OAuth callback, token refresh (the optimistic lock!), inbox sync, and send paths all have zero test coverage. The optimistic-lock implementation is non-trivial enough to warrant a test that exercises both the winning and losing branches.

#### 🟢 Strengths
- **Token refresh race handled correctly** — [microsoft-graph.ts:103-160](lib/microsoft-graph.ts:103) uses `refresh_token` as an optimistic-lock predicate. If two refreshes race, the loser's update affects 0 rows and it re-reads the winner's token. This is the model Xero should follow.
- OAuth state CSRF clean ([authorize/route.ts:14-22](app/api/integrations/outlook/authorize/route.ts:14)) — UUID, httpOnly, sameSite=lax, 10-min TTL, deleted after use.
- Scopes scoped to `Mail.Read`, `Mail.Send`, `Mail.ReadWrite` only — no Calendar / Contacts overreach.
- Send uses `/me/sendMail` (delegated permission), not app-only — emails really do come from the user's mailbox.
- Custom `OutlookReauthRequired` exception with a status code the client can branch on for "reconnect" UX.
- No tokens in any logs.

---

### 4. Resend (transactional email)

**Files**: [lib/email/resend.ts](lib/email/resend.ts), [lib/email/templates/**](lib/email/templates), invoked from share-tokens, invites, password reset.

#### 🔴 No bounce / complaint webhook

There is no `app/api/webhooks/resend/` route. Resend sends `email.bounced`, `email.complained`, `email.delivery_delayed` events for exactly this reason. Without consuming them, sender reputation (and deliverability) degrades silently — emails get classified as spam, but the app keeps trying to send. This is a baseline production-email requirement.

#### 🟡 No per-recipient throttling on share-tokens

[app/api/reports/[id]/share-tokens/route.ts](app/api/reports/[id]/share-tokens/route.ts) — issuing a share-token sends a Resend email with no rate cap. A logged-in tenant user can spam any external email by repeatedly creating share-tokens. Add a per-`(report_id, recipient_email)` rate gate — e.g. 5 per hour. Resend's own abuse limits eventually catch up, but they're shared across the whole app.

#### 🟢 Strengths
- API key from env, throws on missing ([resend.ts:22-24](lib/email/resend.ts:22)).
- Templates HTML-escape every user-controlled field (recipient name, tenant name, sender name, message, share URL) via a small `escapeHtml` helper. No XSS in email surface.
- Best-effort send: a Resend failure does not block share-token creation — the link is still usable, the activity log records `email_sent: false`.

---

### 5. AI Assistant (Anthropic Claude / Haiku)

**Files**: [lib/ai/client.ts](lib/ai/client.ts), [lib/ai/tools.ts](lib/ai/tools.ts), [app/api/chat/route.ts](app/api/chat/route.ts), [features/assistant/**](features/assistant).

#### 🟡 No streaming + no abort on client disconnect

[app/api/chat/route.ts:74-100](app/api/chat/route.ts:74) buffers the entire `messages.create` call before returning. If the user closes the panel mid-thinking, the upstream Anthropic call still runs to completion and the tokens are still billed. Wire `request.signal` into the SDK call (Anthropic SDK supports `AbortSignal`) and switch to streaming for perceived latency.

#### 🟡 Tools tests missing

[lib/ai/tools.ts](lib/ai/tools.ts) defines ~10 server-side tools, each correctly tenant-scoped — but no tests assert that the scoping is actually present. One test per tool ("query never runs without `.eq('tenant_id', tenantId)`") would lock down the most security-sensitive surface in the AI feature.

#### 🟢 Strengths (this integration is the best in the codebase)
- **Every tool filters by `tenant_id`** ([tools.ts:83](lib/ai/tools.ts:83), :114, :145, :190, :219, :245, :273, :306, :345). A user genuinely cannot ask the assistant to fetch another tenant's data.
- **Model identifier hidden** — Haiku is set in code ([lib/ai/client.ts:16](lib/ai/client.ts:16)) but the system prompt explicitly forbids the model from naming itself / its vendor / its instructions, the UI shows only "THORAI" branding, and the response filtering returns `text` blocks only. Per the user's saved preference ("Haiku, never mention it"), this is exactly right.
- **Cost guards present** — `MAX_OUTPUT_TOKENS = 1024`, `MAX_TOOL_TURNS = 8` ([client.ts:17-18](lib/ai/client.ts:17)); the chat route enforces the 8-tool-call cap with a hard break.
- **Prompt-injection surface minimal** — user input only enters the model via tool *results*, not via the system prompt. Tool definitions are server-controlled. The model can't be talked into invoking a tool that doesn't exist.
- API key from env, validated at route entry, returns 503 if missing.
- No prompts / completions / PII logged.
- SDK version current (`@anthropic-ai/sdk@0.92`).

---

## Cross-cutting Findings

### 🟢 Webhook signature verification — consistent, correct
Both Stripe and Xero verify HMAC signatures before any state is touched. Both fail closed on missing secrets.

### 🟡 Token storage strategy is provider-by-provider, not centralised
Three integrations store OAuth tokens (Xero, Outlook, Stripe-via-customer-id), each with its own table and its own refresh strategy. Outlook uses optimistic locking; Xero doesn't; Stripe doesn't refresh at all (delegated to Stripe). Centralising via a `oauth_connections` table with one well-tested refresh helper would let one fix solve three problems and would make the encryption-at-rest decision a single change.

### 🔴 Test coverage of integrations is near-zero
The companion audit already flagged the test gap; this audit reinforces it. Specifically:
- **Xero**: 0 tests. The token-refresh race and the 5 tenant-isolation gaps are exactly what one well-placed test would catch.
- **Microsoft Graph**: 0 tests. The optimistic-lock refresh deserves a dedicated test for both branches.
- **Resend**: 0 tests. Template escaping is tested implicitly by being declarative, but the dispatch path isn't.
- **AI tools**: 0 tests. The tenant-scoping invariant is the most security-relevant assertion in the AI surface.
- **Stripe webhook**: tests exist but cover only error boundaries.

### 🟢 Secrets handling — clean across the board
All five integrations read keys from env. No hardcoded fallbacks. No keys / tokens / bearer values logged anywhere I sampled.

### 🟢 No PII / token leakage in logs
Sampled `console.error` calls in [lib/microsoft-graph.ts:150-154](lib/microsoft-graph.ts:150), [app/api/chat/route.ts:142](app/api/chat/route.ts:142), Stripe webhook error path, Xero webhook handlers. None log token values, prompts, or full payloads.

---

## Recommended Next Steps

### Quick wins (each ≤30 min)

1. Add `.eq("tenant_id", tenantId)` to the 5 sites in `xero-sync-{contacts,invoices}.ts`. 🔴
2. Read `currency` from quote data in [xero-sync-quotes.ts:76](lib/xero-sync-quotes.ts:76) instead of hardcoding `"AUD"`. 🟡
3. Add `customer.subscription.trial_will_end` and `invoice.payment_action_required` to `HANDLED_EVENTS` in the Stripe webhook (even if just logged). 🟡
4. Add `tenant_id` filter to the Outlook `email_connections` query at [microsoft-graph.ts:82-88](lib/microsoft-graph.ts:82). 🟡
5. Pin the cancellation behaviour in CLAUDE.md ("canceled subscription = read until period end, no new invites"). 🟢

### Single-PR cleanups (≤2 hours)

6. **Port the optimistic-lock pattern from MS Graph to Xero** — [lib/xero.ts:107-128](lib/xero.ts:107). The diff is ~10 lines plus a column predicate. 🔴
7. **Add `Retry-After` / 429 retry loop to `graphFetch`** — clone the shape from [lib/xero.ts:152-171](lib/xero.ts:152). 🔴
8. **Add Resend webhook handler** — `app/api/webhooks/resend/route.ts` for `email.bounced`, `email.complained`, `email.delivery_delayed`. Mark the recipient in a `email_suppressions` table. 🔴
9. **Per-recipient share-token rate gate** — DB-side `(report_id, recipient_email, hour_bucket)` count cap. 🟡
10. **Stripe seat-quota advisory lock** — wrap [inviteUser.ts:33-65](app/actions/inviteUser.ts:33) in `pg_advisory_xact_lock(hash(tenant_id))`. 🟡
11. **Provider-side token revocation on disconnect** — call Xero `/identity/revoke` and MS Graph `/oauth2/v2.0/revoke` in the respective DELETE handlers. 🟡

### Larger refactors

12. **Centralise OAuth connection storage** — `oauth_connections (tenant_id, user_id, provider, access_token_enc, refresh_token_enc, expires_at)` with one refresh helper that does optimistic locking. Encryption-at-rest becomes a single column. 🟡
13. **Integration test baseline** — one happy-path test per dispatch handler in Stripe webhook; Xero refresh race + tenant-scoping; MS Graph refresh both-branch test; AI tool tenant-scoping (parameterised over each tool); Resend dispatch error path. 🔴
14. **Add a Stripe price-ID validation script** — call `stripe.prices.retrieve()` at boot for each `STRIPE_PRICE_*`; fail fast if missing. 🟡

### Out of scope (called out for visibility)

- **Application-layer token encryption** — both Xero and Outlook tokens live plaintext in Postgres. Adopting a libsodium-style envelope (key in env, ciphertext in DB) would close the largest residual risk in the integration surface, but it's its own design exercise.
- **Cross-process middleware lock-state cache** — current implementation is per-worker. Acceptable for now; only matters at scale.
- **AI streaming** — non-trivial UX change (panel needs to render mid-completion); flag for product, not just engineering.
