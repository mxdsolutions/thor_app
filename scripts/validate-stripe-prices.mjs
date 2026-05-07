#!/usr/bin/env node
/**
 * Validate Stripe price-ID env vars against the connected Stripe account.
 *
 * Reads STRIPE_PRICE_{IRON_ORE,IRON_OAK,FORGED}_{MONTHLY,ANNUAL} and confirms
 * each is retrievable via the Stripe API + active. Fails non-zero on any
 * mismatch — wire into pre-deploy / CI to catch sandbox→prod misconfig before
 * a real customer hits checkout.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/validate-stripe-prices.mjs
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const ENV_KEYS = [
    "STRIPE_PRICE_IRON_ORE_MONTHLY",
    "STRIPE_PRICE_IRON_ORE_ANNUAL",
    "STRIPE_PRICE_IRON_OAK_MONTHLY",
    "STRIPE_PRICE_IRON_OAK_ANNUAL",
    "STRIPE_PRICE_FORGED_MONTHLY",
    "STRIPE_PRICE_FORGED_ANNUAL",
];

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
    console.error("STRIPE_SECRET_KEY is not set.");
    process.exit(1);
}

const acct = STRIPE_KEY.startsWith("sk_live_")
    ? "LIVE"
    : STRIPE_KEY.startsWith("sk_test_")
    ? "TEST"
    : "?";
console.log(`Validating prices against Stripe ${acct} mode\n`);

let failures = 0;
for (const key of ENV_KEYS) {
    const priceId = process.env[key];
    if (!priceId) {
        console.error(`✗ ${key} is not set`);
        failures++;
        continue;
    }

    const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: { Authorization: `Bearer ${STRIPE_KEY}` },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`✗ ${key} = ${priceId} — ${body?.error?.message ?? res.status}`);
        failures++;
        continue;
    }

    const price = await res.json();
    if (!price.active) {
        console.error(`✗ ${key} = ${priceId} — price exists but is INACTIVE`);
        failures++;
        continue;
    }

    const amount = price.unit_amount != null ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}` : "—";
    console.log(`✓ ${key} = ${priceId} (${amount}, ${price.recurring?.interval ?? "?"})`);
}

console.log("");
if (failures > 0) {
    console.error(`${failures} price(s) failed validation.`);
    process.exit(1);
}
console.log("All prices valid.");
